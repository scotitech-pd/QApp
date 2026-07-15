import { MembershipRole } from "@prisma/client";
import { Router } from "express";

import { ApiError } from "../core/api-error";
import { asyncHandler, getPathParam, sendItem, sendItems } from "../core/http";
import {
  acceptInvitationByToken,
  createBusinessInvitation,
  getInvitationByToken,
  listBusinessInvitations,
  validateAcceptInvitationInput,
  validateCreateInvitationInput
} from "../invitations";
import { getAuthContext, requireAuthenticatedUser, requireBusinessRoles } from "../middleware/authentication";

export function createInvitationsRouter() {
  const router = Router();
  const requireInvitationManagement = [
    requireAuthenticatedUser,
    requireBusinessRoles([MembershipRole.OWNER, MembershipRole.MANAGER])
  ] as const;

  router.get(
    "/auth/invitations/:token",
    asyncHandler(async (req, res) => {
      const item = await getInvitationByToken(getPathParam(req.params.token));
      sendItem(res, item);
    })
  );

  router.post(
    "/auth/invitations/:token/accept",
    asyncHandler(async (req, res) => {
      const parsed = validateAcceptInvitationInput(req.body);

      if (!parsed.ok) {
        throw ApiError.badRequest(parsed.error);
      }

      const item = await acceptInvitationByToken(getPathParam(req.params.token), parsed.data);
      sendItem(res, item);
    })
  );

  router.get(
    "/ops/shops/:slug/invitations",
    ...requireInvitationManagement,
    asyncHandler(async (req, res) => {
      const items = await listBusinessInvitations(getPathParam(req.params.slug));
      sendItems(res, items);
    })
  );

  router.post(
    "/ops/shops/:slug/invitations",
    ...requireInvitationManagement,
    asyncHandler(async (req, res) => {
      const parsed = validateCreateInvitationInput(req.body);

      if (!parsed.ok) {
        throw ApiError.badRequest(parsed.error);
      }

      const auth = getAuthContext(res);

      if (!auth) {
        throw new ApiError(401, "Authentication required.", "UNAUTHORIZED");
      }

      const item = await createBusinessInvitation(getPathParam(req.params.slug), auth.userId, parsed.data);
      sendItem(res, item, 201);
    })
  );

  return router;
}
