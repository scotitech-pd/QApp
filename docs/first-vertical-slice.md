# First Vertical Slice

## Purpose

This spec defines the smallest end-to-end path that proves Q-App's core loop works. It is the exit gate for Phase 0 and the entry gate for Phase 1 (see [Product Roadmap](./product-roadmap.md)).

If this slice runs cleanly against a real Postgres with real Twilio, the product core is real.

## The Eight Steps

1. **A business signs up** with owner details and confirms map pin.
2. **An admin approves** the business.
3. **A customer discovers** the shop on the nearby list and opens its detail page.
4. **The customer joins the queue** with name + phone and completes OTP verification.
5. **Staff sees** the customer appear in the live ops dashboard within 2 seconds.
6. **Staff calls next** when the customer's turn arrives.
7. **The customer answers `Are you coming?`** with Yes; the ops dashboard reflects it.
8. **Staff starts and completes service.** Both surfaces reach a terminal state.

## Actors and Surfaces

| Actor | Surface | Auth |
|---|---|---|
| Business owner (signup) | `apps/web/app/business/signup` | Public form |
| Platform admin | `apps/web/app/admin/business-signups` | Platform admin session |
| Shop staff | `apps/web/app/ops/shops/[slug]` | Staff session (membership) |
| Customer | `apps/web/app/shops` → `[slug]` → `queue/[trackingToken]` | Anonymous, tracking token in URL |

## Endpoint Mapping

### Step 1 — Signup with map pin
- `POST /v1/business-signups` — exists (`business-signups-router.ts:34`)
- Requires `latitude` + `longitude`. **Slice acceptance**: submitting without lat/long is rejected.

### Step 2 — Admin approval
- `GET /v1/business-signups` — exists
- `POST /v1/business-signups/:id/approve` — exists
- **Slice acceptance**: after approval, the resulting `BusinessLocation` is `LIVE` and appears in `/v1/shops` for anonymous callers.

### Step 3 — Discovery
- `GET /v1/shops` — exists
- `GET /v1/shops/:slug` — exists
- **Slice acceptance**: unauthenticated request returns the shop with a live wait estimate.

### Step 4 — Join with OTP
- `POST /v1/queue/join/start` — exists (creates `VerificationChallenge`, sends OTP via Twilio or preview)
- `POST /v1/queue/join/verify` — exists (creates `Visit` + `QueueEntry`, returns `trackingToken`)
- **Slice acceptance**: with `SMS_PREVIEW=1` the OTP is returned in the response and the verify call succeeds; with real Twilio creds the OTP is delivered to the phone.

### Step 5 — Realtime dashboard update
- `GET /v1/ops/shops/:slug/dashboard` — exists
- Socket.IO: client emits `shop:watch <slug>`, server emits `shop:updated` on any queue mutation.
- **Slice acceptance**: from the moment `join/verify` returns to the moment `queue-dashboard-client.tsx` shows the row, elapsed ≤ 2 seconds on localhost.

### Step 6 — Call next
- `POST /v1/ops/shops/:slug/queue/:trackingToken/call` — exists
- Emits `queue:updated` on the customer's tracking token room.
- **Slice acceptance**: the customer's `queue-status-client.tsx` transitions to a "you're up — are you coming?" state without a manual refresh.

### Step 7 — Arrival response loop
- `POST /v1/queue/status/:trackingToken/respond-arrival` with `{ status: "COMING" | "REMOVE" }` — exists
- Ops-side reinstate: `POST /v1/ops/shops/:slug/queue/:trackingToken/reinstate` — exists
- Auto-promotion on timeout: handled in `queue-lifecycle.ts` (`ArrivalResponseStatus.EXPIRED` path).
- **Slice acceptance**:
  - `COMING` → confirmation visible on dashboard within 2 seconds.
  - `REMOVE` → the customer is dropped, the next customer is promoted, and the removed customer's status page shows a terminal "you left the queue" state.
  - No response → after the configured timeout the customer is expired and the next is promoted automatically.

### Step 8 — Start and complete service
- `POST /v1/ops/shops/:slug/queue/:trackingToken/start-service` — exists
- `POST /v1/ops/shops/:slug/visits/:visitId/complete-service` — exists
- **Slice acceptance**: the customer's status page ends on a "thanks, you were served" terminal state and the ops dashboard removes the row.

