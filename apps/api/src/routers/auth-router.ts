import { Router } from "express";

import {
  getCurrentAuthUser,
  listOwnAuthActivity,
  listAuthSessions,
  loginWithPassword,
  requestPasswordReset,
  revokeCurrentAuthSession,
  revokeOtherOwnedSessions,
  refreshAuthSession,
  resetPasswordWithToken,
  revokeAuthSession,
  revokeOwnedSession,
  validateLoginInput,
  validatePasswordResetConfirmInput,
  validatePasswordResetRequestInput,
  validateRefreshInput
} from "../auth";
import { ApiError } from "../core/api-error";
import { asyncHandler, getOptionalNumberQuery, sendItem } from "../core/http";
import { getAuthContext, requireAuthenticatedUser } from "../middleware/authentication";
import { buildLoginRateLimitKey, createRateLimit, getRequestIp } from "../middleware/rate-limit";

const loginRateLimit = createRateLimit({
  key: (req) =>
    buildLoginRateLimitKey(getRequestIp(req), typeof req.body?.identifier === "string" ? req.body.identifier : "unknown"),
  limit: 5,
  windowMs: 15 * 60 * 1000,
  code: "LOGIN_RATE_LIMITED",
  message: "Too many login attempts. Please try again later."
});

const refreshRateLimit = createRateLimit({
  key: (req) => `refresh:${getRequestIp(req)}`,
  limit: 20,
  windowMs: 15 * 60 * 1000,
  code: "REFRESH_RATE_LIMITED",
  message: "Too many token refresh attempts. Please try again later."
});

const passwordResetRequestRateLimit = createRateLimit({
  key: (req) =>
    `reset-request:${getRequestIp(req)}:${typeof req.body?.identifier === "string" ? req.body.identifier : "unknown"}`,
  limit: 5,
  windowMs: 30 * 60 * 1000,
  code: "PASSWORD_RESET_REQUEST_RATE_LIMITED",
  message: "Too many password reset requests. Please try again later."
});

const passwordResetConfirmRateLimit = createRateLimit({
  key: (req) => `reset-confirm:${getRequestIp(req)}`,
  limit: 8,
  windowMs: 30 * 60 * 1000,
  code: "PASSWORD_RESET_CONFIRM_RATE_LIMITED",
  message: "Too many password reset attempts. Please try again later."
});

