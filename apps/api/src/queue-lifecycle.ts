import {
  ArrivalResponseStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  OperationalEventType,
  Prisma,
  VisitStatus
} from "@prisma/client";

import { prisma } from "./prisma";
import { emitQueueStatusUpdated, emitShopQueueUpdated } from "./realtime";
import { sendQueueAlertSms } from "./sms";

export const activeQueueStatuses = [
  VisitStatus.QUEUED,
  VisitStatus.CONFIRMATION_PENDING,
  VisitStatus.CALLED,
  VisitStatus.READY
] as const;

function calculateEstimatedWaitMin(queueCountAhead: number, durationMin: number, stationsCount: number) {
  return Math.max(0, Math.ceil((queueCountAhead * durationMin) / Math.max(stationsCount, 1)));
}

function getAppBaseUrl() {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

function buildQueueLink(trackingToken: string) {
  return `${getAppBaseUrl()}/queue/${trackingToken}`;
}

function buildShopLink(slug: string) {
  return `${getAppBaseUrl()}/shops/${slug}`;
}

export async function recalculateLocationQueueEstimates(
  tx: Prisma.TransactionClient,
  businessLocationId: string
) {
  const location = await tx.businessLocation.findUnique({
    where: { id: businessLocationId },
    select: {
      defaultWalkInDurationMin: true,
      serviceStationsCount: true
    }
  });

  if (!location) {
    return;
  }

  const queueEntries = await tx.queueEntry.findMany({
    where: {
      businessLocationId,
      removedAt: null,
      releasedAt: null,
      missedAt: null,
      visit: {
        status: {
          in: [...activeQueueStatuses]
        }
      }
    },
    include: {
      visit: true
    },
    orderBy: {
      sortIndex: "asc"
    }
  });

  await Promise.all(
    queueEntries.map((entry, index) =>
      Promise.all([
        tx.queueEntry.update({
          where: { id: entry.id },
          data: {
            sortIndex: index + 1
          }
        }),
        tx.visit.update({
          where: { id: entry.visitId },
          data: {
            estimatedWaitMin: calculateEstimatedWaitMin(
              index,
              entry.visit.plannedDurationMin ?? location.defaultWalkInDurationMin,
              location.serviceStationsCount
            )
          }
        })
      ])
    )
  );
}

async function markNotificationDelivery(
  notificationId: string,
  result: Awaited<ReturnType<typeof sendQueueAlertSms>>
) {
  await prisma.notificationEvent.update({
    where: {
      id: notificationId
    },
    data: {
      status: result.deliveryMode === "twilio" || result.deliveryMode === "preview"
        ? NotificationStatus.SENT
        : NotificationStatus.FAILED,
      sentAt: new Date(),
      payload: {
        ...(result.sid ? { sid: result.sid } : {}),
        deliveryMode: result.deliveryMode,
        reason: result.reason ?? null
      }
    }
  });
}

export async function processQueueLifecycle(businessLocationId: string) {
  const location = await prisma.businessLocation.findUnique({
    where: { id: businessLocationId },
    select: {
      id: true,
      slug: true,
      name: true,
      defaultWalkInDurationMin: true,
      serviceStationsCount: true,
      nearTurnPositionTrigger: true,
      nearTurnEtaTriggerMin: true,
      calledGracePeriodMin: true
    }
  });

  if (!location) {
    return;
  }

  const now = new Date();
  const confirmationExpiryCutoff = new Date(now.getTime() - location.calledGracePeriodMin * 60_000);
  const changedTokens = new Set<string>();
  let shopChanged = false;
  const notificationsToSend: Array<{
    notificationId: string;
    to: string;
    message: string;
  }> = [];

  await prisma.$transaction(async (tx) => {
    const expiredEntries = await tx.queueEntry.findMany({
      where: {
        businessLocationId: location.id,
        removedAt: null,
        releasedAt: null,
        missedAt: null,
        confirmationRequestedAt: {
          lte: confirmationExpiryCutoff
        },
        visit: {
          status: VisitStatus.CONFIRMATION_PENDING
        }
      },
      include: {
        visit: {
          include: {
            customer: true
          }
        }
      }
    });

    for (const entry of expiredEntries) {
      await tx.queueEntry.update({
        where: {
          id: entry.id
        },
        data: {
          confirmationStatus: ArrivalResponseStatus.EXPIRED,
          confirmationRespondedAt: now,
          missedAt: now,
          releasedAt: now
        }
      });

      await tx.visit.update({
        where: {
          id: entry.visitId
        },
        data: {
          status: VisitStatus.NO_SHOW
        }
      });

      await tx.operationalEvent.create({
        data: {
          businessLocationId: location.id,
          visitId: entry.visitId,
          queueEntryId: entry.id,
          type: OperationalEventType.ARRIVAL_EXPIRED,
          metadata: {
            trackingToken: entry.trackingToken,
            responseWindowMin: location.calledGracePeriodMin
          }
        }
      });

      const missedNotification = await tx.notificationEvent.create({
        data: {
          businessLocationId: location.id,
          visitId: entry.visitId,
          customerId: entry.visit.customerId,
          type: NotificationType.MISSED_TURN,
          channel: NotificationChannel.SMS,
          status: NotificationStatus.QUEUED,
          target: entry.visit.customer.phone ?? "",
          payload: {
            trackingToken: entry.trackingToken,
            shopSlug: location.slug
          }
        }
      });

      if (entry.visit.customer.phone) {
        notificationsToSend.push({
          notificationId: missedNotification.id,
          to: entry.visit.customer.phone,
          message: `We released your place at ${location.name} because we did not hear back. Rejoin here: ${buildShopLink(
            location.slug
          )}`
        });
      }

      changedTokens.add(entry.trackingToken);
      shopChanged = true;
    }

    await recalculateLocationQueueEstimates(tx, location.id);

    const activeEntries = await tx.queueEntry.findMany({
      where: {
        businessLocationId: location.id,
        removedAt: null,
        releasedAt: null,
        missedAt: null,
        visit: {
          status: {
            in: [...activeQueueStatuses]
          }
        }
      },
      include: {
        visit: {
          include: {
            customer: true
          }
        }
      },
      orderBy: {
        sortIndex: "asc"
      }
    });

    if (activeEntries.length === 0) {
      return;
    }

    const trackedVisitIds = activeEntries.map((entry) => entry.visitId);
    const sentNotifications = await tx.notificationEvent.findMany({
      where: {
        businessLocationId: location.id,
        visitId: {
          in: trackedVisitIds
        },
        type: {
          in: [NotificationType.NEAR_TURN, NotificationType.ARRIVAL_CONFIRMATION]
        }
      },
      select: {
        id: true,
        visitId: true,
        type: true
      }
    });

    const nearTurnSentVisitIds = new Set(
      sentNotifications
        .filter((notification) => notification.type === NotificationType.NEAR_TURN && notification.visitId)
        .map((notification) => notification.visitId as string)
    );
    const arrivalConfirmationSentVisitIds = new Set(
      sentNotifications
        .filter((notification) => notification.type === NotificationType.ARRIVAL_CONFIRMATION && notification.visitId)
        .map((notification) => notification.visitId as string)
    );

    for (const [index, entry] of activeEntries.entries()) {
      const eta = calculateEstimatedWaitMin(
        index,
        entry.visit.plannedDurationMin ?? location.defaultWalkInDurationMin,
        location.serviceStationsCount
      );
      const qualifiesForNearTurn =
        entry.visit.status === VisitStatus.QUEUED &&
        !nearTurnSentVisitIds.has(entry.visitId) &&
        (index + 1 <= location.nearTurnPositionTrigger || eta <= location.nearTurnEtaTriggerMin);

      if (!qualifiesForNearTurn) {
        continue;
      }

      const notification = await tx.notificationEvent.create({
        data: {
          businessLocationId: location.id,
          visitId: entry.visitId,
          customerId: entry.visit.customerId,
          type: NotificationType.NEAR_TURN,
          channel: NotificationChannel.SMS,
          status: NotificationStatus.QUEUED,
          target: entry.visit.customer.phone ?? "",
          payload: {
            trackingToken: entry.trackingToken,
            position: index + 1,
            estimatedWaitMin: eta
          }
        }
      });

      if (entry.visit.customer.phone) {
        notificationsToSend.push({
          notificationId: notification.id,
          to: entry.visit.customer.phone,
          message: `You are getting close at ${location.name}. About ${eta} min left. Track your queue here: ${buildQueueLink(
            entry.trackingToken
          )}`
        });
      }
    }

    const hasFrontCustomerInProgress = activeEntries.some(
      (entry) =>
        entry.visit.status === VisitStatus.CONFIRMATION_PENDING ||
        entry.visit.status === VisitStatus.READY ||
        entry.visit.status === VisitStatus.CALLED
    );

    const frontEntry = activeEntries[0];
    const shouldAutoReadyWalkIn =
      !hasFrontCustomerInProgress &&
      frontEntry &&
      frontEntry.visit.status === VisitStatus.QUEUED &&
      frontEntry.visit.source === "WALK_IN";

    if (shouldAutoReadyWalkIn && frontEntry) {
      await tx.visit.update({
        where: {
          id: frontEntry.visitId
        },
        data: {
          status: VisitStatus.READY,
          readyAt: now
        }
      });

      await tx.queueEntry.update({
        where: {
          id: frontEntry.id
        },
        data: {
          confirmationStatus: ArrivalResponseStatus.COMING,
          confirmationRespondedAt: now,
          presentConfirmedAt: now
        }
      });

      await tx.operationalEvent.create({
        data: {
          businessLocationId: location.id,
          visitId: frontEntry.visitId,
          queueEntryId: frontEntry.id,
          type: OperationalEventType.ARRIVAL_CONFIRMED,
          metadata: {
            trackingToken: frontEntry.trackingToken,
            autoConfirmed: true,
            source: "WALK_IN"
          }
        }
      });

      changedTokens.add(frontEntry.trackingToken);
      shopChanged = true;
      return;
    }

    const shouldRequestConfirmation =
      !hasFrontCustomerInProgress &&
      frontEntry &&
      frontEntry.visit.status === VisitStatus.QUEUED &&
      !arrivalConfirmationSentVisitIds.has(frontEntry.visitId);

    if (shouldRequestConfirmation && frontEntry) {
      await tx.visit.update({
        where: {
          id: frontEntry.visitId
        },
        data: {
          status: VisitStatus.CONFIRMATION_PENDING
        }
      });

      await tx.queueEntry.update({
        where: {
          id: frontEntry.id
        },
        data: {
          confirmationStatus: ArrivalResponseStatus.PENDING,
          confirmationRequestedAt: now,
          confirmationRespondedAt: null
        }
      });

      await tx.operationalEvent.create({
        data: {
          businessLocationId: location.id,
          visitId: frontEntry.visitId,
          queueEntryId: frontEntry.id,
          type: OperationalEventType.ARRIVAL_CONFIRMATION_SENT,
          metadata: {
            trackingToken: frontEntry.trackingToken,
            responseWindowMin: location.calledGracePeriodMin
          }
        }
      });

      const notification = await tx.notificationEvent.create({
        data: {
          businessLocationId: location.id,
          visitId: frontEntry.visitId,
          customerId: frontEntry.visit.customerId,
          type: NotificationType.ARRIVAL_CONFIRMATION,
          channel: NotificationChannel.SMS,
          status: NotificationStatus.QUEUED,
          target: frontEntry.visit.customer.phone ?? "",
          payload: {
            trackingToken: frontEntry.trackingToken,
            responseWindowMin: location.calledGracePeriodMin
          }
        }
      });

      if (frontEntry.visit.customer.phone) {
        notificationsToSend.push({
          notificationId: notification.id,
          to: frontEntry.visit.customer.phone,
          message: `It is nearly your turn at ${location.name}. Tell us if you are coming: ${buildQueueLink(
            frontEntry.trackingToken
          )}`
        });
      }

      changedTokens.add(frontEntry.trackingToken);
      shopChanged = true;
    }
  });

  await Promise.all(
    notificationsToSend.map(async (notification) => {
      const result = await sendQueueAlertSms(notification.to, notification.message);
      await markNotificationDelivery(notification.notificationId, result);
    })
  );

  if (shopChanged) {
    emitShopQueueUpdated(location.slug);
    changedTokens.forEach((trackingToken) => {
      emitQueueStatusUpdated(trackingToken);
    });
  }
}
