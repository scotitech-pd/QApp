import { MembershipRole } from "@prisma/client";
import { Router } from "express";

import { ApiError } from "../core/api-error";
import { asyncHandler, getPathParam, sendItem } from "../core/http";
import { requireAuthenticatedUser, requireBusinessRoles } from "../middleware/authentication";
import {
  addWalkInCustomer,
  callNextCustomer,
  completeService,
  extendService,
  getQueueDashboard,
  getShopProfile,
  pauseQueue,
  releaseQueueNoShow,
  reinstateMissedCustomer,
  resumeQueue,
  startService,
  validateAddWalkInInput,
  validateQueuePauseInput,
  validateReleaseNoShowInput,
  validateReinstateMissedInput,
  validateServiceExtensionInput,
  validateShopProfileInput,
  updateShopProfile
} from "../operations";

export function createOperationsRouter() {
  const router = Router();
  const requireOpsAccess = [
    requireAuthenticatedUser,
    requireBusinessRoles([MembershipRole.OWNER, MembershipRole.MANAGER, MembershipRole.STAFF_OPERATOR])
  ] as const;
  const requireProfileAccess = [
    requireAuthenticatedUser,
    requireBusinessRoles([MembershipRole.OWNER, MembershipRole.MANAGER])
  ] as const;

  router.get(
    "/ops/shops/:slug/dashboard",
    ...requireOpsAccess,
    asyncHandler(async (req, res) => {
      const item = await getQueueDashboard(getPathParam(req.params.slug));
      sendItem(res, item);
    })
  );

  router.get(
    "/ops/shops/:slug/profile",
    ...requireProfileAccess,
    asyncHandler(async (req, res) => {
      const item = await getShopProfile(getPathParam(req.params.slug));
      sendItem(res, item);
    })
  );

  router.put(
    "/ops/shops/:slug/profile",
    ...requireProfileAccess,
    asyncHandler(async (req, res) => {
      const parsed = validateShopProfileInput(req.body);

      if (!parsed.ok) {
        throw ApiError.badRequest(parsed.error);
      }

      const item = await updateShopProfile(getPathParam(req.params.slug), parsed.data);
      sendItem(res, item);
    })
  );

  router.post(
    "/ops/shops/:slug/walk-ins",
    ...requireOpsAccess,
    asyncHandler(async (req, res) => {
      const parsed = validateAddWalkInInput(req.body);

      if (!parsed.ok) {
        throw ApiError.badRequest(parsed.error);
      }

      const item = await addWalkInCustomer(getPathParam(req.params.slug), parsed.data);
      sendItem(res, item, 201);
    })
  );

  router.post(
    "/ops/shops/:slug/pause-queue",
    ...requireOpsAccess,
    asyncHandler(async (req, res) => {
      const parsed = validateQueuePauseInput(req.body);
      const item = await pauseQueue(getPathParam(req.params.slug), parsed.data.reason);
      sendItem(res, item);
    })
  );

  router.post(
    "/ops/shops/:slug/resume-queue",
    ...requireOpsAccess,
    asyncHandler(async (req, res) => {
      const item = await resumeQueue(getPathParam(req.params.slug));
      sendItem(res, item);
    })
  );

  router.post(
    "/ops/shops/:slug/queue/:trackingToken/call",
    ...requireOpsAccess,
    asyncHandler(async (req, res) => {
      const item = await callNextCustomer(getPathParam(req.params.slug), getPathParam(req.params.trackingToken));
      sendItem(res, item);
    })
  );

  router.post(
    "/ops/shops/:slug/queue/:trackingToken/start-service",
    ...requireOpsAccess,
    asyncHandler(async (req, res) => {
      const item = await startService(getPathParam(req.params.slug), getPathParam(req.params.trackingToken));
      sendItem(res, item);
    })
  );

  router.post(
    "/ops/shops/:slug/queue/:trackingToken/release-no-show",
    ...requireOpsAccess,
    asyncHandler(async (req, res) => {
      const parsed = validateReleaseNoShowInput(req.body);
      const item = await releaseQueueNoShow(
        getPathParam(req.params.slug),
        getPathParam(req.params.trackingToken),
        parsed.data.reason
      );
      sendItem(res, item);
    })
  );

  router.post(
    "/ops/shops/:slug/queue/:trackingToken/reinstate",
    ...requireOpsAccess,
    asyncHandler(async (req, res) => {
      const parsed = validateReinstateMissedInput(req.body);
      const item = await reinstateMissedCustomer(
        getPathParam(req.params.slug),
        getPathParam(req.params.trackingToken),
        parsed.data.reason
      );
      sendItem(res, item);
    })
  );

  router.post(
    "/ops/shops/:slug/visits/:visitId/complete-service",
    ...requireOpsAccess,
    asyncHandler(async (req, res) => {
      const item = await completeService(getPathParam(req.params.slug), getPathParam(req.params.visitId));
      sendItem(res, item);
    })
  );

  router.post(
    "/ops/shops/:slug/visits/:visitId/extend-service",
    ...requireOpsAccess,
    asyncHandler(async (req, res) => {
      const parsed = validateServiceExtensionInput(req.body);

      if (!parsed.ok) {
        throw ApiError.badRequest(parsed.error);
      }

      const item = await extendService(getPathParam(req.params.slug), getPathParam(req.params.visitId), parsed.data);
      sendItem(res, item);
    })
  );

  return router;
}
