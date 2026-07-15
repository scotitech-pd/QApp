import {
  ArrivalResponseStatus,
  OperationalEventType,
  ServiceAdjustmentType,
  VisitSource,
  VisitStatus
} from "@prisma/client";

import { ApiError } from "./core/api-error";
import { prisma } from "./prisma";
import { emitQueueStatusUpdated, emitShopQueueUpdated } from "./realtime";
import { loadRecentReviews, loadReviewSummary } from "./reviews";
import {
  activeQueueStatuses,
  processQueueLifecycle,
  recalculateLocationQueueEstimates
} from "./queue-lifecycle";

type ShopProfileInput = {
  name?: string | null;
  publicDescription?: string | null;
  logoImageUrl?: string | null;
  coverImageUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  openingHoursNote?: string | null;
  serviceStationsCount?: number;
  defaultWalkInDurationMin?: number;
};

function serializeQueueEntry(entry: {
  id: string;
  trackingToken: string;
  sortIndex: number;
  joinedAt: Date;
  confirmationStatus: ArrivalResponseStatus;
  confirmationRequestedAt: Date | null;
  confirmationRespondedAt: Date | null;
  calledAt: Date | null;
  missedAt: Date | null;
  releasedAt: Date | null;
  removedAt: Date | null;
  visit: {
    id: string;
    source: VisitSource;
    status: VisitStatus;
    plannedDurationMin: number | null;
    estimatedWaitMin: number | null;
    queueJoinedAt: Date | null;
    customer: {
      id: string;
      firstName: string;
      phone: string | null;
    };
  };
}) {
  return {
    id: entry.id,
    trackingToken: entry.trackingToken,
    sortIndex: entry.sortIndex,
    joinedAt: entry.joinedAt.toISOString(),
    confirmationStatus: entry.confirmationStatus,
    confirmationRequestedAt: entry.confirmationRequestedAt?.toISOString() ?? null,
    confirmationRespondedAt: entry.confirmationRespondedAt?.toISOString() ?? null,
    calledAt: entry.calledAt?.toISOString() ?? null,
    missedAt: entry.missedAt?.toISOString() ?? null,
    releasedAt: entry.releasedAt?.toISOString() ?? null,
    removedAt: entry.removedAt?.toISOString() ?? null,
    visit: {
      id: entry.visit.id,
      source: entry.visit.source,
      status: entry.visit.status,
      plannedDurationMin: entry.visit.plannedDurationMin,
      estimatedWaitMin: entry.visit.estimatedWaitMin,
      queueJoinedAt: entry.visit.queueJoinedAt?.toISOString() ?? null,
      customer: {
        id: entry.visit.customer.id,
        firstName: entry.visit.customer.firstName,
        phone: entry.visit.customer.phone
      }
    }
  };
}

function serializeInServiceVisit(visit: {
  id: string;
  status: VisitStatus;
  startedAt: Date | null;
  plannedDurationMin: number | null;
  customer: {
    firstName: string;
  };
}) {
  return {
    id: visit.id,
    status: visit.status,
    startedAt: visit.startedAt?.toISOString() ?? null,
    plannedDurationMin: visit.plannedDurationMin,
    customer: {
      firstName: visit.customer.firstName
    }
  };
}

function readOpeningHoursNote(openingHours: unknown) {
  if (!openingHours || typeof openingHours !== "object" || Array.isArray(openingHours)) {
    return "";
  }

  const note = (openingHours as Record<string, unknown>).note;
  return typeof note === "string" ? note : "";
}

