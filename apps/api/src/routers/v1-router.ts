import { Router } from "express";

import { createAdminSecurityRouter } from "./admin-security-router";
import { createAuthRouter } from "./auth-router";
import { createBusinessSignupsRouter } from "./business-signups-router";
import { createInvitationsRouter } from "./invitations-router";
import { createOperationsRouter } from "./operations-router";
import { createPreferencesRouter } from "./preferences-router";
import { createQueueRouter } from "./queue-router";
import { createShopsRouter } from "./shops-router";

export function createV1Router() {
  const router = Router();

  router.use(createAuthRouter());
  router.use(createAdminSecurityRouter());
  router.use(createBusinessSignupsRouter());
  router.use(createInvitationsRouter());
  router.use(createShopsRouter());
  router.use(createPreferencesRouter());
  router.use(createQueueRouter());
  router.use(createOperationsRouter());

  return router;
}
