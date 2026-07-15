import crypto from "node:crypto";

import {
  ArrivalResponseStatus,
  LocationStatus,
  NotificationType,
  OperationalEventType,
  VerificationChannel,
  VerificationPurpose,
  VerificationStatus,
  VisitSource,
  VisitStatus
} from "@prisma/client";

import { ApiError } from "./core/api-error";
import { appConfig } from "./core/config";
import { prisma } from "./prisma";
import { activeQueueStatuses, processQueueLifecycle, recalculateLocationQueueEstimates } from "./queue-lifecycle";
import { emitQueueStatusUpdated, emitShopQueueUpdated } from "./realtime";
import { createCustomerReview, hasCustomerReviewForVisit } from "./reviews";
import { sendOtpSms } from "./sms";

type QueueJoinStartInput = {
  shopSlug: string;
  firstName: string;
  mobileNumber: string;
};

type QueueFeedbackInput = {
  rating?: number;
  comment?: string;
};

type QueueLeaveInput = {
  reason?: string;
};

function normalizeString(value: string) {
  return value.trim();
}

function hashCode(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createTrackingToken() {
  return crypto.randomBytes(16).toString("hex");
}

function requireNonEmpty(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function calculateEstimatedWaitMin(queueCount: number, durationMin: number, stationsCount: number) {
  return Math.max(0, Math.ceil((queueCount * durationMin) / Math.max(stationsCount, 1)));
}

async function emitLocationQueueRefresh(
  location: {
    id: string;
    slug: string;
  },
  extraTrackingTokens: string[] = []
) {
  const activeEntries = await prisma.queueEntry.findMany({
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
    select: {
      trackingToken: true
    }
  });
  const tokens = new Set([...extraTrackingTokens, ...activeEntries.map((entry) => entry.trackingToken)]);

  emitShopQueueUpdated(location.slug);
  tokens.forEach((trackingToken) => {
    emitQueueStatusUpdated(trackingToken);
  });
}

export function validateQueueJoinStartInput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, error: "Invalid payload." };
  }

  const input = payload as Record<string, unknown>;

  if (!requireNonEmpty(input.shopSlug)) {
    return { ok: false as const, error: "Missing shop slug." };
  }

  if (!requireNonEmpty(input.firstName)) {
    return { ok: false as const, error: "Name is required." };
  }

  if (!requireNonEmpty(input.mobileNumber)) {
    return { ok: false as const, error: "Mobile number is required." };
  }

  const normalized: QueueJoinStartInput = {
    shopSlug: normalizeString(String(input.shopSlug)),
    firstName: normalizeString(String(input.firstName)),
    mobileNumber: normalizeString(String(input.mobileNumber))
  };

  return { ok: true as const, data: normalized };
}

export function validateQueueJoinVerifyInput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, error: "Invalid payload." };
  }

  const input = payload as Record<string, unknown>;

  if (!requireNonEmpty(input.challengeId)) {
    return { ok: false as const, error: "Missing challenge id." };
  }

  if (!requireNonEmpty(input.code)) {
    return { ok: false as const, error: "OTP code is required." };
  }

  return {
    ok: true as const,
    data: {
      challengeId: normalizeString(String(input.challengeId)),
      code: normalizeString(String(input.code))
    }
  };
}

export function validateQueueFeedbackInput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, error: "Invalid payload." };
  }

  const input = payload as Record<string, unknown>;
  const rating = typeof input.rating === "number" && Number.isFinite(input.rating)
    ? Math.round(input.rating)
    : undefined;
  const comment = typeof input.comment === "string" && input.comment.trim().length > 0
    ? normalizeString(input.comment).slice(0, 1000)
    : undefined;

  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return { ok: false as const, error: "Rating must be between 1 and 5." };
  }

  if (rating === undefined && !comment) {
    return { ok: false as const, error: "Add a rating or a short comment." };
  }

  return {
    ok: true as const,
    data: {
      rating,
      comment
    }
  };
}