function serializeShopProfile(location: {
  id: string;
  slug: string;
  name: string;
  publicDescription: string | null;
  logoImageUrl: string | null;
  coverImageUrl: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  latitude: number;
  longitude: number;
  openingHours: unknown;
  queueEnabled: boolean;
  queuePaused: boolean;
  serviceStationsCount: number;
  defaultWalkInDurationMin: number;
}) {
  return {
    id: location.id,
    slug: location.slug,
    name: location.name,
    publicDescription: location.publicDescription,
    logoImageUrl: location.logoImageUrl,
    coverImageUrl: location.coverImageUrl,
    phone: location.phone,
    email: location.email,
    addressLine1: location.addressLine1,
    addressLine2: location.addressLine2,
    city: location.city,
    region: location.region,
    postalCode: location.postalCode,
    countryCode: location.countryCode,
    latitude: location.latitude,
    longitude: location.longitude,
    openingHoursNote: readOpeningHoursNote(location.openingHours),
    queueEnabled: location.queueEnabled,
    queuePaused: location.queuePaused,
    serviceStationsCount: location.serviceStationsCount,
    defaultWalkInDurationMin: location.defaultWalkInDurationMin
  };
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null;
}

async function findLocationBySlug(slug: string) {
  return prisma.businessLocation.findFirst({
    where: {
      slug
    }
  });
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

export async function getQueueDashboard(slug: string) {
  const location = await findLocationBySlug(slug);

  if (!location) {
    throw ApiError.notFound("Shop not found.");
  }

  await processQueueLifecycle(location.id);

  const [queueEntries, inServiceVisits, missedQueueEntries, reviewSummary, recentReviews] = await Promise.all([
    prisma.queueEntry.findMany({
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
    }),
    prisma.visit.findMany({
      where: {
        businessLocationId: location.id,
        status: VisitStatus.IN_SERVICE
      },
      include: {
        customer: true
      },
      orderBy: {
        startedAt: "asc"
      }
    }),
    prisma.queueEntry.findMany({
      where: {
        businessLocationId: location.id,
        visit: {
          status: {
            in: [VisitStatus.NO_SHOW, VisitStatus.MISSED]
          }
        },
        OR: [
          {
            missedAt: {
              not: null
            }
          },
          {
            releasedAt: {
              not: null
            }
          }
        ]
      },
      include: {
        visit: {
          include: {
            customer: true
          }
        }
      },
      orderBy: [
        {
          missedAt: "desc"
        },
        {
          releasedAt: "desc"
        },
        {
          updatedAt: "desc"
        }
      ],
      take: 6
    }),
    loadReviewSummary(location.id),
    loadRecentReviews(location.id)
  ]);

  return {
    shop: {
      id: location.id,
      slug: location.slug,
      name: location.name,
      queuePaused: location.queuePaused,
      queuePauseReason: location.queuePauseReason,
      queueEnabled: location.queueEnabled,
      defaultWalkInDurationMin: location.defaultWalkInDurationMin,
      serviceStationsCount: location.serviceStationsCount,
      nearTurnPositionTrigger: location.nearTurnPositionTrigger,
      nearTurnEtaTriggerMin: location.nearTurnEtaTriggerMin,
      calledGracePeriodMin: location.calledGracePeriodMin
    },
    queueEntries: queueEntries.map(serializeQueueEntry),
    inServiceVisits: inServiceVisits.map(serializeInServiceVisit),
    missedQueueEntries: missedQueueEntries.map(serializeQueueEntry),
    reviewSummary,
    recentReviews
  };
}

export async function getShopProfile(slug: string) {
  const location = await findLocationBySlug(slug);

  if (!location) {
    throw ApiError.notFound("Shop not found.");
  }

  return serializeShopProfile(location);
}

export function validateShopProfileInput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, error: "Invalid payload." };
  }

  const input = payload as Record<string, unknown>;
  const serviceStationsCount =
    typeof input.serviceStationsCount === "number" && Number.isFinite(input.serviceStationsCount)
      ? Math.max(1, Math.min(50, Math.round(input.serviceStationsCount)))
      : undefined;
  const defaultWalkInDurationMin =
    typeof input.defaultWalkInDurationMin === "number" && Number.isFinite(input.defaultWalkInDurationMin)
      ? Math.max(5, Math.min(240, Math.round(input.defaultWalkInDurationMin)))
      : undefined;

  return {
    ok: true as const,
    data: {
      name: normalizeOptionalText(input.name, 120),
      publicDescription: normalizeOptionalText(input.publicDescription, 600),
      logoImageUrl: normalizeOptionalText(input.logoImageUrl, 1000),
      coverImageUrl: normalizeOptionalText(input.coverImageUrl, 1000),
      phone: normalizeOptionalText(input.phone, 40),
      email: normalizeOptionalText(input.email, 160),
      openingHoursNote: normalizeOptionalText(input.openingHoursNote, 500),
      serviceStationsCount,
      defaultWalkInDurationMin
    }
  };
}

