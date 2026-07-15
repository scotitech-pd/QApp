import { AppRole, AuthEventType, MembershipRole, SecurityAlertType, SecurityCaseSeverity } from "@prisma/client";

import { listAuthAuditEvents, recordAuthAuditEvent } from "./auth-audit";
import { ApiError } from "./core/api-error";
import { appConfig } from "./core/config";
import { hashPassword, validatePasswordStrength, verifyPassword } from "./core/password";
import { authRateLimitStore } from "./core/rate-limit";
import { createAccessToken, createRefreshToken, hashRefreshToken } from "./core/token";
import { buildLoginRateLimitKey } from "./middleware/rate-limit";
import { prisma } from "./prisma";
import { createNewDeviceLoginAlertIfNeeded, createOrRefreshSecurityAlert } from "./security-alerts";

function normalizeIdentifier(value: string) {
  return value.trim();
}

function isEmail(value: string) {
  return value.includes("@");
}

export function validateLoginInput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, error: "Invalid payload." };
  }

  const input = payload as Record<string, unknown>;

  if (typeof input.identifier !== "string" || input.identifier.trim().length === 0) {
    return { ok: false as const, error: "Identifier is required." };
  }

  if (typeof input.password !== "string" || input.password.trim().length === 0) {
    return { ok: false as const, error: "Password is required." };
  }

  return {
    ok: true as const,
    data: {
      identifier: normalizeIdentifier(input.identifier),
      password: input.password,
      deviceName: typeof input.deviceName === "string" ? input.deviceName.trim() : undefined,
      platform: typeof input.platform === "string" ? input.platform.trim() : undefined
    }
  };
}

export function validateRefreshInput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, error: "Invalid payload." };
  }

  const refreshToken = (payload as Record<string, unknown>).refreshToken;

  if (typeof refreshToken !== "string" || refreshToken.trim().length === 0) {
    return { ok: false as const, error: "Refresh token is required." };
  }

  return {
    ok: true as const,
    data: {
      refreshToken: refreshToken.trim()
    }
  };
}

export function validatePasswordResetRequestInput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, error: "Invalid payload." };
  }

  const identifier = (payload as Record<string, unknown>).identifier;

  if (typeof identifier !== "string" || identifier.trim().length === 0) {
    return { ok: false as const, error: "Identifier is required." };
  }

  return {
    ok: true as const,
    data: {
      identifier: normalizeIdentifier(identifier)
    }
  };
}

export function validatePasswordResetConfirmInput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, error: "Invalid payload." };
  }

  const input = payload as Record<string, unknown>;
  const minLength = appConfig.auth.passwordMinLength;

  if (typeof input.token !== "string" || input.token.trim().length === 0) {
    return { ok: false as const, error: "Reset token is required." };
  }

  if (typeof input.password !== "string" || input.password.length < minLength) {
    return { ok: false as const, error: `Password must be at least ${minLength} characters.` };
  }

  return {
    ok: true as const,
    data: {
      token: input.token.trim(),
      password: input.password
    }
  };
}

function serializeUser(user: {
  id: string;
  appRole: AppRole;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  memberships: Array<{
    role: MembershipRole;
    businessGroup: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  staffProfiles: Array<{
    id: string;
    displayName: string;
    businessLocation: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}) {
  return {
    id: user.id,
    appRole: user.appRole,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    memberships: user.memberships.map((membership) => ({
      role: membership.role,
      businessGroup: membership.businessGroup
    })),
    staffProfiles: user.staffProfiles.map((profile) => ({
      id: profile.id,
      displayName: profile.displayName,
      businessLocation: profile.businessLocation
    }))
  };
}

async function loadAuthUser(userId: string) {
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
      staffProfiles: {
        include: {
          businessLocation: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      }
    }
  });

  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  return user;
}