export function validateQueueLeaveInput(payload: unknown) {
  const input = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  return {
    ok: true as const,
    data: {
      reason:
        typeof input.reason === "string" && input.reason.trim().length > 0
          ? normalizeString(input.reason).slice(0, 200)
          : undefined
    }
  };
}

export async function startQueueJoin(input: QueueJoinStartInput) {
  const location = await prisma.businessLocation.findFirst({
    where: {
      slug: input.shopSlug,
      isPublic: true,
      status: LocationStatus.LIVE
    }
  });

  if (!location) {
    throw ApiError.notFound("Shop not found.");
  }

  if (!location.queueEnabled || location.queuePaused) {
    throw ApiError.conflict("Queue is not open for this shop right now.");
  }

  const customer = await prisma.customer.upsert({
    where: {
      phone: input.mobileNumber
    },
    update: {
      firstName: input.firstName
    },
    create: {
      firstName: input.firstName,
      phone: input.mobileNumber
    }
  });

  await prisma.verificationChallenge.updateMany({
    where: {
      customerId: customer.id,
      businessLocationId: location.id,
      purpose: VerificationPurpose.CUSTOMER_QUEUE_JOIN,
      status: VerificationStatus.PENDING
    },
    data: {
      status: VerificationStatus.CANCELLED
    }
  });

  const code = createOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const challenge = await prisma.verificationChallenge.create({
    data: {
      customerId: customer.id,
      businessLocationId: location.id,
      purpose: VerificationPurpose.CUSTOMER_QUEUE_JOIN,
      channel: VerificationChannel.SMS,
      status: VerificationStatus.PENDING,
      target: input.mobileNumber,
      codeHash: hashCode(code),
      expiresAt
    }
  });

  const smsResult = await sendOtpSms(input.mobileNumber, code);

  return {
    challengeId: challenge.id,
    expiresAt: challenge.expiresAt.toISOString(),
    message:
      smsResult.deliveryMode === "twilio"
        ? "Verification code sent by SMS."
        : "Verification code created. SMS is currently using preview mode.",
    deliveryMode: smsResult.deliveryMode,
    deliveryReason: smsResult.reason,
    codePreview:
      appConfig.env !== "production" || appConfig.pilotMode ? code : undefined,
    pilotMode: appConfig.pilotMode
  };
}

async function findActiveQueueEntryForCustomer(customerId: string, businessLocationId: string) {
  return prisma.queueEntry.findFirst({
    where: {
      businessLocationId,
      removedAt: null,
      releasedAt: null,
      missedAt: null,
      visit: {
        customerId,
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
      },
      businessLocation: true
    },
    orderBy: {
      sortIndex: "asc"
    }
  });
}

function serializeQueueStatusFromEntry(entry: {
  trackingToken: string;
  sortIndex: number;
  joinedAt: Date;
  confirmationStatus: ArrivalResponseStatus;
  confirmationRequestedAt: Date | null;
  confirmationRespondedAt: Date | null;
  calledAt: Date | null;
  visit: {
    status: VisitStatus;
    plannedDurationMin: number | null;
    estimatedWaitMin: number | null;
    actualDurationMin: number | null;
    queueJoinedAt: Date | null;
    readyAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    customer: {
      firstName: string;
    };
  };
  businessLocation: {
    id: string;
    slug: string;
    name: string;
    city: string;
    queuePaused: boolean;
    calledGracePeriodMin: number;
  };
}) {
  return {
    trackingToken: entry.trackingToken,
    sortIndex: entry.sortIndex,
    joinedAt: entry.joinedAt.toISOString(),
    confirmationStatus: entry.confirmationStatus,
    confirmationRequestedAt: entry.confirmationRequestedAt?.toISOString() ?? null,
    confirmationRespondedAt: entry.confirmationRespondedAt?.toISOString() ?? null,
    calledAt: entry.calledAt?.toISOString() ?? null,
    visitStatus: entry.visit.status,
    plannedDurationMin: entry.visit.plannedDurationMin,
    estimatedWaitMin: entry.visit.estimatedWaitMin,
    actualDurationMin: entry.visit.actualDurationMin,
    queueJoinedAt: entry.visit.queueJoinedAt?.toISOString() ?? null,
    readyAt: entry.visit.readyAt?.toISOString() ?? null,
    startedAt: entry.visit.startedAt?.toISOString() ?? null,
    completedAt: entry.visit.completedAt?.toISOString() ?? null,
    feedbackSubmitted: false,
    customer: {
      firstName: entry.visit.customer.firstName
    },
    shop: {
      id: entry.businessLocation.id,
      slug: entry.businessLocation.slug,
      name: entry.businessLocation.name,
      city: entry.businessLocation.city,
      queuePaused: entry.businessLocation.queuePaused,
      calledGracePeriodMin: entry.businessLocation.calledGracePeriodMin
    }
  };
}