export async function updateShopProfile(
  slug: string,
  input: ShopProfileInput
) {
  const location = await findLocationBySlug(slug);

  if (!location) {
    throw ApiError.notFound("Shop not found.");
  }

  const data: {
    name?: string;
    publicDescription?: string | null;
    logoImageUrl?: string | null;
    coverImageUrl?: string | null;
    phone?: string | null;
    email?: string | null;
    openingHours?: { note: string };
    serviceStationsCount?: number;
    defaultWalkInDurationMin?: number;
  } = {};

  if (input.name !== undefined) {
    if (input.name === null) {
      throw ApiError.badRequest("Shop name is required.");
    }
    data.name = input.name;
  }
  if (input.publicDescription !== undefined) {
    data.publicDescription = input.publicDescription;
  }
  if (input.logoImageUrl !== undefined) {
    data.logoImageUrl = input.logoImageUrl;
  }
  if (input.coverImageUrl !== undefined) {
    data.coverImageUrl = input.coverImageUrl;
  }
  if (input.phone !== undefined) {
    data.phone = input.phone;
  }
  if (input.email !== undefined) {
    data.email = input.email;
  }
  if (input.openingHoursNote !== undefined) {
    data.openingHours = { note: input.openingHoursNote ?? "" };
  }
  if (input.serviceStationsCount !== undefined) {
    data.serviceStationsCount = input.serviceStationsCount;
  }
  if (input.defaultWalkInDurationMin !== undefined) {
    data.defaultWalkInDurationMin = input.defaultWalkInDurationMin;
  }

  const updatedLocation = await prisma.businessLocation.update({
    where: {
      id: location.id
    },
    data
  });

  emitShopQueueUpdated(updatedLocation.slug);
  return serializeShopProfile(updatedLocation);
}

export async function callNextCustomer(slug: string, trackingToken: string) {
  const location = await findLocationBySlug(slug);

  if (!location) {
    throw ApiError.notFound("Shop not found.");
  }

  const queueEntry = await prisma.queueEntry.findFirst({
    where: {
      businessLocationId: location.id,
      trackingToken,
      removedAt: null,
      releasedAt: null,
      missedAt: null
    },
    include: {
      visit: true
    }
  });

  if (!queueEntry) {
    throw ApiError.notFound("Queue entry not found.");
  }

  if (!activeQueueStatuses.includes(queueEntry.visit.status as (typeof activeQueueStatuses)[number])) {
    throw ApiError.conflict("Customer is not in a callable queue state.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedVisit = await tx.visit.update({
      where: {
        id: queueEntry.visitId
      },
      data: {
        status: VisitStatus.CALLED
      }
    });

    const updatedEntry = await tx.queueEntry.update({
      where: {
        id: queueEntry.id
      },
      data: {
        calledAt: new Date()
      },
      include: {
        visit: {
          include: {
            customer: true
          }
        }
      }
    });

    await tx.operationalEvent.create({
      data: {
        businessLocationId: location.id,
        visitId: updatedVisit.id,
        queueEntryId: updatedEntry.id,
        type: OperationalEventType.CUSTOMER_CALLED,
        metadata: {
          trackingToken
        }
      }
    });

    return updatedEntry;
  });

  await emitLocationQueueRefresh(location, [queueEntry.trackingToken]);

  return serializeQueueEntry(result);
}

