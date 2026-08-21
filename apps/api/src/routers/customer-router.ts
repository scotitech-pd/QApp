import { Router, type Request } from "express";

import { ApiError } from "../core/api-error";
import { asyncHandler, sendItem } from "../core/http";
import {
  claimVisit,
  getCustomerHistory,
  getCustomerProfile,
  signInCustomer,
  verifyAppleIdentityToken,
  verifyCustomerToken,
  verifyGoogleIdToken
} from "../customer-auth";

function requireCustomer(req: Request) {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const customerId = token ? verifyCustomerToken(token) : null;
  if (!customerId) throw ApiError.unauthorized("Sign in to continue.");
  return customerId;
}

export function createCustomerRouter() {
  const router = Router();

  router.post(
    "/customer/auth/apple",
    asyncHandler(async (req, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      if (typeof body.identityToken !== "string") throw ApiError.badRequest("identityToken is required.");
      const identity = await verifyAppleIdentityToken(body.identityToken);
      const firstName = typeof body.firstName === "string" ? body.firstName : null;
      sendItem(res, await signInCustomer("apple", { ...identity, firstName }));
    })
  );

  router.post(
    "/customer/auth/google",
    asyncHandler(async (req, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      if (typeof body.idToken !== "string") throw ApiError.badRequest("idToken is required.");
      const identity = await verifyGoogleIdToken(body.idToken);
      sendItem(res, await signInCustomer("google", identity));
    })
  );

  router.get(
    "/customer/me",
    asyncHandler(async (req, res) => {
      sendItem(res, await getCustomerProfile(requireCustomer(req)));
    })
  );

  router.get(
    "/customer/me/history",
    asyncHandler(async (req, res) => {
      sendItem(res, await getCustomerHistory(requireCustomer(req)));
    })
  );

  router.post(
    "/customer/me/claim",
    asyncHandler(async (req, res) => {
      const customerId = requireCustomer(req);
      const trackingToken = (req.body as Record<string, unknown> | undefined)?.trackingToken;
      if (typeof trackingToken !== "string") throw ApiError.badRequest("trackingToken is required.");
      sendItem(res, await claimVisit(customerId, trackingToken));
    })
  );

  return router;
}