export async function verifyQueueJoin(challengeId: string, code: string) {
  const challenge = await prisma.verificationChallenge.findUnique({
    where: { id: challengeId },
    include: {
      customer: true,
      businessLocation: true
    }
  });

  if (!challenge || !challenge.customer || !challenge.businessLocation) {
    throw ApiError.notFound("Verification challenge not found.");
  }

  const customer = challenge.customer;
  const businessLocation = challenge.businessLocation;

  if (challenge.status !== VerificationStatus.PENDING) {
    throw ApiError.conflict("Verification challenge is no longer active.");
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    await prisma.verificationChallenge.update({
      where: { id: challenge.id },
      data: {
        status: VerificationStatus.EXPIRED
      }
    });
    throw ApiError.conflict("Verification code has expired.");
  }

  if (challenge.codeHash !== hashCode(code)) {
    throw ApiError.badRequest("Incorrect verification code.");
  }

  const existingEntry = await findActiveQueueEntryForCustomer(customer.id, businessLocation.id);

  if (existingEntry) {
    await prisma.verificationChallenge.update({
      where: { id: challenge.id },
      data: {
        status: VerificationStatus.VERIFIED,
        verifiedAt: new Date()
      }
    });

    return {
      alreadyJoined: true,
      queueStatus: serializeQueueStatusFromEntry(existingEntry)
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const activeQueueCount = await tx.queueEntry.count({
      where: {
        businessLocationId: businessLocation.id,
        removedAt: null,
        releasedAt: null,
        missedAt: null,
        visit: {
          status: {
            in: [...activeQueueStatuses]
          }
        }
      }
    });

    const lastEntry = await tx.queueEntry.findFirst({
      where: {
        businessLocationId: businessLocation.id
      },
      orderBy: {
        sortIndex: "desc"
      }
    });

    const estimatedWaitMin = calculateEstimatedWaitMin(
      activeQueueCount,
      businessLocation.defaultWalkInDurationMin,
      businessLocation.serviceStationsCount
    );

    const visit = await tx.visit.create({
      data: {
        businessLocationId: businessLocation.id,
        customerId: customer.id,
        source: VisitSource.REMOTE_QUEUE,
        status: VisitStatus.QUEUED,
        plannedDurationMin: businessLocation.defaultWalkInDurationMin,
        estimatedWaitMin,
        queueJoinedAt: new Date()
      }
    });

    const queueEntry = await tx.queueEntry.create({
      data: {
        visitId: visit.id,
        businessLocationId: businessLocation.id,
        trackingToken: createTrackingToken(),
        sortIndex: (lastEntry?.sortIndex ?? 0) + 1,
        joinedAt: new Date()
      },
      include: {
        visit: {
          include: {
            customer: true
          }
        },
        businessLocation: true
      }
    });

    await tx.customer.update({
      where: {
        id: customer.id
      },
      data: {
        phoneVerifiedAt: new Date()
      }
    });

    await tx.verificationChallenge.update({
      where: { id: challenge.id },
      data: {
        status: VerificationStatus.VERIFIED,
        verifiedAt: new Date()
      }
    });

    await tx.operationalEvent.create({
      data: {
        businessLocationId: businessLocation.id,
        visitId: visit.id,
        queueEntryId: queueEntry.id,
        type: "QUEUE_JOINED",
        metadata: {
          source: "REMOTE_QUEUE",
          challengeId: challenge.id
        }
      }
    });

    return queueEntry;
  });

  await processQueueLifecycle(businessLocation.id);
  emitShopQueueUpdated(businessLocation.slug);
  emitQueueStatusUpdated(result.trackingToken);

  const queueStatus = await getQueueStatusByTrackingToken(result.trackingToken);

  return {
    alreadyJoined: false,
    queueStatus: queueStatus ?? serializeQueueStatusFromEntry(result)
  };
}