export async function startService(slug: string, trackingToken: string) {
  const location = await findLocationBySlug(slug);

  if (!location) {
    throw ApiError.notFound("Shop not found.");
  }

  const queueEntry = await prisma.queueEntry.findFirst({
    where: {
      businessLocationId: location.id,
      trackingToken,
      removedAt: null,
      releasedAt: null,
      missedAt: null
    },
    include: {
      visit: true
    }
  });

  if (!queueEntry) {
    throw ApiError.notFound("Queue entry not found.");
  }

  if (!activeQueueStatuses.includes(queueEntry.visit.status as (typeof activeQueueStatuses)[number])) {
    throw ApiError.conflict("Customer is not ready to start service.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedVisit = await tx.visit.update({
      where: {
        id: queueEntry.visitId
      },
      data: {
        status: VisitStatus.IN_SERVICE,
        startedAt: new Date(),
        readyAt: new Date()
      },
      include: {
        customer: true
      }
    });

    await tx.operationalEvent.create({
      data: {
        businessLocationId: location.id,
        visitId: updatedVisit.id,
        queueEntryId: queueEntry.id,
        type: OperationalEventType.SERVICE_STARTED,
        metadata: {
          trackingToken
        }
      }
    });

    await recalculateLocationQueueEstimates(tx, location.id);

    return updatedVisit;
  });

  await processQueueLifecycle(location.id);
  await emitLocationQueueRefresh(location, [queueEntry.trackingToken]);

  return serializeInServiceVisit(result);
}

export function validateServiceExtensionInput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, error: "Invalid payload." };
  }

  const input = payload as Record<string, unknown>;
  const durationDeltaMin =
    typeof input.durationDeltaMin === "number" && Number.isFinite(input.durationDeltaMin)
      ? Math.max(1, Math.min(180, Math.round(input.durationDeltaMin)))
      : undefined;

  if (!durationDeltaMin) {
    return { ok: false as const, error: "Extension minutes are required." };
  }

  return {
    ok: true as const,
    data: {
      durationDeltaMin,
      label:
        typeof input.label === "string" && input.label.trim().length > 0
          ? input.label.trim().slice(0, 80)
          : "Service extension",
      notes:
        typeof input.notes === "string" && input.notes.trim().length > 0
          ? input.notes.trim().slice(0, 240)
          : undefined
    }
  };
}

export async function extendService(
  slug: string,
  visitId: string,
  input: {
    durationDeltaMin: number;
    label: string;
    notes?: string;
  }
) {
  const location = await findLocationBySlug(slug);

  if (!location) {
    throw ApiError.notFound("Shop not found.");
  }

  const visit = await prisma.visit.findFirst({
    where: {
      id: visitId,
      businessLocationId: location.id
    },
    include: {
      customer: true
    }
  });

  if (!visit) {
    throw ApiError.notFound("Visit not found.");
  }

  if (visit.status !== VisitStatus.IN_SERVICE) {
    throw ApiError.conflict("Only the current in-service customer can be extended.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedVisit = await tx.visit.update({
      where: {
        id: visit.id
      },
      data: {
        plannedDurationMin: (visit.plannedDurationMin ?? location.defaultWalkInDurationMin) + input.durationDeltaMin
      },
      include: {
        customer: true
      }
    });

    await tx.serviceAdjustment.create({
      data: {
        visitId: visit.id,
        type: ServiceAdjustmentType.FREE_TEXT,
        label: input.label,
        durationDeltaMin: input.durationDeltaMin,
        notes: input.notes
      }
    });

    await tx.operationalEvent.create({
      data: {
        businessLocationId: location.id,
        visitId: visit.id,
        type: OperationalEventType.SERVICE_EXTENDED,
        metadata: {
          durationDeltaMin: input.durationDeltaMin,
          label: input.label,
          notes: input.notes
        }
      }
    });

    await recalculateLocationQueueEstimates(tx, location.id);

    const activeQueuedEntries = await tx.queueEntry.findMany({
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
        visit: {
          select: {
            id: true,
            estimatedWaitMin: true
          }
        }
      }
    });

    await Promise.all(
      activeQueuedEntries.map((entry) =>
        tx.visit.update({
          where: {
            id: entry.visit.id
          },
          data: {
            estimatedWaitMin: (entry.visit.estimatedWaitMin ?? 0) + input.durationDeltaMin
          }
        })
      )
    );

    return updatedVisit;
  });

  await emitLocationQueueRefresh(location);

  return {
    ...serializeInServiceVisit(result),
    extension: {
      durationDeltaMin: input.durationDeltaMin,
      label: input.label,
      notes: input.notes ?? null
    }
  };
}

