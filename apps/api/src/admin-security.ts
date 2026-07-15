import {
  AppRole,
  AuthEventType,
  SecurityCaseSeverity,
  SecurityCaseStatus,
  type AuthAuditEvent,
  type AuthEventType as AuthEventTypeEnum,
  type AuthSession,
  type SecurityCase,
  type SecurityCaseNote
} from "@prisma/client";

import { clearLoginRateLimitForUserAcrossIps } from "./auth";
import { listAdminAuthAuditEvents, recordAuthAuditEvent } from "./auth-audit";
import { ApiError } from "./core/api-error";
import { appConfig } from "./core/config";
import { createRefreshToken, hashRefreshToken } from "./core/token";
import { prisma } from "./prisma";

type SecurityUserShape = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  appRole: string;
  lastLoginAt: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  memberships: Array<{
    role: string;
    businessGroup: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  authSessions: Array<Pick<AuthSession, "id" | "createdAt" | "expiresAt" | "revokedAt" | "deviceName" | "platform">>;
  authAuditEvents: Array<Pick<AuthAuditEvent, "createdAt" | "type">>;
};

type SecurityCaseWithRelations = SecurityCase & {
  targetUser: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
  createdByUser: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
  };
  assignedToUser: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
  } | null;
  notes: Array<
    SecurityCaseNote & {
      authorUser: {
        id: string;
        firstName: string;
        lastName: string | null;
        email: string | null;
      };
    }
  >;
};

function buildPasswordResetUrl(token: string) {
  return `${appConfig.appBaseUrl}/reset-password/${token}`;
}

function serializeSecurityUser(user: SecurityUserShape) {
  const now = Date.now();
  const activeSessionCount = user.authSessions.filter(
    (session) => !session.revokedAt && session.expiresAt.getTime() > now
  ).length;

  return {
    id: user.id,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    appRole: user.appRole,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    failedLoginAttempts: user.failedLoginAttempts,
    lockedUntil: user.lockedUntil?.toISOString() ?? null,
    isLocked: Boolean(user.lockedUntil && user.lockedUntil.getTime() > now),
    activeSessionCount,
    memberships: user.memberships.map((membership) => ({
      role: membership.role,
      businessGroup: membership.businessGroup
    })),
    latestAuthEvent:
      user.authAuditEvents[0] != null
        ? {
            createdAt: user.authAuditEvents[0].createdAt.toISOString(),
            type: user.authAuditEvents[0].type
          }
        : null
  };
}

function serializeSecurityCase(securityCase: SecurityCaseWithRelations) {
  return {
    id: securityCase.id,
    createdAt: securityCase.createdAt.toISOString(),
    updatedAt: securityCase.updatedAt.toISOString(),
    resolvedAt: securityCase.resolvedAt?.toISOString() ?? null,
    title: securityCase.title,
    summary: securityCase.summary,
    resolutionSummary: securityCase.resolutionSummary,
    status: securityCase.status,
    severity: securityCase.severity,
    targetUser: securityCase.targetUser,
    createdByUser: securityCase.createdByUser,
    assignedToUser: securityCase.assignedToUser,
    notes: securityCase.notes.map((note) => ({
      id: note.id,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      authorUser: note.authorUser
    }))
  };
}

async function loadSecurityUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    include: {
      memberships: {
        include: {
          businessGroup: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      },
      authSessions: {
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
          revokedAt: true,
          deviceName: true,
          platform: true
        }
      },
      authAuditEvents: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1,
        select: {
          createdAt: true,
          type: true
        }
      }
    }
  });

  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  return user;
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
    throw ApiError.badRequest("Assigned security case user must be a platform admin.");
  }

  return user;
}