async function createSessionTokens(input: {
  userId: string;
  appRole: AppRole;
  deviceName?: string;
  platform?: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + appConfig.auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  const session = await prisma.authSession.create({
    data: {
      userId: input.userId,
      refreshTokenHash,
      expiresAt,
      lastUsedAt: new Date(),
      deviceName: input.deviceName,
      platform: input.platform,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress
    }
  });

  const accessToken = createAccessToken({
    userId: input.userId,
    sessionId: session.id,
    appRole: input.appRole
  });

  return {
    accessToken,
    refreshToken,
    sessionId: session.id,
    accessTokenExpiresInSeconds: appConfig.auth.accessTokenTtlSeconds,
    refreshTokenExpiresAt: expiresAt.toISOString()
  };
}

function normalizeEmailIfPresent(value: string) {
  return isEmail(value) ? value.toLowerCase() : value;
}

function getLockoutExpiry() {
  return new Date(Date.now() + appConfig.auth.loginLockoutMinutes * 60 * 1000);
}

async function recordFailedLoginAttempt(input: {
  userId?: string;
  identifier: string;
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
  platform?: string;
  reason: "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED";
}) {
  if (!input.userId) {
    await recordAuthAuditEvent({
      type: AuthEventType.LOGIN_FAILED,
      identifier: input.identifier,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      deviceName: input.deviceName,
      platform: input.platform,
      metadata: {
        reason: input.reason
      }
    });

    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: input.userId
    }
  });

  if (!user) {
    await recordAuthAuditEvent({
      type: AuthEventType.LOGIN_FAILED,
      identifier: input.identifier,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      deviceName: input.deviceName,
      platform: input.platform,
      metadata: {
        reason: input.reason
      }
    });

    return null;
  }

  const shouldIncrement = input.reason === "INVALID_CREDENTIALS";
  const nextAttempts = shouldIncrement ? user.failedLoginAttempts + 1 : user.failedLoginAttempts;
  const shouldLock = shouldIncrement && nextAttempts >= appConfig.auth.loginMaxFailedAttempts;
  const lockedUntil = shouldLock ? getLockoutExpiry() : user.lockedUntil;

  const updatedUser = shouldIncrement
    ? await prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          failedLoginAttempts: nextAttempts,
          lockedUntil
        }
      })
    : user;

  if (shouldIncrement && updatedUser.failedLoginAttempts >= Math.max(3, appConfig.auth.loginMaxFailedAttempts - 2)) {
    await createOrRefreshSecurityAlert({
      targetUserId: updatedUser.id,
      type: SecurityAlertType.REPEATED_LOGIN_FAILURES,
      severity: SecurityCaseSeverity.MEDIUM,
      title: "Repeated login failures detected",
      summary: "The account has multiple recent failed login attempts and may need review.",
      metadata: {
        failedLoginAttempts: updatedUser.failedLoginAttempts,
        ipAddress: input.ipAddress ?? null,
        deviceName: input.deviceName ?? null,
        platform: input.platform ?? null
      }
    });
  }

  if (updatedUser.lockedUntil && updatedUser.lockedUntil.getTime() > Date.now()) {
    await createOrRefreshSecurityAlert({
      targetUserId: updatedUser.id,
      type: SecurityAlertType.ACCOUNT_LOCKED,
      severity: SecurityCaseSeverity.HIGH,
      title: "Account lockout triggered",
      summary: "The account hit the failed-login threshold and has been temporarily locked.",
      metadata: {
        failedLoginAttempts: updatedUser.failedLoginAttempts,
        lockedUntil: updatedUser.lockedUntil.toISOString(),
        ipAddress: input.ipAddress ?? null,
        deviceName: input.deviceName ?? null,
        platform: input.platform ?? null
      }
    });
  }

  await recordAuthAuditEvent({
    userId: updatedUser.id,
    type: AuthEventType.LOGIN_FAILED,
    identifier: input.identifier,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    deviceName: input.deviceName,
    platform: input.platform,
    metadata: {
      reason: input.reason,
      failedLoginAttempts: updatedUser.failedLoginAttempts,
      lockedUntil: updatedUser.lockedUntil?.toISOString() ?? null
    }
  });

  return updatedUser;
}

function assertPasswordStrength(password: string) {
  const result = validatePasswordStrength(password);

  if (!result.ok) {
    throw ApiError.badRequest(result.errors[0] ?? "Password does not meet policy requirements.", {
      passwordPolicyErrors: result.errors
    });
  }
}

function clearLoginRateLimitForIdentifier(identifier: string, ipAddress?: string) {
  if (!ipAddress || !identifier) {
    return;
  }

  authRateLimitStore.reset(buildLoginRateLimitKey(ipAddress, identifier));
}

function clearLoginRateLimitForIdentifierAcrossIps(identifier?: string | null) {
  if (!identifier) {
    return;
  }

  authRateLimitStore.resetWhere((key) => key.startsWith("login:") && key.endsWith(`:${identifier}`));
}