export async function completeService(slug: string, visitId: string) {
  const location = await findLocationBySlug(slug);

  if (!location) {
    throw ApiError.notFound("Shop not found.");
  }

  const visit = await prisma.visit.findFirst({
    where: {
      id: visitId,
      businessLocationId: location.id
    },
    include: {
      customer: true,
      queueEntry: true
    }
  });

  if (!visit) {
    throw ApiError.notFound("Visit not found.");
  }

  if (visit.status !== VisitStatus.IN_SERVICE) {
    throw ApiError.conflict("Only in-service visits can be completed.");
  }

  const completedAt = new Date();
  const actualDurationMin = visit.startedAt
    ? Math.max(1, Math.round((completedAt.getTime() - visit.startedAt.getTime()) / 60000))
    : visit.plannedDurationMin ?? location.defaultWalkInDurationMin;

  const result = await prisma.$transaction(async (tx) => {
    const updatedVisit = await tx.visit.update({
      where: {
        id: visit.id
      },
      data: {
        status: VisitStatus.COMPLETED,
        completedAt,
        actualDurationMin
      },
      include: {
        customer: true
      }
    });

    await tx.operationalEvent.create({
      data: {
        businessLocationId: location.id,
        visitId: updatedVisit.id,
        queueEntryId: visit.queueEntry?.id,
        type: OperationalEventType.SERVICE_COMPLETED,
        metadata: {
          actualDurationMin
        }
      }
    });

    await recalculateLocationQueueEstimates(tx, location.id);

    return updatedVisit;
  });

  await processQueueLifecycle(location.id);
  await emitLocationQueueRefresh(location, visit.queueEntry?.trackingToken ? [visit.queueEntry.trackingToken] : []);

  return serializeInServiceVisit(result);
}

export function validateReleaseNoShowInput(payload: unknown) {
  const input = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  return {
    ok: true as const,
    data: {
      reason: typeof input.reason === "string" && input.reason.trim().length > 0
        ? input.reason.trim().slice(0, 200)
        : undefined
    }
  };
}

export function validateReinstateMissedInput(payload: unknown) {
  const input = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  return {
    ok: true as const,
    data: {
      reason: typeof input.reason === "string" && input.reason.trim().length > 0
        ? input.reason.trim().slice(0, 200)
        : undefined
    }
  };
}

export async function releaseQueueNoShow(slug: string, trackingToken: string, reason?: string) {
  const location = await findLocationBySlug(slug);

  if (!location) {
    throw ApiError.notFound("Shop not found.");
  }

  const queueEntry = await prisma.queueEntry.findFirst({
    where: {
      businessLocationId: location.id,
      trackingToken,
      removedAt: null,
      releasedAt: null,
      missedAt: null
    },
    include: {
      visit: true
    }
  });

  if (!queueEntry) {
    throw ApiError.notFound("Queue entry not found.");
  }

  if (!activeQueueStatuses.includes(queueEntry.visit.status as (typeof activeQueueStatuses)[number])) {
    throw ApiError.conflict("Only active queue customers can be released as no-show.");
  }

  const now = new Date();
  const nextConfirmationStatus =
    queueEntry.confirmationStatus === ArrivalResponseStatus.PENDING
      ? ArrivalResponseStatus.EXPIRED
      : queueEntry.confirmationStatus;

  await prisma.$transaction(async (tx) => {
    await tx.queueEntry.update({
      where: {
        id: queueEntry.id
      },
      data: {
        confirmationStatus: nextConfirmationStatus,
        confirmationRespondedAt: queueEntry.confirmationRespondedAt ?? now,
        missedAt: now,
        releasedAt: now
      }
    });

    await tx.visit.update({
      where: {
        id: queueEntry.visitId
      },
      data: {
        status: VisitStatus.NO_SHOW
      }
    });

    await tx.operationalEvent.create({
      data: {
        businessLocationId: location.id,
        visitId: queueEntry.visitId,
        queueEntryId: queueEntry.id,
        type: OperationalEventType.SLOT_RELEASED,
        metadata: {
          trackingToken,
          reason: reason ?? "Released by staff as no-show",
          previousVisitStatus: queueEntry.visit.status,
          previousConfirmationStatus: queueEntry.confirmationStatus
        }
      }
    });

    await recalculateLocationQueueEstimates(tx, location.id);
  });

  await processQueueLifecycle(location.id);
  await emitLocationQueueRefresh(location, [trackingToken]);

  return {
    trackingToken,
    visitStatus: VisitStatus.NO_SHOW,
    releasedAt: now.toISOString(),
    reason: reason ?? "Released by staff as no-show"
  };
}