async function loadSecurityCase(caseId: string) {
  const securityCase = await prisma.securityCase.findUnique({
    where: {
      id: caseId
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
      createdByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      assignedToUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      notes: {
        orderBy: {
          createdAt: "asc"
        },
        include: {
          authorUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!securityCase) {
    throw ApiError.notFound("Security case not found.");
  }

  return securityCase;
}

export async function listSecurityUsers(input: {
  query?: string;
  lockedOnly?: boolean;
  limit?: number;
}) {
  const query = typeof input.query === "string" && input.query.trim().length > 0 ? input.query.trim() : undefined;
  const now = new Date();
  const users = await prisma.user.findMany({
    where: {
      OR: query
        ? [
            {
              id: query
            },
            {
              email: {
                contains: query,
                mode: "insensitive"
              }
            },
            {
              phone: {
                contains: query
              }
            },
            {
              firstName: {
                contains: query,
                mode: "insensitive"
              }
            },
            {
              lastName: {
                contains: query,
                mode: "insensitive"
              }
            }
          ]
        : undefined,
      lockedUntil: input.lockedOnly
        ? {
            gt: now
          }
        : undefined
    },
    include: {
      memberships: {
        include: {
          businessGroup: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      },
      authSessions: {
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
          revokedAt: true,
          deviceName: true,
          platform: true
        }
      },
      authAuditEvents: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1,
        select: {
          createdAt: true,
          type: true
        }
      }
    },
    orderBy: [
      {
        lockedUntil: "desc"
      },
      {
        updatedAt: "desc"
      }
    ],
    take: Math.min(Math.max(input.limit ?? 25, 1), 100)
  });

  return users.map(serializeSecurityUser);
}

export async function getSecurityUser(userId: string) {
  const user = await loadSecurityUser(userId);
  return serializeSecurityUser(user);
}

export async function listSecurityAuthActivity(input: {
  userId?: string;
  identifier?: string;
  type?: AuthEventTypeEnum;
  limit?: number;
}) {
  return listAdminAuthAuditEvents(input);
}

export async function listSecurityCases(input: {
  userId?: string;
  status?: SecurityCaseStatus;
  severity?: SecurityCaseSeverity;
  assignedToUserId?: string;
  limit?: number;
}) {
  const securityCases = await prisma.securityCase.findMany({
    where: {
      targetUserId: input.userId,
      status: input.status,
      severity: input.severity,
      assignedToUserId: input.assignedToUserId
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
      createdByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      assignedToUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      notes: {
        orderBy: {
          createdAt: "asc"
        },
        include: {
          authorUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }
    },
    orderBy: [
      {
        updatedAt: "desc"
      },
      {
        createdAt: "desc"
      }
    ],
    take: Math.min(Math.max(input.limit ?? 25, 1), 100)
  });

  return securityCases.map(serializeSecurityCase);
}

export async function getSecurityCase(caseId: string) {
  const securityCase = await loadSecurityCase(caseId);
  return serializeSecurityCase(securityCase);
}

export async function createSecurityCase(input: {
  actorUserId: string;
  targetUserId: string;
  assignedToUserId?: string;
  title: string;
  summary?: string;
  severity: SecurityCaseSeverity;
  initialNote?: string;
}) {
  await loadSecurityUser(input.targetUserId);

  if (input.assignedToUserId) {
    await loadPlatformAdminUser(input.assignedToUserId);
  }

  const securityCase = await prisma.$transaction(async (tx) => {
    const created = await tx.securityCase.create({
      data: {
        targetUserId: input.targetUserId,
        createdByUserId: input.actorUserId,
        assignedToUserId: input.assignedToUserId,
        title: input.title,
        summary: input.summary,
        severity: input.severity
      }
    });

    if (input.initialNote) {
      await tx.securityCaseNote.create({
        data: {
          securityCaseId: created.id,
          authorUserId: input.actorUserId,
          body: input.initialNote
        }
      });
    }

    await recordAuthAuditEvent(
      {
        userId: input.targetUserId,
        actorUserId: input.actorUserId,
        type: AuthEventType.ADMIN_SECURITY_CASE_CREATED,
        metadata: {
          securityCaseId: created.id,
          severity: input.severity,
          assignedToUserId: input.assignedToUserId ?? null
        }
      },
      tx
    );

    return created;
  });

  return getSecurityCase(securityCase.id);
}

export async function addSecurityCaseNote(input: {
  caseId: string;
  actorUserId: string;
  body: string;
}) {
  const securityCase = await loadSecurityCase(input.caseId);

  await prisma.$transaction(async (tx) => {
    await tx.securityCaseNote.create({
      data: {
        securityCaseId: securityCase.id,
        authorUserId: input.actorUserId,
        body: input.body
      }
    });

    await tx.securityCase.update({
      where: {
        id: securityCase.id
      },
      data: {
        updatedAt: new Date()
      }
    });

    await recordAuthAuditEvent(
      {
        userId: securityCase.targetUserId,
        actorUserId: input.actorUserId,
        type: AuthEventType.ADMIN_SECURITY_CASE_NOTE_ADDED,
        metadata: {
          securityCaseId: securityCase.id
        }
      },
      tx
    );
  });

  return getSecurityCase(securityCase.id);
}

export async function resolveSecurityCase(input: {
  caseId: string;
  actorUserId: string;
  resolutionSummary: string;
}) {
  const securityCase = await loadSecurityCase(input.caseId);

  await prisma.$transaction(async (tx) => {
    await tx.securityCase.update({
      where: {
        id: securityCase.id
      },
      data: {
        status: SecurityCaseStatus.RESOLVED,
        resolvedAt: new Date(),
        resolutionSummary: input.resolutionSummary
      }
    });

    await recordAuthAuditEvent(
      {
        userId: securityCase.targetUserId,
        actorUserId: input.actorUserId,
        type: AuthEventType.ADMIN_SECURITY_CASE_RESOLVED,
        metadata: {
          securityCaseId: securityCase.id
        }
      },
      tx
    );
  });

  return getSecurityCase(securityCase.id);
}

export async function reopenSecurityCase(input: {
  caseId: string;
  actorUserId: string;
  note?: string;
}) {
  const securityCase = await loadSecurityCase(input.caseId);

  await prisma.$transaction(async (tx) => {
    await tx.securityCase.update({
      where: {
        id: securityCase.id
      },
      data: {
        status: SecurityCaseStatus.MONITORING,
        resolvedAt: null,
        resolutionSummary: null
      }
    });

    if (input.note) {
      await tx.securityCaseNote.create({
        data: {
          securityCaseId: securityCase.id,
          authorUserId: input.actorUserId,
          body: input.note
        }
      });
    }

    await recordAuthAuditEvent(
      {
        userId: securityCase.targetUserId,
        actorUserId: input.actorUserId,
        type: AuthEventType.ADMIN_SECURITY_CASE_REOPENED,
        metadata: {
          securityCaseId: securityCase.id
        }
      },
      tx
    );
  });

  return getSecurityCase(securityCase.id);
}

export async function adminUnlockUserAccount(userId: string, actorUserId: string, reason?: string) {
  const user = await prisma.user.update({
    where: {
      id: userId
    },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null
    }
  });

  clearLoginRateLimitForUserAcrossIps(user);

  await recordAuthAuditEvent({
    userId: user.id,
    actorUserId,
    type: AuthEventType.ADMIN_UNLOCKED_ACCOUNT,
    identifier: user.email ?? user.phone ?? user.id,
    metadata: {
      reason: reason ?? null
    }
  });

  return getSecurityUser(user.id);
}

export async function adminRevokeAllUserSessions(userId: string, actorUserId: string, reason?: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  const result = await prisma.authSession.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });

  await recordAuthAuditEvent({
    userId: user.id,
    actorUserId,
    type: AuthEventType.ADMIN_REVOKED_ALL_SESSIONS,
    identifier: user.email ?? user.phone ?? user.id,
    metadata: {
      reason: reason ?? null,
      revokedSessionsCount: result.count
    }
  });

  return {
    revoked: true,
    revokedSessionsCount: result.count,
    user: await getSecurityUser(user.id)
  };
}

export async function adminForcePasswordReset(userId: string, actorUserId: string, reason?: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  const rawToken = createRefreshToken();
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date(Date.now() + appConfig.auth.passwordResetTtlMinutes * 60 * 1000);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        consumedAt: null
      },
      data: {
        consumedAt: now
      }
    });

    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    await tx.authSession.updateMany({
      where: {
        userId: user.id,
        revokedAt: null
      },
      data: {
        revokedAt: now
      }
    });

    await tx.user.update({
      where: {
        id: user.id
      },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });

    await recordAuthAuditEvent(
      {
        userId: user.id,
        actorUserId,
        type: AuthEventType.ADMIN_FORCED_PASSWORD_RESET,
        identifier: user.email ?? user.phone ?? user.id,
        metadata: {
          reason: reason ?? null,
          expiresAt: expiresAt.toISOString()
        }
      },
      tx
    );
  });

  clearLoginRateLimitForUserAcrossIps(user);

  return {
    user: await getSecurityUser(user.id),
    resetTokenPreview: appConfig.env === "production" ? undefined : rawToken,
    resetUrlPreview: appConfig.env === "production" ? undefined : buildPasswordResetUrl(rawToken),
    expiresAt: expiresAt.toISOString()
  };
}