function clearLoginRateLimitForUserIdentifiers(
  user: {
    email: string | null;
    phone: string | null;
  },
  ipAddress?: string
) {
  if (!ipAddress) {
    return;
  }

  if (user.email) {
    clearLoginRateLimitForIdentifier(user.email, ipAddress);
  }

  if (user.phone) {
    clearLoginRateLimitForIdentifier(user.phone, ipAddress);
  }
}

export function clearLoginRateLimitForUserAcrossIps(user: {
  email: string | null;
  phone: string | null;
}) {
  clearLoginRateLimitForIdentifierAcrossIps(user.email);
  clearLoginRateLimitForIdentifierAcrossIps(user.phone);
}

export async function loginWithPassword(
  input: {
    identifier: string;
    password: string;
    deviceName?: string;
    platform?: string;
  },
  context: {
    userAgent?: string;
    ipAddress?: string;
  }
) {
  const identifier = normalizeIdentifier(input.identifier);
  const normalizedIdentifier = normalizeEmailIfPresent(identifier);
  const user = await prisma.user.findFirst({
    where: isEmail(identifier) ? { email: normalizedIdentifier } : { phone: identifier }
  });

  if (!user || !user.passwordHash) {
    await recordFailedLoginAttempt({
      userId: user?.id,
      identifier: normalizedIdentifier,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceName: input.deviceName,
      platform: input.platform,
      reason: "INVALID_CREDENTIALS"
    });
    throw ApiError.badRequest("Invalid login credentials.");
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    await recordFailedLoginAttempt({
      userId: user.id,
      identifier: normalizedIdentifier,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceName: input.deviceName,
      platform: input.platform,
      reason: "ACCOUNT_LOCKED"
    });

    throw new ApiError(423, "Account is temporarily locked due to repeated failed login attempts.", "ACCOUNT_LOCKED", {
      lockedUntil: user.lockedUntil.toISOString()
    });
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash);

  if (!passwordValid) {
    const updatedUser = await recordFailedLoginAttempt({
      userId: user.id,
      identifier: normalizedIdentifier,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceName: input.deviceName,
      platform: input.platform,
      reason: "INVALID_CREDENTIALS"
    });

    if (updatedUser?.lockedUntil && updatedUser.lockedUntil.getTime() > Date.now()) {
      throw new ApiError(423, "Account is temporarily locked due to repeated failed login attempts.", "ACCOUNT_LOCKED", {
        lockedUntil: updatedUser.lockedUntil.toISOString()
      });
    }

    throw ApiError.badRequest("Invalid login credentials.");
  }

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null
    }
  });

  const authUser = await loadAuthUser(user.id);
  const tokens = await createSessionTokens({
    userId: authUser.id,
    appRole: authUser.appRole,
    deviceName: input.deviceName,
    platform: input.platform,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress
  });

  await recordAuthAuditEvent({
    userId: authUser.id,
    sessionId: tokens.sessionId,
    type: AuthEventType.LOGIN_SUCCEEDED,
    identifier: authUser.email ?? authUser.phone ?? normalizedIdentifier,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    deviceName: input.deviceName,
    platform: input.platform
  });

  await createNewDeviceLoginAlertIfNeeded({
    userId: authUser.id,
    sessionId: tokens.sessionId,
    deviceName: input.deviceName,
    platform: input.platform,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress
  });

  clearLoginRateLimitForIdentifier(normalizedIdentifier, context.ipAddress);

  return {
    user: serializeUser(authUser),
    tokens
  };
}