export async function getQueueStatusByTrackingToken(trackingToken: string) {
  const existingEntry = await prisma.queueEntry.findUnique({
    where: {
      trackingToken
    },
    include: {
      visit: {
        include: {
          customer: true
        }
      },
      businessLocation: true
    }
  });

  if (!existingEntry) {
    return null;
  }

  await processQueueLifecycle(existingEntry.businessLocationId);

  const entry = await prisma.queueEntry.findUnique({
    where: {
      trackingToken
    },
    include: {
      visit: {
        include: {
          customer: true
        }
      },
      businessLocation: true
    }
  });

  if (!entry) {
    return null;
  }

  const activeEntries = await prisma.queueEntry.findMany({
    where: {
      businessLocationId: entry.businessLocationId,
      removedAt: null,
      releasedAt: null,
      missedAt: null,
      visit: {
        status: {
          in: [...activeQueueStatuses]
        }
      }
    },
    orderBy: {
      sortIndex: "asc"
    },
    select: {
      id: true,
      sortIndex: true
    }
  });

  const notifications = await prisma.notificationEvent.findMany({
    where: {
      visitId: entry.visitId,
      type: {
        in: [NotificationType.NEAR_TURN, NotificationType.ARRIVAL_CONFIRMATION]
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      type: true,
      createdAt: true
    }
  });

  const latestNearTurn = notifications.find((notification) => notification.type === NotificationType.NEAR_TURN);
  const latestArrivalConfirmation = notifications.find(
    (notification) => notification.type === NotificationType.ARRIVAL_CONFIRMATION
  );

  const position = activeEntries.findIndex((item) => item.id === entry.id);
  const queueCountAhead = position >= 0 ? position : activeEntries.length;
  const serviceAlreadyStarted =
    entry.visit.status === VisitStatus.IN_SERVICE || entry.visit.status === VisitStatus.COMPLETED;
  const customerIsInactive =
    entry.visit.status === VisitStatus.CANCELLED ||
    entry.visit.status === VisitStatus.NO_SHOW ||
    entry.visit.status === VisitStatus.MISSED;
  const estimatedWaitMin = serviceAlreadyStarted
    ? 0
    : customerIsInactive
      ? null
      : calculateEstimatedWaitMin(
          queueCountAhead,
          entry.businessLocation.defaultWalkInDurationMin,
          entry.businessLocation.serviceStationsCount
        );

  return {
    ...serializeQueueStatusFromEntry(entry),
    feedbackSubmitted: await hasCustomerReviewForVisit(entry.visitId),
    position: position >= 0 ? position + 1 : null,
    queueLength: activeEntries.length,
    estimatedWaitMin,
    nearTurnNotifiedAt: latestNearTurn?.createdAt.toISOString() ?? null,
    arrivalConfirmationSentAt: latestArrivalConfirmation?.createdAt.toISOString() ?? null,
    responseWindowEndsAt: entry.confirmationRequestedAt
      ? new Date(
          entry.confirmationRequestedAt.getTime() + entry.businessLocation.calledGracePeriodMin * 60_000
        ).toISOString()
      : null,
    canRespondToArrival:
      entry.visit.status === VisitStatus.CONFIRMATION_PENDING &&
      entry.confirmationStatus === ArrivalResponseStatus.PENDING &&
      !entry.releasedAt &&
      !entry.missedAt
  };
}

export async function submitQueueFeedback(trackingToken: string, input: QueueFeedbackInput) {
  const entry = await prisma.queueEntry.findUnique({
    where: {
      trackingToken
    },
    include: {
      visit: {
        include: {
          customer: true
        }
      },
      businessLocation: true
    }
  });

  if (!entry) {
    throw ApiError.notFound("Queue status not found.");
  }

  if (entry.visit.status !== VisitStatus.COMPLETED) {
    throw ApiError.conflict("Feedback can be submitted after the service is completed.");
  }

  if (await hasCustomerReviewForVisit(entry.visitId)) {
    return {
      feedbackSubmitted: true,
      message: "Thanks, feedback was already received."
    };
  }

  const wasSaved = await createCustomerReview({
    businessLocationId: entry.businessLocationId,
    visitId: entry.visitId,
    customerId: entry.visit.customerId,
    rating: input.rating,
    comment: input.comment
  });

  if (!wasSaved) {
    throw ApiError.conflict("Reviews are not ready yet. Please try again after Q-App setup is complete.");
  }

  emitQueueStatusUpdated(trackingToken);
  emitShopQueueUpdated(entry.businessLocation.slug);

  return {
    feedbackSubmitted: true,
    message: "Thanks for helping this shop improve."
  };
}

export async function leaveQueue(trackingToken: string, input: QueueLeaveInput) {
  const entry = await prisma.queueEntry.findUnique({
    where: {
      trackingToken
    },
    include: {
      visit: true,
      businessLocation: true
    }
  });

  if (!entry) {
    throw ApiError.notFound("Queue status not found.");
  }

  if (entry.releasedAt || entry.removedAt || entry.missedAt) {
    return {
      trackingToken,
      visitStatus: entry.visit.status,
      releasedAt: (entry.releasedAt ?? entry.removedAt ?? entry.missedAt)?.toISOString() ?? null,
      message: "This queue place is already released."
    };
  }

  if (!activeQueueStatuses.includes(entry.visit.status as (typeof activeQueueStatuses)[number])) {
    throw ApiError.conflict("Only active queue places can be left.");
  }

  const now = new Date();
  const confirmationStatus =
    entry.visit.status === VisitStatus.CONFIRMATION_PENDING
      ? ArrivalResponseStatus.DECLINED
      : entry.confirmationStatus;

  await prisma.$transaction(async (tx) => {
    await tx.queueEntry.update({
      where: {
        id: entry.id
      },
      data: {
        confirmationStatus,
        confirmationRespondedAt:
          entry.visit.status === VisitStatus.CONFIRMATION_PENDING ? now : entry.confirmationRespondedAt,
        releasedAt: now,
        removedAt: now
      }
    });

    await tx.visit.update({
      where: {
        id: entry.visitId
      },
      data: {
        status: VisitStatus.CANCELLED,
        cancelledAt: now
      }
    });

    await tx.operationalEvent.create({
      data: {
        businessLocationId: entry.businessLocationId,
        visitId: entry.visitId,
        queueEntryId: entry.id,
        type: OperationalEventType.QUEUE_LEFT,
        metadata: {
          trackingToken,
          reason: input.reason ?? "Customer left queue from status page",
          source: "CUSTOMER_SELF_REMOVAL"
        }
      }
    });

    await recalculateLocationQueueEstimates(tx, entry.businessLocationId);
  });

  await processQueueLifecycle(entry.businessLocationId);
  await emitLocationQueueRefresh(entry.businessLocation, [trackingToken]);

  return {
    trackingToken,
    visitStatus: VisitStatus.CANCELLED,
    releasedAt: now.toISOString(),
    message: "Your queue place has been released."
  };
}