export async function reinstateMissedCustomer(slug: string, trackingToken: string, reason?: string) {
  const location = await findLocationBySlug(slug);

  if (!location) {
    throw ApiError.notFound("Shop not found.");
  }

  const queueEntry = await prisma.queueEntry.findFirst({
    where: {
      businessLocationId: location.id,
      trackingToken
    },
    include: {
      visit: true,
      operationalEvents: true
    }
  });

  if (!queueEntry) {
    throw ApiError.notFound("Queue entry not found.");
  }

  if (queueEntry.visit.status !== VisitStatus.NO_SHOW && queueEntry.visit.status !== VisitStatus.MISSED) {
    throw ApiError.conflict("Only missed or no-show customers can be reinstated.");
  }

  const releasedAt = queueEntry.missedAt ?? queueEntry.releasedAt;

  if (!releasedAt) {
    throw ApiError.conflict("This customer has not been released from the queue.");
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  if (releasedAt < startOfToday) {
    throw ApiError.conflict("Only customers missed today can be reinstated.");
  }

  const wasAlreadyReinstated = queueEntry.operationalEvents.some((event) => {
    if (event.type !== OperationalEventType.QUEUE_REORDERED) {
      return false;
    }

    return Boolean(
      event.metadata &&
        typeof event.metadata === "object" &&
        !Array.isArray(event.metadata) &&
        (event.metadata as Record<string, unknown>).action === "CUSTOMER_REINSTATED"
    );
  });

  if (wasAlreadyReinstated) {
    throw ApiError.conflict("This customer has already been reinstated once today.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.queueEntry.updateMany({
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
      data: {
        sortIndex: {
          increment: 1
        }
      }
    });

    await tx.queueEntry.update({
      where: {
        id: queueEntry.id
      },
      data: {
        sortIndex: 1,
        confirmationStatus: ArrivalResponseStatus.COMING,
        confirmationRespondedAt: now,
        presentConfirmedAt: now,
        calledAt: now,
        missedAt: null,
        releasedAt: null,
        removedAt: null
      }
    });

    await tx.visit.update({
      where: {
        id: queueEntry.visitId
      },
      data: {
        status: VisitStatus.READY,
        readyAt: now,
        cancelledAt: null
      }
    });

    await tx.operationalEvent.create({
      data: {
        businessLocationId: location.id,
        visitId: queueEntry.visitId,
        queueEntryId: queueEntry.id,
        type: OperationalEventType.QUEUE_REORDERED,
        metadata: {
          action: "CUSTOMER_REINSTATED",
          trackingToken,
          reason: reason ?? "Reinstated by staff",
          previousVisitStatus: queueEntry.visit.status,
          previousConfirmationStatus: queueEntry.confirmationStatus,
          previousReleasedAt: releasedAt.toISOString()
        }
      }
    });

    await recalculateLocationQueueEstimates(tx, location.id);
  });

  await processQueueLifecycle(location.id);
  await emitLocationQueueRefresh(location, [trackingToken]);

  return {
    trackingToken,
    visitStatus: VisitStatus.READY,
    sortIndex: 1,
    reinstatedAt: now.toISOString(),
    reason: reason ?? "Reinstated by staff"
  };
}