## Gaps to Close Before This Slice Is Green

These are the concrete deltas between what exists today and what this spec requires. Everything else is polish.

### G1 — Missing: manual queue reorder
- **Why**: MVP backlog Epic 3 story "reorder the queue when needed" has no endpoint.
- **Endpoint to add**: `POST /v1/ops/shops/:slug/queue/reorder` with `{ trackingTokens: string[] }` (canonical order).
- **Constraint**: only affects rows in `QUEUED`/`CONFIRMATION_PENDING` states; `CALLED`/`IN_SERVICE` are not reorderable.
- **Emits**: `shop:updated`.

### G2 — Missing: admin "suspend business" and "view location activity"
- `POST /v1/admin/business-locations/:id/suspend` and `/unsuspend` (sets `LocationStatus.SUSPENDED`).
- `GET /v1/admin/business-locations/:id/activity` returning the latest N `OperationalEvent`s and current queue snapshot.

### G3 — Undefined: ETA recalculation policy
- Recalculation happens today inside `queue-lifecycle.ts` but the "meaningful delay only" rule is not written down.
- **Policy to record here** (baseline; revisit after Phase 1 data):
  - Recalculate on: walk-in added, service started late (> 5 min past ETA), service extended, customer removed/expired.
  - Notify a customer only when their ETA shifts by **≥ 8 minutes** OR their position changes.
  - Never send more than **1 delay notification per 15 minutes** per customer.
- **Endpoint**: internal recalculation is fine; no new public endpoint required.

### G4 — Missing: test harness
- No automated tests exist for the queue lifecycle. Before we ship this slice to real shops we need at least:
  - Integration test: join → verify → call → COMING → start → complete.
  - Integration test: join → verify → call → REMOVE → next promoted.
  - Integration test: join → verify → call → timeout → EXPIRED → next promoted.
- Recommendation: Vitest + a Postgres test container, tests live in `apps/api/src/**/__tests__`.

### G5 — Hardening: CORS and Socket.IO auth
- `app.ts` uses default `cors()` (allows any origin).
- `realtime.ts` uses `origin: "*"`.
- Before pilot, both must move to an allow-list from `appConfig` and Socket.IO connections must be gated by a signed handshake token (staff sessions for `shop:watch`, tracking token for `queue:watch`).

### G6 — Doc hygiene
- `docs/architecture-foundation.md` and `docs/realtime-contract.md` link to `realtime.ts` with an absolute local path (`/Users/pradeepdahiya/Documents/AppQ/…`). Replace with a repo-relative path.
- `docs/product-roadmap.md` was previously empty; now populated. Keep it authoritative.

## Acceptance Checklist

The slice is green when all of these are true against a seeded dev environment:

- [ ] `npm run seed:demo` produces an admin, a pending signup, and one existing LIVE shop with services.
- [ ] Business signup form rejects submission with no map pin.
- [ ] Admin approval flips the signup to a LIVE `BusinessLocation`.
- [ ] Anonymous `GET /v1/shops` returns the approved location.
- [ ] `POST /v1/queue/join/start` + `/verify` produces a tracking token; `queue/[trackingToken]` renders live status.
- [ ] Ops dashboard shows the new row within 2 seconds without manual refresh.
- [ ] `call` transitions the customer surface to the arrival prompt.
- [ ] `COMING` → dashboard reflects it; `REMOVE` → next promoted; timeout → next promoted.
- [ ] `start-service` and `complete-service` reach terminal states on both surfaces.
- [ ] Manual reorder endpoint (G1) is implemented and tested.
- [ ] G4 tests pass in CI.
- [ ] G5 CORS + socket auth changes are in place.

## Out of Scope for This Slice

Explicitly not required to close the slice:

- Booking / reservations.
- Payments.
- Multi-industry theming.
- WhatsApp / FCM.
- Analytics beyond the operational dashboard.
- Setup checklist gate before going LIVE (that is a Phase 2 story).
- The customer preference profile and favorites (already scaffolded; not on the critical path).

## Next Step After Sign-off

Implement the gaps in order **G6 → G1 → G3 → G4 → G2 → G5**. G6 is trivial hygiene and clears the docs. G1 unblocks operator trust. G3 is a written policy, not code. G4 is the safety net before any further behavior change. G2 rounds out admin. G5 gates production.