export async function refreshAuthSession(
  refreshToken: string,
  context?: {
    userAgent?: string;
    ipAddress?: string;
  }
) {
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const session = await prisma.authSession.findUnique({
    where: {
      refreshTokenHash
    },
    include: {
      user: true
    }
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    await recordAuthAuditEvent({
      userId: session?.userId,
      sessionId: session?.id,
      type: AuthEventType.REFRESH_FAILED,
      identifier: session?.user.email ?? session?.user.phone ?? undefined,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      deviceName: session?.deviceName ?? undefined,
      platform: session?.platform ?? undefined,
      metadata: {
        reason: !session ? "SESSION_NOT_FOUND" : session.revokedAt ? "SESSION_REVOKED" : "SESSION_EXPIRED"
      }
    });
    throw ApiError.conflict("Refresh session is no longer valid.");
  }

  const newRefreshToken = createRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
  const newExpiresAt = new Date(Date.now() + appConfig.auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  const updatedSession = await prisma.authSession.update({
    where: {
      id: session.id
    },
    data: {
      refreshTokenHash: newRefreshTokenHash,
      expiresAt: newExpiresAt,
      lastUsedAt: new Date()
    }
  });

  const authUser = await loadAuthUser(session.userId);
  const accessToken = createAccessToken({
    userId: authUser.id,
    sessionId: updatedSession.id,
    appRole: authUser.appRole
  });

  await recordAuthAuditEvent({
    userId: authUser.id,
    sessionId: updatedSession.id,
    type: AuthEventType.REFRESH_SUCCEEDED,
    identifier: authUser.email ?? authUser.phone ?? undefined,
    ipAddress: context?.ipAddress ?? session.ipAddress ?? undefined,
    userAgent: context?.userAgent ?? session.userAgent ?? undefined,
    deviceName: updatedSession.deviceName ?? undefined,
    platform: updatedSession.platform ?? undefined
  });

  return {
    user: serializeUser(authUser),
    tokens: {
      accessToken,
      refreshToken: newRefreshToken,
      sessionId: updatedSession.id,
      accessTokenExpiresInSeconds: appConfig.auth.accessTokenTtlSeconds,
      refreshTokenExpiresAt: newExpiresAt.toISOString()
    }
  };
}

export async function revokeAuthSession(
  refreshToken: string,
  context?: {
    userAgent?: string;
    ipAddress?: string;
  }
) {
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const session = await prisma.authSession.findUnique({
    where: {
      refreshTokenHash
    },
    include: {
      user: true
    }
  });

  await prisma.authSession.updateMany({
    where: {
      refreshTokenHash,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });

  if (session) {
    await recordAuthAuditEvent({
      userId: session.userId,
      sessionId: session.id,
      type: AuthEventType.LOGOUT_REFRESH_TOKEN,
      identifier: session.user.email ?? session.user.phone ?? undefined,
      ipAddress: context?.ipAddress ?? session.ipAddress ?? undefined,
      userAgent: context?.userAgent ?? session.userAgent ?? undefined,
      deviceName: session.deviceName ?? undefined,
      platform: session.platform ?? undefined
    });
  }

  return {
    revoked: true
  };
}

export async function revokeCurrentAuthSession(
  userId: string,
  sessionId: string,
  context?: {
    userAgent?: string;
    ipAddress?: string;
  }
) {
  const session = await prisma.authSession.findFirst({
    where: {
      id: sessionId,
      userId
    },
    include: {
      user: true
    }
  });

  if (!session) {
    throw ApiError.notFound("Session not found.");
  }

  await prisma.authSession.updateMany({
    where: {
      id: sessionId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });

  await recordAuthAuditEvent({
    userId,
    sessionId,
    type: AuthEventType.LOGOUT_CURRENT,
    identifier: session.user.email ?? session.user.phone ?? undefined,
    ipAddress: context?.ipAddress ?? session.ipAddress ?? undefined,
    userAgent: context?.userAgent ?? session.userAgent ?? undefined,
    deviceName: session.deviceName ?? undefined,
    platform: session.platform ?? undefined
  });
}

export async function getCurrentAuthUser(userId: string) {
  const user = await loadAuthUser(userId);
  return serializeUser(user);
}

function serializeSession(session: {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  userAgent: string | null;
  ipAddress: string | null;
  deviceName: string | null;
  platform: string | null;
}) {
  return {
    id: session.id,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    revokedAt: session.revokedAt?.toISOString() ?? null,
    lastUsedAt: session.lastUsedAt?.toISOString() ?? null,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    deviceName: session.deviceName,
    platform: session.platform
  };
}

export async function listAuthSessions(userId: string, currentSessionId?: string) {
  const sessions = await prisma.authSession.findMany({
    where: {
      userId
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return sessions.map((session) => ({
    ...serializeSession(session),
    isCurrent: session.id === currentSessionId
  }));
}

export async function revokeOwnedSession(
  userId: string,
  sessionId: string,
  context?: {
    userAgent?: string;
    ipAddress?: string;
  }
) {
  const session = await prisma.authSession.findFirst({
    where: {
      id: sessionId,
      userId
    },
    include: {
      user: true
    }
  });

  if (!session) {
    throw ApiError.notFound("Session not found.");
  }

  await prisma.authSession.update({
    where: {
      id: session.id
    },
    data: {
      revokedAt: new Date()
    }
  });

  await recordAuthAuditEvent({
    userId,
    sessionId: session.id,
    type: AuthEventType.SESSION_REVOKED,
    identifier: session.user.email ?? session.user.phone ?? undefined,
    ipAddress: context?.ipAddress ?? session.ipAddress ?? undefined,
    userAgent: context?.userAgent ?? session.userAgent ?? undefined,
    deviceName: session.deviceName ?? undefined,
    platform: session.platform ?? undefined
  });

  return {
    revoked: true,
    sessionId
  };
}

export async function revokeOtherOwnedSessions(
  userId: string,
  currentSessionId: string,
  context?: {
    userAgent?: string;
    ipAddress?: string;
  }
) {
  const currentSession = await prisma.authSession.findFirst({
    where: {
      id: currentSessionId,
      userId
    },
    include: {
      user: true
    }
  });

  if (!currentSession) {
    throw ApiError.notFound("Current session not found.");
  }

  const result = await prisma.authSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      id: {
        not: currentSessionId
      }
    },
    data: {
      revokedAt: new Date()
    }
  });

  await recordAuthAuditEvent({
    userId,
    sessionId: currentSessionId,
    type: AuthEventType.LOGOUT_OTHER_SESSIONS,
    identifier: currentSession.user.email ?? currentSession.user.phone ?? undefined,
    ipAddress: context?.ipAddress ?? currentSession.ipAddress ?? undefined,
    userAgent: context?.userAgent ?? currentSession.userAgent ?? undefined,
    deviceName: currentSession.deviceName ?? undefined,
    platform: currentSession.platform ?? undefined,
    metadata: {
      revokedSessionsCount: result.count
    }
  });

  return {
    revoked: true,
    revokedSessionsCount: result.count
  };
}

export async function listOwnAuthActivity(userId: string, limit = 25) {
  return listAuthAuditEvents(userId, limit);
}

function createPasswordResetToken() {
  return createRefreshToken();
}

function hashPasswordResetToken(token: string) {
  return hashRefreshToken(token);
}

function buildPasswordResetUrl(token: string) {
  return `${appConfig.appBaseUrl}/reset-password/${token}`;
}

export async function requestPasswordReset(
  identifier: string,
  context: {
    userAgent?: string;
    ipAddress?: string;
  }
) {
  const normalized = normalizeIdentifier(identifier);
  const normalizedIdentifier = normalizeEmailIfPresent(normalized);
  const user = await prisma.user.findFirst({
    where: isEmail(normalized) ? { email: normalizedIdentifier } : { phone: normalized }
  });

  await recordAuthAuditEvent({
    userId: user?.id,
    type: AuthEventType.PASSWORD_RESET_REQUESTED,
    identifier: normalizedIdentifier,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });

  if (!user) {
    return {
      message: "If the account exists, a password reset link has been prepared."
    };
  }

  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      consumedAt: null
    },
    data: {
      consumedAt: new Date()
    }
  });

  const rawToken = createPasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + appConfig.auth.passwordResetTtlMinutes * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      requestedIp: context.ipAddress,
      userAgent: context.userAgent
    }
  });

  return {
    message: "If the account exists, a password reset link has been prepared.",
    resetTokenPreview: appConfig.env === "production" ? undefined : rawToken,
    resetUrlPreview: appConfig.env === "production" ? undefined : buildPasswordResetUrl(rawToken)
  };
}