export function validateArrivalResponseInput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, error: "Invalid payload." };
  }

  const response = (payload as Record<string, unknown>).response;

  if (response !== ArrivalResponseStatus.COMING && response !== ArrivalResponseStatus.DECLINED) {
    return { ok: false as const, error: "Response must be COMING or DECLINED." };
  }

  return {
    ok: true as const,
    data: {
      response: response as "COMING" | "DECLINED"
    }
  };
}

export async function respondToArrivalConfirmation(
  trackingToken: string,
  response: "COMING" | "DECLINED"
) {
  const queueEntry = await prisma.queueEntry.findUnique({
    where: {
      trackingToken
    },
    include: {
      visit: true,
      businessLocation: true
    }
  });

  if (!queueEntry || !queueEntry.businessLocation) {
    throw ApiError.notFound("Queue entry not found.");
  }

  if (queueEntry.releasedAt || queueEntry.removedAt || queueEntry.missedAt) {
    throw ApiError.conflict("This queue place is no longer active.");
  }

  if (queueEntry.visit.status !== VisitStatus.CONFIRMATION_PENDING) {
    throw ApiError.conflict("Arrival confirmation is not currently awaiting a response.");
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.queueEntry.update({
      where: {
        id: queueEntry.id
      },
      data: {
        confirmationStatus: response,
        confirmationRespondedAt: now,
        presentConfirmedAt: response === ArrivalResponseStatus.COMING ? now : null,
        releasedAt: response === ArrivalResponseStatus.DECLINED ? now : null
      }
    });

    await tx.visit.update({
      where: {
        id: queueEntry.visitId
      },
      data: {
        status: response === ArrivalResponseStatus.COMING ? VisitStatus.READY : VisitStatus.CANCELLED
      }
    });

    await tx.operationalEvent.create({
      data: {
        businessLocationId: queueEntry.businessLocationId,
        visitId: queueEntry.visitId,
        queueEntryId: queueEntry.id,
        type:
          response === ArrivalResponseStatus.COMING
            ? OperationalEventType.ARRIVAL_CONFIRMED
            : OperationalEventType.ARRIVAL_DECLINED,
        metadata: {
          trackingToken
        }
      }
    });

    await recalculateLocationQueueEstimates(tx, queueEntry.businessLocationId);
  });

  await processQueueLifecycle(queueEntry.businessLocationId);
  await emitLocationQueueRefresh(queueEntry.businessLocation, [trackingToken]);

  return {
    trackingToken,
    response
  };
}

export function validateAddWalkInInput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, error: "Invalid payload." };
  }

  const input = payload as Record<string, unknown>;

  if (typeof input.firstName !== "string" || input.firstName.trim().length === 0) {
    return { ok: false as const, error: "Name is required." };
  }

  const plannedDurationMin =
    typeof input.plannedDurationMin === "number" && Number.isFinite(input.plannedDurationMin)
      ? Math.max(1, Math.round(input.plannedDurationMin))
      : undefined;

  return {
    ok: true as const,
    data: {
      firstName: input.firstName.trim(),
      mobileNumber:
        typeof input.mobileNumber === "string" && input.mobileNumber.trim().length > 0
          ? input.mobileNumber.trim()
          : undefined,
      plannedDurationMin,
      reason:
        typeof input.reason === "string" && input.reason.trim().length > 0 ? input.reason.trim() : undefined
    }
  };
}

