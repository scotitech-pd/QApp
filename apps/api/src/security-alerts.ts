import {
  AppRole,
  AuthEventType,
  SecurityAlertStatus,
  SecurityAlertType,
  SecurityCaseSeverity,
  SecurityCaseStatus
} from "@prisma/client";

import { recordAuthAuditEvent } from "./auth-audit";
import { ApiError } from "./core/api-error";
import { prisma } from "./prisma";

function serializeAlert(alert: Awaited<ReturnType<typeof loadSecurityAlert>>) {
  return {
    id: alert.id,
    createdAt: alert.createdAt.toISOString(),
    updatedAt: alert.updatedAt.toISOString(),
    acknowledgedAt: alert.acknowledgedAt?.toISOString() ?? null,
    resolvedAt: alert.resolvedAt?.toISOString() ?? null,
    type: alert.type,
    status: alert.status,
    severity: alert.severity,
    title: alert.title,
    summary: alert.summary,
    resolutionSummary: alert.resolutionSummary,
    metadata: alert.metadata,
    targetUser: alert.targetUser,
    linkedCase: alert.linkedCase
      ? {
          id: alert.linkedCase.id,
          title: alert.linkedCase.title,
          status: alert.linkedCase.status,
          severity: alert.linkedCase.severity
        }
      : null,
    acknowledgedByUser: alert.acknowledgedByUser,
    resolvedByUser: alert.resolvedByUser
  };
}

function normalizeContextPart(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function buildDeviceContextSignature(input: {
  deviceName?: string | null;
  platform?: string | null;
  userAgent?: string | null;
}) {
  return [
    normalizeContextPart(input.deviceName),
    normalizeContextPart(input.platform),
    normalizeContextPart(input.userAgent)
  ].join("|");
}

async function loadPlatformAdminUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      appRole: true,
      firstName: true,
      lastName: true,
      email: true
    }
  });

  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  if (user.appRole !== AppRole.PLATFORM_ADMIN) {
    throw ApiError.badRequest("Security alert actions require a platform admin.");
  }

  return user;
}

async function loadSecurityAlert(alertId: string) {
  const alert = await prisma.securityAlert.findUnique({
    where: {
      id: alertId
    },
    include: {
      targetUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true
        }
      },
      linkedCase: {
        select: {
          id: true,
          title: true,
          status: true,
          severity: true
        }
      },
      acknowledgedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      resolvedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });

  if (!alert) {
    throw ApiError.notFound("Security alert not found.");
  }

  return alert;
}

