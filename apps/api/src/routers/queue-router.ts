import { Router } from "express";

import { ApiError } from "../core/api-error";
import { asyncHandler, getPathParam, sendItem } from "../core/http";
import {
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