export async function resetPasswordWithToken(
  token: string,
  password: string,
  context?: {
    userAgent?: string;
    ipAddress?: string;
  }
) {
  assertPasswordStrength(password);

  const tokenHash = hashPasswordResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash
    },
    include: {
      user: true
    }
  });

  if (!resetToken) {
    throw ApiError.notFound("Password reset token not found.");
  }

  if (resetToken.consumedAt) {
    throw ApiError.conflict("Password reset token has already been used.");
  }

  if (resetToken.expiresAt.getTime() <= Date.now()) {
    throw ApiError.conflict("Password reset token has expired.");
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: resetToken.userId
      },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });

    await tx.passwordResetToken.update({
      where: {
        id: resetToken.id
      },
      data: {
        consumedAt: now
      }
    });

    await tx.authSession.updateMany({
      where: {
        userId: resetToken.userId,
        revokedAt: null
      },
      data: {
        revokedAt: now
      }
    });

    await recordAuthAuditEvent(
      {
        userId: resetToken.userId,
        type: AuthEventType.PASSWORD_RESET_COMPLETED,
        identifier: resetToken.user.email ?? resetToken.user.phone ?? undefined,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent
      },
      tx
    );
  });

  clearLoginRateLimitForUserIdentifiers(resetToken.user, context?.ipAddress);

  return {
    reset: true,
    revokedSessions: true
  };
}
