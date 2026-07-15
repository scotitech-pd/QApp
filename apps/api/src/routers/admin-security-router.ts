import { AuthEventType, SecurityAlertStatus, SecurityAlertType, SecurityCaseSeverity, SecurityCaseStatus } from "@prisma/client";
import { Router } from "express";

import {
  addSecurityCaseNote,
  adminForcePasswordReset,
  adminRevokeAllUserSessions,
  adminUnlockUserAccount,
  createSecurityCase,
  getSecurityUser,
  getSecurityCase,
  listSecurityCases,
  listSecurityAuthActivity,
  listSecurityUsers,
  reopenSecurityCase,
  resolveSecurityCase
} from "../admin-security";
import { ApiError } from "../core/api-error";
import { asyncHandler, getOptionalNumberQuery, getPathParam, sendItem, sendItems } from "../core/http";
import { getAuthContext, requireAuthenticatedUser, requirePlatformAdmin } from "../middleware/authentication";
import {
  acknowledgeSecurityAlert,
  createSecurityCaseFromAlert,
  getSecurityAlert,
  listSecurityAlerts,
  resolveSecurityAlert
} from "../security-alerts";

function parseOptionalReason(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function parseRequiredText(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw ApiError.badRequest(`${label} is required.`);
  }

  return value.trim();
}

function parseSecurityCaseStatus(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const requestedStatus = value.toUpperCase();
  return requestedStatus in SecurityCaseStatus
    ? SecurityCaseStatus[requestedStatus as keyof typeof SecurityCaseStatus]
    : undefined;
}

function parseSecurityCaseSeverity(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const requestedSeverity = value.toUpperCase();
  return requestedSeverity in SecurityCaseSeverity
    ? SecurityCaseSeverity[requestedSeverity as keyof typeof SecurityCaseSeverity]
    : undefined;
}

function parseSecurityAlertStatus(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const requestedStatus = value.toUpperCase();
  return requestedStatus in SecurityAlertStatus
    ? SecurityAlertStatus[requestedStatus as keyof typeof SecurityAlertStatus]
    : undefined;
}

function parseSecurityAlertType(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const requestedType = value.toUpperCase();
  return requestedType in SecurityAlertType
    ? SecurityAlertType[requestedType as keyof typeof SecurityAlertType]
    : undefined;
}