export async function addWalkInCustomer(
  slug: string,
  input: {
    firstName: string;
    mobileNumber?: string;
    plannedDurationMin?: number;
    reason?: string;
  }
) {
  const location = await findLocationBySlug(slug);

  if (!location) {
    throw ApiError.notFound("Shop not found.");
  }

  if (!location.queueEnabled || location.queuePaused) {
    throw ApiError.conflict("Queue is not accepting walk-ins right now.");
  }

  const customer = input.mobileNumber
    ? await prisma.customer.upsert({
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
      })
    : await prisma.customer.create({
        data: {
          firstName: input.firstName
        }
      });

  const queueEntry = await prisma.$transaction(async (tx) => {
    const lastEntry = await tx.queueEntry.findFirst({
      where: {
        businessLocationId: location.id
      },
      orderBy: {
        sortIndex: "desc"
      }
    });

    const visit = await tx.visit.create({
      data: {
        businessLocationId: location.id,
        customerId: customer.id,
        source: VisitSource.WALK_IN,
        status: VisitStatus.QUEUED,
        plannedDurationMin: input.plannedDurationMin ?? location.defaultWalkInDurationMin,
        queueJoinedAt: new Date(),
        notes: input.reason
      }
    });

    const entry = await tx.queueEntry.create({
      data: {
        visitId: visit.id,
        businessLocationId: location.id,
        trackingToken: `walkin-${visit.id}`,
        sortIndex: (lastEntry?.sortIndex ?? 0) + 1,
        joinedAt: new Date(),
        isWalkIn: true,
        manualInsertReason: input.reason,
        confirmationStatus: ArrivalResponseStatus.PENDING
      },
      include: {
        visit: {
          include: {
            customer: true
          }
        }
      }
    });

    await tx.operationalEvent.create({
      data: {
        businessLocationId: location.id,
        visitId: visit.id,
        queueEntryId: entry.id,
        type: OperationalEventType.WALK_IN_ADDED,
        metadata: {
          plannedDurationMin: input.plannedDurationMin ?? location.defaultWalkInDurationMin,
          reason: input.reason ?? null
        }
      }
    });

    await recalculateLocationQueueEstimates(tx, location.id);

    return entry;
  });

  await processQueueLifecycle(location.id);
  await emitLocationQueueRefresh(location, [queueEntry.trackingToken]);

  return serializeQueueEntry(queueEntry);
}

export function validateQueuePauseInput(payload: unknown) {
  const input = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  return {
    ok: true as const,
    data: {
      reason: typeof input.reason === "string" && input.reason.trim().length > 0 ? input.reason.trim() : undefined
    }
  };
}

export async function pauseQueue(slug: string, reason?: string) {
  const location = await findLocationBySlug(slug);

  if (!location) {
    throw ApiError.notFound("Shop not found.");
  }

  const updatedLocation = await prisma.$transaction(async (tx) => {
    const updated = await tx.businessLocation.update({
      where: {
        id: location.id
      },
      data: {
        queuePaused: true,
        queuePauseReason: reason ?? "Temporarily paused by staff."
      }
    });

    await tx.operationalEvent.create({
      data: {
        businessLocationId: location.id,
        type: OperationalEventType.QUEUE_PAUSED,
        metadata: {
          reason: updated.queuePauseReason
        }
      }
    });

    return updated;
  });

  emitShopQueueUpdated(location.slug);

  return {
    slug: updatedLocation.slug,
    queuePaused: updatedLocation.queuePaused,
    queuePauseReason: updatedLocation.queuePauseReason
  };
}

export async function resumeQueue(slug: string) {
  const location = await findLocationBySlug(slug);

  if (!location) {
    throw ApiError.notFound("Shop not found.");
  }

  const updatedLocation = await prisma.$transaction(async (tx) => {
    const updated = await tx.businessLocation.update({
      where: {
        id: location.id
      },
      data: {
        queuePaused: false,
        queuePauseReason: null
      }
    });

    await tx.operationalEvent.create({
      data: {
        businessLocationId: location.id,
        type: OperationalEventType.QUEUE_RESUMED
      }
    });

    return updated;
  });

  await processQueueLifecycle(location.id);
  emitShopQueueUpdated(location.slug);

  return {
    slug: updatedLocation.slug,
    queuePaused: updatedLocation.queuePaused,
    queuePauseReason: updatedLocation.queuePauseReason
  };
}
