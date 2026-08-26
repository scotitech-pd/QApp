import { Router } from "express";

import { isExpoPushToken } from "../push";
import { isWebPushSubscription } from "../webpush";
import { prisma } from "../prisma";

import { ApiError } from "../core/api-error";
import { asyncHandler, getPathParam, sendItem } from "../core/http";
import { verifyCustomerToken } from "../customer-auth";
import {
  directQueueJoin,
  getQueueStatusByTrackingToken,
  leaveQueue,
  startQueueJoin,
  submitQueueFeedback,
  validateQueueFeedbackInput,
  validateQueueJoinStartInput,
  validateQueueJoinVerifyInput,
  validateQueueLeaveInput,
  verifyQueueJoin
} from "../queue";
import { respondToArrivalConfirmation, validateArrivalResponseInput } from "../operations";

export function createQueueRouter() {
  const router = Router();

  router.post(
    "/queue/join/start",
    asyncHandler(async (req, res) => {
      const parsed = validateQueueJoinStartInput(req.body);

      if (!parsed.ok) {
        throw ApiError.badRequest(parsed.error);
      }

      const item = await startQueueJoin(parsed.data);
      sendItem(res, item, 201);
    })
  );

  router.post(
    "/queue/join/verify",
    asyncHandler(async (req, res) => {
      const parsed = validateQueueJoinVerifyInput(req.body);

      if (!parsed.ok) {
        throw ApiError.badRequest(parsed.error);
      }

      const item = await verifyQueueJoin(parsed.data.challengeId, parsed.data.code);
      sendItem(res, item);
    })
  );

  router.post(
    "/queue/join/direct",
    asyncHandler(async (req, res) => {
      const auth = req.headers.authorization;
      const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
      const customerId = token ? verifyCustomerToken(token) : null;

      if (!customerId) {
        throw ApiError.unauthorized("Sign in to join directly.");
      }

      const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
      let guest: { firstName: string; mobileNumber: string } | undefined;
      if (body.forFirstName != null || body.forPhone != null) {
        const parsed = validateQueueJoinStartInput({
          shopSlug: "placeholder",
          firstName: body.forFirstName,
          mobileNumber: body.forPhone
        });
        if (!parsed.ok) {
          throw ApiError.badRequest(parsed.error);
        }
        guest = { firstName: parsed.data.firstName, mobileNumber: parsed.data.mobileNumber };
      }

      const shopSlug = typeof body.shopSlug === "string" ? body.shopSlug.trim().toLowerCase() : "";
      if (!shopSlug) {
        throw ApiError.badRequest("shopSlug is required.");
      }

      const item = await directQueueJoin(customerId, shopSlug, guest);
      sendItem(res, item, item.alreadyJoined ? 200 : 201);
    })
  );

  router.get(
    "/queue/status/:trackingToken",
    asyncHandler(async (req, res) => {
      const item = await getQueueStatusByTrackingToken(getPathParam(req.params.trackingToken));

      if (!item) {
        throw ApiError.notFound("Queue status not found.");
      }

      sendItem(res, item);
    })
  );

  router.post(
    "/queue/status/:trackingToken/respond-arrival",
    asyncHandler(async (req, res) => {
      const parsed = validateArrivalResponseInput(req.body);

      if (!parsed.ok) {
        throw ApiError.badRequest(parsed.error);
      }

      const item = await respondToArrivalConfirmation(getPathParam(req.params.trackingToken), parsed.data.response);
      sendItem(res, item);
    })
  );

  router.post(
    "/queue/status/:trackingToken/push-token",
    asyncHandler(async (req, res) => {
      const token = (req.body as Record<string, unknown> | undefined)?.token;

      if (!isExpoPushToken(token)) {
        throw ApiError.badRequest("A valid Expo push token is required.");
      }

      const entry = await prisma.queueEntry.findUnique({
        where: { trackingToken: getPathParam(req.params.trackingToken) },
        select: { id: true }
      });

      if (!entry) {
        throw ApiError.notFound("Queue status not found.");
      }

      await prisma.queueEntry.update({ where: { id: entry.id }, data: { pushToken: token } });
      sendItem(res, { registered: true });
    })
  );

  router.post(
    "/queue/status/:trackingToken/web-push",
    asyncHandler(async (req, res) => {
      const subscription = (req.body as Record<string, unknown> | undefined)?.subscription;

      if (!isWebPushSubscription(subscription)) {
        throw ApiError.badRequest("A valid Web Push subscription is required.");
      }

      const entry = await prisma.queueEntry.findUnique({
        where: { trackingToken: getPathParam(req.params.trackingToken) },
        select: { id: true }
      });

      if (!entry) {
        throw ApiError.notFound("Queue status not found.");
      }

      await prisma.queueEntry.update({ where: { id: entry.id }, data: { webPushSubscription: subscription } });
      sendItem(res, { registered: true });
    })
  );

  router.post(
    "/queue/status/:trackingToken/leave",
    asyncHandler(async (req, res) => {
      const parsed = validateQueueLeaveInput(req.body);
      const item = await leaveQueue(getPathParam(req.params.trackingToken), parsed.data);
      sendItem(res, item);
    })
  );

  router.post(
    "/queue/status/:trackingToken/feedback",
    asyncHandler(async (req, res) => {
      const parsed = validateQueueFeedbackInput(req.body);

      if (!parsed.ok) {
        throw ApiError.badRequest(parsed.error);
      }

      const item = await submitQueueFeedback(getPathParam(req.params.trackingToken), parsed.data);
      sendItem(res, item);
    })
  );

  return router;
}