export function createAdminSecurityRouter() {
  const router = Router();

  router.use("/admin/security", requireAuthenticatedUser, requirePlatformAdmin);

  router.get(
    "/admin/security/users",
    asyncHandler(async (req, res) => {
      const items = await listSecurityUsers({
        query: typeof req.query.q === "string" ? req.query.q : undefined,
        lockedOnly: req.query.lockedOnly === "true",
        limit: getOptionalNumberQuery(req.query.limit)
      });

      sendItems(res, items);
    })
  );

  router.get(
    "/admin/security/users/:userId",
    asyncHandler(async (req, res) => {
      const item = await getSecurityUser(getPathParam(req.params.userId));
      sendItem(res, item);
    })
  );

  router.post(
    "/admin/security/users/:userId/unlock",
    asyncHandler(async (req, res) => {
      const auth = getAuthContext(res)!;
      const item = await adminUnlockUserAccount(getPathParam(req.params.userId), auth.userId, parseOptionalReason(req.body?.reason));
      sendItem(res, item);
    })
  );

  router.post(
    "/admin/security/users/:userId/revoke-sessions",
    asyncHandler(async (req, res) => {
      const auth = getAuthContext(res)!;
      const item = await adminRevokeAllUserSessions(
        getPathParam(req.params.userId),
        auth.userId,
        parseOptionalReason(req.body?.reason)
      );
      sendItem(res, item);
    })
  );

  router.post(
    "/admin/security/users/:userId/force-password-reset",
    asyncHandler(async (req, res) => {
      const auth = getAuthContext(res)!;
      const item = await adminForcePasswordReset(
        getPathParam(req.params.userId),
        auth.userId,
        parseOptionalReason(req.body?.reason)
      );
      sendItem(res, item);
    })
  );

  router.get(
    "/admin/security/auth-activity",
    asyncHandler(async (req, res) => {
      const requestedType = typeof req.query.type === "string" ? req.query.type.toUpperCase() : undefined;
      const type =
        requestedType && requestedType in AuthEventType
          ? AuthEventType[requestedType as keyof typeof AuthEventType]
          : undefined;

      const items = await listSecurityAuthActivity({
        userId: typeof req.query.userId === "string" ? req.query.userId : undefined,
        identifier: typeof req.query.identifier === "string" ? req.query.identifier : undefined,
        type,
        limit: getOptionalNumberQuery(req.query.limit)
      });

      sendItems(res, items);
    })
  );

  router.get(
    "/admin/security/alerts",
    asyncHandler(async (req, res) => {
      const items = await listSecurityAlerts({
        userId: typeof req.query.userId === "string" ? req.query.userId : undefined,
        status: parseSecurityAlertStatus(req.query.status),
        severity: parseSecurityCaseSeverity(req.query.severity),
        type: parseSecurityAlertType(req.query.type),
        limit: getOptionalNumberQuery(req.query.limit)
      });

      sendItems(res, items);
    })
  );

  router.get(
    "/admin/security/alerts/:alertId",
    asyncHandler(async (req, res) => {
      const item = await getSecurityAlert(getPathParam(req.params.alertId));
      sendItem(res, item);
    })
  );

  router.post(
    "/admin/security/alerts/:alertId/acknowledge",
    asyncHandler(async (req, res) => {
      const auth = getAuthContext(res)!;
      const item = await acknowledgeSecurityAlert({
        alertId: getPathParam(req.params.alertId),
        actorUserId: auth.userId,
        note: parseOptionalReason(req.body?.note)
      });

      sendItem(res, item);
    })
  );

  router.post(
    "/admin/security/alerts/:alertId/resolve",
    asyncHandler(async (req, res) => {
      const auth = getAuthContext(res)!;
      const item = await resolveSecurityAlert({
        alertId: getPathParam(req.params.alertId),
        actorUserId: auth.userId,
        resolutionSummary: parseRequiredText(req.body?.resolutionSummary, "Resolution summary")
      });

      sendItem(res, item);
    })
  );

  router.post(
    "/admin/security/alerts/:alertId/create-case",
    asyncHandler(async (req, res) => {
      const auth = getAuthContext(res)!;
      const item = await createSecurityCaseFromAlert({
        alertId: getPathParam(req.params.alertId),
        actorUserId: auth.userId,
        assignedToUserId: parseOptionalReason(req.body?.assignedToUserId),
        title: parseOptionalReason(req.body?.title),
        summary: parseOptionalReason(req.body?.summary),
        initialNote: parseOptionalReason(req.body?.initialNote)
      });

      sendItem(res, item);
    })
  );

  router.get(
    "/admin/security/cases",
    asyncHandler(async (req, res) => {
      const items = await listSecurityCases({
        userId: typeof req.query.userId === "string" ? req.query.userId : undefined,
        assignedToUserId: typeof req.query.assignedToUserId === "string" ? req.query.assignedToUserId : undefined,
        status: parseSecurityCaseStatus(req.query.status),
        severity: parseSecurityCaseSeverity(req.query.severity),
        limit: getOptionalNumberQuery(req.query.limit)
      });

      sendItems(res, items);
    })
  );

  router.post(
    "/admin/security/cases",
    asyncHandler(async (req, res) => {
      const auth = getAuthContext(res)!;
      const item = await createSecurityCase({
        actorUserId: auth.userId,
        targetUserId: parseRequiredText(req.body?.targetUserId, "Target user id"),
        assignedToUserId: parseOptionalReason(req.body?.assignedToUserId),
        title: parseRequiredText(req.body?.title, "Title"),
        summary: parseOptionalReason(req.body?.summary),
        initialNote: parseOptionalReason(req.body?.initialNote),
        severity: parseSecurityCaseSeverity(req.body?.severity) ?? SecurityCaseSeverity.MEDIUM
      });

      sendItem(res, item, 201);
    })
  );

  router.get(
    "/admin/security/cases/:caseId",
    asyncHandler(async (req, res) => {
      const item = await getSecurityCase(getPathParam(req.params.caseId));
      sendItem(res, item);
    })
  );

  router.post(
    "/admin/security/cases/:caseId/notes",
    asyncHandler(async (req, res) => {
      const auth = getAuthContext(res)!;
      const item = await addSecurityCaseNote({
        caseId: getPathParam(req.params.caseId),
        actorUserId: auth.userId,
        body: parseRequiredText(req.body?.body, "Note body")
      });

      sendItem(res, item);
    })
  );

  router.post(
    "/admin/security/cases/:caseId/resolve",
    asyncHandler(async (req, res) => {
      const auth = getAuthContext(res)!;
      const item = await resolveSecurityCase({
        caseId: getPathParam(req.params.caseId),
        actorUserId: auth.userId,
        resolutionSummary: parseRequiredText(req.body?.resolutionSummary, "Resolution summary")
      });

      sendItem(res, item);
    })
  );

  router.post(
    "/admin/security/cases/:caseId/reopen",
    asyncHandler(async (req, res) => {
      const auth = getAuthContext(res)!;
      const item = await reopenSecurityCase({
        caseId: getPathParam(req.params.caseId),
        actorUserId: auth.userId,
        note: parseOptionalReason(req.body?.note)
      });

      sendItem(res, item);
    })
  );

  return router;
}