export function createAuthRouter() {
  const router = Router();

  router.post(
    "/auth/login",
    loginRateLimit,
    asyncHandler(async (req, res) => {
      const parsed = validateLoginInput(req.body);

      if (!parsed.ok) {
        throw ApiError.badRequest(parsed.error);
      }

      const item = await loginWithPassword(parsed.data, {
        userAgent: req.header("user-agent") ?? undefined,
        ipAddress: req.ip
      });

      sendItem(res, item);
    })
  );

  router.post(
    "/auth/refresh",
    refreshRateLimit,
    asyncHandler(async (req, res) => {
      const parsed = validateRefreshInput(req.body);

      if (!parsed.ok) {
        throw ApiError.badRequest(parsed.error);
      }

      const item = await refreshAuthSession(parsed.data.refreshToken, {
        userAgent: req.header("user-agent") ?? undefined,
        ipAddress: req.ip
      });
      sendItem(res, item);
    })
  );

  router.post(
    "/auth/logout",
    asyncHandler(async (req, res) => {
      const parsed = validateRefreshInput(req.body);

      if (!parsed.ok) {
        throw ApiError.badRequest(parsed.error);
      }

      const item = await revokeAuthSession(parsed.data.refreshToken, {
        userAgent: req.header("user-agent") ?? undefined,
        ipAddress: req.ip
      });
      sendItem(res, item);
    })
  );

  router.post(
    "/auth/password-reset/request",
    passwordResetRequestRateLimit,
    asyncHandler(async (req, res) => {
      const parsed = validatePasswordResetRequestInput(req.body);

      if (!parsed.ok) {
        throw ApiError.badRequest(parsed.error);
      }

      const item = await requestPasswordReset(parsed.data.identifier, {
        userAgent: req.header("user-agent") ?? undefined,
        ipAddress: req.ip
      });

      sendItem(res, item);
    })
  );

  router.post(
    "/auth/password-reset/confirm",
    passwordResetConfirmRateLimit,
    asyncHandler(async (req, res) => {
      const parsed = validatePasswordResetConfirmInput(req.body);

      if (!parsed.ok) {
        throw ApiError.badRequest(parsed.error);
      }

      const item = await resetPasswordWithToken(parsed.data.token, parsed.data.password, {
        userAgent: req.header("user-agent") ?? undefined,
        ipAddress: req.ip
      });
      sendItem(res, item);
    })
  );

  router.get(
    "/auth/me",
    requireAuthenticatedUser,
    asyncHandler(async (_req, res) => {
      const auth = getAuthContext(res);

      if (!auth) {
        throw new ApiError(401, "Authentication required.", "UNAUTHORIZED");
      }

      const item = await getCurrentAuthUser(auth.userId);
      sendItem(res, item);
    })
  );

  router.get(
    "/auth/sessions",
    requireAuthenticatedUser,
    asyncHandler(async (_req, res) => {
      const auth = getAuthContext(res);

      if (!auth) {
        throw new ApiError(401, "Authentication required.", "UNAUTHORIZED");
      }

      const items = await listAuthSessions(auth.userId, auth.sessionId);
      res.json({
        data: items,
        items,
        meta: {
          count: items.length,
          requestId: res.locals.requestId
        }
      });
    })
  );

  router.get(
    "/auth/activity",
    requireAuthenticatedUser,
    asyncHandler(async (req, res) => {
      const auth = getAuthContext(res);

      if (!auth) {
        throw new ApiError(401, "Authentication required.", "UNAUTHORIZED");
      }

      const requestedLimit = getOptionalNumberQuery(req.query.limit);
      const items = await listOwnAuthActivity(auth.userId, requestedLimit ?? 25);
      res.json({
        data: items,
        items,
        meta: {
          count: items.length,
          requestId: res.locals.requestId
        }
      });
    })
  );

  router.post(
    "/auth/logout-current",
    requireAuthenticatedUser,
    asyncHandler(async (req, res) => {
      const auth = getAuthContext(res);

      if (!auth) {
        throw new ApiError(401, "Authentication required.", "UNAUTHORIZED");
      }

      await revokeCurrentAuthSession(auth.userId, auth.sessionId, {
        userAgent: req.header("user-agent") ?? undefined,
        ipAddress: req.ip
      });
      sendItem(res, { revoked: true });
    })
  );

  router.post(
    "/auth/logout-other-sessions",
    requireAuthenticatedUser,
    asyncHandler(async (req, res) => {
      const auth = getAuthContext(res);

      if (!auth) {
        throw new ApiError(401, "Authentication required.", "UNAUTHORIZED");
      }

      const item = await revokeOtherOwnedSessions(auth.userId, auth.sessionId, {
        userAgent: req.header("user-agent") ?? undefined,
        ipAddress: req.ip
      });
      sendItem(res, item);
    })
  );

  router.post(
    "/auth/sessions/:sessionId/revoke",
    requireAuthenticatedUser,
    asyncHandler(async (req, res) => {
      const auth = getAuthContext(res);

      if (!auth) {
        throw new ApiError(401, "Authentication required.", "UNAUTHORIZED");
      }

      const item = await revokeOwnedSession(
        auth.userId,
        typeof req.params.sessionId === "string" ? req.params.sessionId : "",
        {
          userAgent: req.header("user-agent") ?? undefined,
          ipAddress: req.ip
        }
      );
      sendItem(res, item);
    })
  );

  return router;
}
