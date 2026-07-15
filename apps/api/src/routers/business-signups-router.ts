import { ApprovalStatus } from "@prisma/client";
import { Router } from "express";

import { ApiError } from "../core/api-error";
import { asyncHandler, getPathParam, sendItem, sendItems } from "../core/http";
import { requireAuthenticatedUser, requirePlatformAdmin } from "../middleware/authentication";
import {
  approveBusinessSignup,
  createBusinessSignupRecord,
  listBusinessSignups,
  rejectBusinessSignup,
  validateBusinessSignupInput
} from "../business-signups";

export function createBusinessSignupsRouter() {
  const router = Router();

  router.get(
    "/business-signups",
    requireAuthenticatedUser,
    requirePlatformAdmin,
    asyncHandler(async (req, res) => {
      const requestedStatus = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
      const status =
        requestedStatus && requestedStatus in ApprovalStatus
          ? ApprovalStatus[requestedStatus as keyof typeof ApprovalStatus]
          : undefined;

      const items = await listBusinessSignups(status);
      sendItems(res, items);
    })
  );

  router.post(
    "/business-signups",
    asyncHandler(async (req, res) => {
      const parsed = validateBusinessSignupInput(req.body);

      if (!parsed.ok) {
        throw ApiError.badRequest(parsed.error);
      }

      const item = await createBusinessSignupRecord(parsed.data);
      sendItem(res, item, 201);
    })
  );

  router.post(
    "/business-signups/:id/approve",
    requireAuthenticatedUser,
    requirePlatformAdmin,
    asyncHandler(async (req, res) => {
      const item = await approveBusinessSignup(getPathParam(req.params.id));
      sendItem(res, item);
    })
  );

  router.post(
    "/business-signups/:id/reject",
    requireAuthenticatedUser,
    requirePlatformAdmin,
    asyncHandler(async (req, res) => {
      const item = await rejectBusinessSignup(
        getPathParam(req.params.id),
        typeof req.body?.reason === "string" ? req.body.reason : undefined
      );
      sendItem(res, item);
    })
  );

  return router;
}