export async function createOrRefreshSecurityAlert(input: {
  targetUserId: string;
  type: SecurityAlertType;
  severity: SecurityCaseSeverity;
  title: string;
  summary?: string;
  metadata?: object;
}) {
  const existing = await prisma.securityAlert.findFirst({
    where: {
      targetUserId: input.targetUserId,
      type: input.type,
      status: {
        in: [SecurityAlertStatus.OPEN, SecurityAlertStatus.ACKNOWLEDGED]
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (existing) {
    return prisma.securityAlert.update({
      where: {
        id: existing.id
      },
      data: {
        severity: input.severity,
        title: input.title,
        summary: input.summary,
        metadata: input.metadata as never,
        status: SecurityAlertStatus.OPEN,
        updatedAt: new Date(),
        acknowledgedAt: null,
        acknowledgedByUserId: null
      }
    });
  }

  return prisma.securityAlert.create({
    data: {
      targetUserId: input.targetUserId,
      type: input.type,
      severity: input.severity,
      title: input.title,
      summary: input.summary,
      metadata: input.metadata as never
    }
  });
}

export async function createNewDeviceLoginAlertIfNeeded(input: {
  userId: string;
  sessionId: string;
  deviceName?: string;
  platform?: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const currentSignature = buildDeviceContextSignature(input);

  if (!currentSignature.replace(/\|/g, "")) {
    return null;
  }

  const previousSessions = await prisma.authSession.findMany({
    where: {
      userId: input.userId,
      id: {
        not: input.sessionId
      }
    },
    select: {
      id: true,
      deviceName: true,
      platform: true,
      userAgent: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 25
  });

  if (previousSessions.length === 0) {
    return null;
  }

  const knownMatch = previousSessions.some((session) => buildDeviceContextSignature(session) === currentSignature);

  if (knownMatch) {
    return null;
  }

  return createOrRefreshSecurityAlert({
    targetUserId: input.userId,
    type: SecurityAlertType.NEW_DEVICE_LOGIN,
    severity: SecurityCaseSeverity.LOW,
    title: "New device login detected",
    summary: "A successful login occurred from a device context the account has not used before.",
    metadata: {
      sessionId: input.sessionId,
      deviceName: input.deviceName ?? null,
      platform: input.platform ?? null,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null
    }
  });
}

export async function listSecurityAlerts(input: {
  userId?: string;
  status?: SecurityAlertStatus;
  severity?: SecurityCaseSeverity;
  type?: SecurityAlertType;
  limit?: number;
}) {
  const alerts = await prisma.securityAlert.findMany({
    where: {
      targetUserId: input.userId,
      status: input.status,
      severity: input.severity,
      type: input.type
    },
    include: {
      targetUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true
        }
      },
      linkedCase: {
        select: {
          id: true,
          title: true,
          status: true,
          severity: true
        }
      },
      acknowledgedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      resolvedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: [
      {
        createdAt: "desc"
      }
    ],
    take: Math.min(Math.max(input.limit ?? 50, 1), 200)
  });

  return alerts.map(serializeAlert);
}

export async function getSecurityAlert(alertId: string) {
  const alert = await loadSecurityAlert(alertId);
  return serializeAlert(alert);
}

export async function acknowledgeSecurityAlert(input: {
  alertId: string;
  actorUserId: string;
  note?: string;
}) {
  await loadPlatformAdminUser(input.actorUserId);
  const alert = await loadSecurityAlert(input.alertId);

  const updated = await prisma.securityAlert.update({
    where: {
      id: alert.id
    },
    data: {
      status: SecurityAlertStatus.ACKNOWLEDGED,
      acknowledgedAt: new Date(),
      acknowledgedByUserId: input.actorUserId
    }
  });

  await recordAuthAuditEvent({
    userId: alert.targetUser.id,
    actorUserId: input.actorUserId,
    type: AuthEventType.ADMIN_SECURITY_ALERT_ACKNOWLEDGED,
    metadata: {
      securityAlertId: alert.id,
      note: input.note ?? null
    }
  });

  return getSecurityAlert(updated.id);
}

export async function resolveSecurityAlert(input: {
  alertId: string;
  actorUserId: string;
  resolutionSummary: string;
}) {
  await loadPlatformAdminUser(input.actorUserId);
  const alert = await loadSecurityAlert(input.alertId);

  const updated = await prisma.securityAlert.update({
    where: {
      id: alert.id
    },
    data: {
      status: SecurityAlertStatus.RESOLVED,
      resolvedAt: new Date(),
      resolvedByUserId: input.actorUserId,
      resolutionSummary: input.resolutionSummary
    }
  });

  await recordAuthAuditEvent({
    userId: alert.targetUser.id,
    actorUserId: input.actorUserId,
    type: AuthEventType.ADMIN_SECURITY_ALERT_RESOLVED,
    metadata: {
      securityAlertId: alert.id
    }
  });

  return getSecurityAlert(updated.id);
}

export async function createSecurityCaseFromAlert(input: {
  alertId: string;
  actorUserId: string;
  assignedToUserId?: string;
  title?: string;
  summary?: string;
  initialNote?: string;
}) {
  await loadPlatformAdminUser(input.actorUserId);
  const alert = await loadSecurityAlert(input.alertId);

  if (input.assignedToUserId) {
    await loadPlatformAdminUser(input.assignedToUserId);
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingAlert = await tx.securityAlert.findUnique({
      where: {
        id: alert.id
      }
    });

    if (!existingAlert) {
      throw ApiError.notFound("Security alert not found.");
    }

    const linkedCase = await tx.securityCase.create({
      data: {
        targetUserId: alert.targetUser.id,
        createdByUserId: input.actorUserId,
        assignedToUserId: input.assignedToUserId,
        title: input.title ?? alert.title,
        summary: input.summary ?? alert.summary ?? "Created from security alert.",
        severity: alert.severity,
        status: SecurityCaseStatus.OPEN
      }
    });

    if (input.initialNote) {
      await tx.securityCaseNote.create({
        data: {
          securityCaseId: linkedCase.id,
          authorUserId: input.actorUserId,
          body: input.initialNote
        }
      });
    }

    await tx.securityAlert.update({
      where: {
        id: alert.id
      },
      data: {
        linkedCaseId: linkedCase.id,
        status: SecurityAlertStatus.ACKNOWLEDGED,
        acknowledgedAt: existingAlert.acknowledgedAt ?? new Date(),
        acknowledgedByUserId: existingAlert.acknowledgedByUserId ?? input.actorUserId
      }
    });

    await recordAuthAuditEvent(
      {
        userId: alert.targetUser.id,
        actorUserId: input.actorUserId,
        type: AuthEventType.ADMIN_SECURITY_ALERT_CASE_CREATED,
        metadata: {
          securityAlertId: alert.id,
          securityCaseId: linkedCase.id
        }
      },
      tx
    );

    return linkedCase.id;
  });

  return {
    alert: await getSecurityAlert(alert.id),
    linkedCaseId: result
  };
}
