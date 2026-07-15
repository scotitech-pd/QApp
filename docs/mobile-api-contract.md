# Q-App Mobile API Contract v1

## Purpose

This document defines the mobile-facing HTTP contract for Q-App.

It is the working reference for:

- future iOS customer app
- future Android customer app
- future iOS barber/operator app
- future Android barber/operator app
- any mobile-first BFF or SDK layer built on top of the current API

It describes the current `v1` route surface, the shared response rules, and the stability expectations mobile clients can rely on.

## Scope

This contract covers:

- public discovery and queue endpoints
- mobile authentication and session endpoints
- operator/business endpoints needed by a future barber app
- invitation onboarding flows used by business staff

This contract does not treat these as public mobile endpoints:

- internal platform-admin security and support routes
- non-production preview fields such as OTP preview codes or reset-token preview values

## Base Rules

### Base URL

- local development example: `http://127.0.0.1:4000`
- versioned API prefix: `/v1`

Example:

- `GET /v1/shops`
- `POST /v1/auth/login`

### Transport

- JSON request and response bodies
- UTF-8 text encoding
- HTTPS required outside local development

### Authentication

Protected routes require:

- `Authorization: Bearer <accessToken>`

Mobile auth flow:

1. Login with identifier and password
2. Store access token and refresh token securely
3. Send access token on protected requests
4. Use refresh token on `POST /v1/auth/refresh` when access token expires
5. Revoke session on logout

### Request Tracing

Every response includes:

- `meta.requestId`

Clients should log this when showing support-facing error screens.

## Shared Response Contract

### Single Item Responses

Successful single-item responses use:

```json
{
  "data": {},
  "item": {},
  "meta": {
    "requestId": "uuid"
  }
}
```

`data` and `item` currently contain the same payload. Mobile clients should read `data`.

### List Responses

Successful list responses use:

```json
{
  "data": [],
  "items": [],
  "meta": {
    "count": 2,
    "requestId": "uuid"
  }
}
```

Mobile clients should read `data`.

### Error Responses

Error responses use:

```json
{
  "error": "Human-readable message.",
  "code": "MACHINE_CODE",
  "details": {},
  "meta": {
    "requestId": "uuid"
  }
}
```

`details` is optional.

## Shared Identifier Rules

- `id`: opaque UUID-like primary key, never parse meaning from it
- `slug`: stable business/location identifier intended for public route lookup
- `trackingToken`: customer queue-tracking token, safe to use as queue-status route key
- `sessionId`: auth session identifier

## Auth Contract

### `POST /v1/auth/login`

Purpose:

- create a user session for mobile customer/business/admin accounts

Request body:

```json
{
  "identifier": "owner@fadeyard.demo",
  "password": "QappOwner123!",
  "deviceName": "iPhone 16 Pro",
  "platform": "ios"
}
```

Response shape:

- `data.user`
- `data.tokens.accessToken`
- `data.tokens.refreshToken`
- `data.tokens.sessionId`
- `data.tokens.accessTokenExpiresInSeconds`
- `data.tokens.refreshTokenExpiresAt`

User object currently includes:

- `id`
- `appRole`
- `firstName`
- `lastName`
- `email`
- `phone`
- `memberships[]`
- `staffProfiles[]`

Important error codes:

- `BAD_REQUEST`
- `ACCOUNT_LOCKED`
- `LOGIN_RATE_LIMITED`

### `POST /v1/auth/refresh`

Request body:

```json
{
  "refreshToken": "opaque-token"
}
```

Response:

- same `user + tokens` envelope shape as login

### `POST /v1/auth/logout`

Request body:

```json
{
  "refreshToken": "opaque-token"
}
```

Response:

```json
{
  "data": {
    "revoked": true
  }
}
```

### `GET /v1/auth/me`

Protected.

Use this to hydrate the logged-in mobile app shell after token restore.

### `GET /v1/auth/sessions`

Protected.

Current response fields per session:

- `id`
- `createdAt`
- `expiresAt`
- `revokedAt`
- `lastUsedAt`
- `userAgent`
- `ipAddress`
- `deviceName`
- `platform`
- `isCurrent`

### `GET /v1/auth/activity`

Protected.

Returns the authenticated user’s recent security-relevant activity.

### `POST /v1/auth/logout-current`

Protected.

Revokes the current access-token session.

### `POST /v1/auth/logout-other-sessions`

Protected.

Revokes every other active session for the authenticated user.

### `POST /v1/auth/sessions/:sessionId/revoke`

Protected.

Revokes one specific session owned by the authenticated user.

### `POST /v1/auth/password-reset/request`

Public.

Request body:

```json
{
  "identifier": "owner@fadeyard.demo"
}
```

Production contract:

- always return a neutral success message

Development-only note:

- local/non-production may include preview token fields for testing
- mobile production clients must not depend on those preview fields

### `POST /v1/auth/password-reset/confirm`

Public.

Request body:

```json
{
  "token": "opaque-reset-token",
  "password": "QappOwnerReset123!"
}
```

Password policy currently requires:

- minimum `10` characters
- lowercase
- uppercase
- number
- symbol

## Customer App Contract

### `GET /v1/shops`

Purpose:

- discover public live shops

Query params:

- optional `latitude`
- optional `longitude`
- optional `limit`

Headers:

- optional `X-QApp-Device-Id` for anonymous favourites before login

Current response item fields:

- `id`
- `slug`
- `name`
- `city`
- `region`
- `countryCode`
- `addressLine1`
- `postalCode`
- `latitude`
- `longitude`
- `publicDescription`
- `serviceStationsCount`
- `queueEnabled`
- `queuePaused`
- `industryType`
- `approvalStatus`
- `distanceKm`
- `queueLength`
- `estimatedWaitMin`
- `bestJoinScore`
- `bestJoinReason`
- `isFavorite`
- `reviewSummary.averageRating`
- `reviewSummary.ratingCount`

Ranking rule:

- with location, shops are sorted by `bestJoinScore`, combining live wait and distance
- without location, shops are sorted by shortest live wait
- favourites should be shown in a separate lane, not used to override the best-to-join ranking

### `GET /v1/shops/:slug`

Purpose:

- load one public shop detail for queue join

Response:

- same core shape as the list item
- includes queue summary fields
- includes `reviews[]` for public customer comments

Review display rule:

- discovery cards should show the overall rating when `ratingCount > 0`
- shop detail should show the top 2 comments by default, then reveal all comments with a read-more action

### Anonymous Favourite Preferences

Browsers and mobile apps should generate a stable anonymous id and send it as `X-QApp-Device-Id`.

This is not a real device UDID. It is a Q-App generated preference id that can later be linked to a customer account.

After successful OTP verification, customer apps may also store a lightweight guest queue profile on the device:

- first name
- mobile number
- last joined shop
- last queue tracking token

When customer accounts are introduced, the account setup flow should link the verified phone number, anonymous preference id, favourites, previous visits, and ratings to the new account.

### `GET /v1/preferences/favorites`

Public with `X-QApp-Device-Id`.

Returns favourite shops for the anonymous device, with the same discovery shape as `GET /v1/shops`.

### `PUT /v1/preferences/favorites/:shopSlug`

Public with `X-QApp-Device-Id`.

Marks a shop as favourite.

### `DELETE /v1/preferences/favorites/:shopSlug`

Public with `X-QApp-Device-Id`.

Removes a shop from favourites.

### `POST /v1/queue/join/start`

Purpose:

- start phone verification before joining a queue

Request body:

```json
{
  "shopSlug": "demo-barber",
  "firstName": "Amir",
  "mobileNumber": "+447400000301"
}
```

Response fields:

- `challengeId`
- `expiresAt`
- `message`
- `deliveryMode`
- `deliveryReason`

Development-only note:

- local/non-production may expose `codePreview`
- mobile production clients must not depend on that field

### `POST /v1/queue/join/verify`

Purpose:

- verify OTP and create or restore the customer’s active queue entry

Request body:

```json
{
  "challengeId": "uuid",
  "code": "123456"
}
```

Response:

- if customer already has an active entry: `alreadyJoined: true`
- returns `queueStatus`

`queueStatus` currently includes:

- `trackingToken`
- `sortIndex`
- `joinedAt`
- `confirmationStatus`
- `confirmationRequestedAt`
- `confirmationRespondedAt`
- `calledAt`
- `visitStatus`
- `plannedDurationMin`
- `estimatedWaitMin`
- `actualDurationMin`
- `queueJoinedAt`
- `readyAt`
- `startedAt`
- `completedAt`
- `feedbackSubmitted`
- `customer`
- `shop`

### `GET /v1/queue/status/:trackingToken`

Purpose:

- poll or reload current queue status screen

Response:

- `queueStatus`-style payload for that token
- clients should use `visitStatus` to switch the customer UI between waiting, called, in service, completed, cancelled, or no-show states
- `queueJoinedAt`, `startedAt`, and `completedAt` allow clients to show per-visit saved waiting time without a customer account

### `POST /v1/queue/status/:trackingToken/respond-arrival`

Purpose:

- answer the `Are you coming?` prompt

Request body:

```json
{
  "response": "COMING"
}
```

### `POST /v1/queue/status/:trackingToken/leave`

Purpose:

- allow a customer to leave an active queue from their secure status link

Request body:

```json
{
  "reason": "Customer left queue from status page"
}
```

Rules:

- only active queue states can be left
- the visit becomes `CANCELLED`
- the queue place is released
- the shop dashboard and active customer status pages refresh in realtime

### `POST /v1/queue/status/:trackingToken/feedback`

Purpose:

- submit optional customer feedback after a completed queue visit

Request body:

```json
{
  "rating": 5,
  "comment": "Easy to join and I did not have to wait inside."
}
```

Rules:

- public endpoint because the tracking token is already the customer’s secure queue link
- only accepted after `visitStatus: COMPLETED`
- customer accounts are not required in MVP

Response fields:

- `feedbackSubmitted`
- `message`

Allowed values:

- `COMING`
- `DECLINED`

Response:

```json
{
  "data": {
    "trackingToken": "token",
    "response": "COMING"
  }
}
```

## Business Operator App Contract

These routes are intended for the future barber/operator mobile app.

### `GET /v1/ops/shops/:slug/dashboard`

Protected roles:

- `OWNER`
- `MANAGER`
- `STAFF_OPERATOR`
- `PLATFORM_ADMIN`

Current response:

- `shop`
- `queueEntries[]`
- `inServiceVisits[]`
- `missedQueueEntries[]`
- `reviewSummary`
- `recentReviews[]`

`shop` currently includes:

- `id`
- `slug`
- `name`
- `queuePaused`
- `queuePauseReason`
- `queueEnabled`
- `defaultWalkInDurationMin`
- `serviceStationsCount`
- `nearTurnPositionTrigger`
- `nearTurnEtaTriggerMin`
- `calledGracePeriodMin`

`reviewSummary` currently includes:

- `averageRating`
- `ratingCount`

`recentReviews[]` currently includes:

- `id`
- `rating`
- `comment`
- `createdAt`
- `customerName`

`queueEntries[]` currently includes:

- `id`
- `trackingToken`
- `sortIndex`
- `joinedAt`
- `confirmationStatus`
- `confirmationRequestedAt`
- `confirmationRespondedAt`
- `calledAt`
- `missedAt`
- `releasedAt`
- `removedAt`
- nested `visit`

`missedQueueEntries[]` uses the same shape as `queueEntries[]` and contains recent `NO_SHOW` / `MISSED` customers that staff may recover.

### `GET /v1/ops/shops/:slug/profile`

Protected roles:

- `OWNER`
- `MANAGER`
- `PLATFORM_ADMIN`

Loads the owner-editable public shop profile, including:

- name
- description
- logo image URL
- cover image URL
- phone
- email
- opening-hours note
- station count
- default walk-in duration

### `PUT /v1/ops/shops/:slug/profile`

Protected roles:

- `OWNER`
- `MANAGER`
- `PLATFORM_ADMIN`

Updates the public shop profile. Staff operators cannot edit profile content.

### `POST /v1/ops/shops/:slug/walk-ins`

Protected.

Request body:

```json
{
  "firstName": "Jordan",
  "mobileNumber": "+447400000355",
  "plannedDurationMin": 25,
  "reason": "Accepted walk-in between queue gaps"
}
```

Response:

- created queue entry payload

### `POST /v1/ops/shops/:slug/pause-queue`

Protected.

Request body:

```json
{
  "reason": "Staff break"
}
```

### `POST /v1/ops/shops/:slug/resume-queue`

Protected.

No request body required.

### `POST /v1/ops/shops/:slug/queue/:trackingToken/call`

Protected.

Calls a queued customer.

### `POST /v1/ops/shops/:slug/queue/:trackingToken/start-service`

Protected.

Moves a queued/ready customer into service.

### `POST /v1/ops/shops/:slug/queue/:trackingToken/release-no-show`

Protected.

Marks an active queued customer as `NO_SHOW`, releases their queue place, recalculates the queue, and promotes the next customer.

Request body:

```json
{
  "reason": "Customer did not arrive when called"
}
```

### `POST /v1/ops/shops/:slug/queue/:trackingToken/reinstate`

Protected.

Reinstates a recently missed/no-show customer once during the same day, places them next in the queue, marks them `READY`, recalculates ETAs, and emits live updates.

Request body:

```json
{
  "reason": "Customer arrived after missed turn"
}
```

### `POST /v1/ops/shops/:slug/visits/:visitId/complete-service`

Protected.

Completes an active service visit.

### `POST /v1/ops/shops/:slug/visits/:visitId/extend-service`

Protected.

Extends the current in-service visit by a number of minutes, records a service adjustment, emits queue updates, and increases waiting ETAs.

Request body:

```json
{
  "durationDeltaMin": 10,
  "label": "Extra service time",
  "notes": "Customer added beard trim"
}
```

## Business Staff Invitation Contract

### `GET /v1/auth/invitations/:token`

Public.

Use this to load invite context before password creation.

### `POST /v1/auth/invitations/:token/accept`

Public.

Request body:

```json
{
  "firstName": "Mina",
  "lastName": "Manager",
  "password": "QappInviteStrong123!"
}
```

Response:

- `invitation`
- `acceptedUser`

### `GET /v1/ops/shops/:slug/invitations`

Protected roles:

- `OWNER`
- `MANAGER`
- `PLATFORM_ADMIN`

### `POST /v1/ops/shops/:slug/invitations`

Protected roles:

- `OWNER`
- `MANAGER`
- `PLATFORM_ADMIN`

Request body:

```json
{
  "email": "staff@shop.example",
  "firstName": "Sam",
  "lastName": "Operator",
  "role": "STAFF_OPERATOR",
  "note": "Front queue operations"
}
```

Allowed create roles:

- `MANAGER`
- `STAFF_OPERATOR`
- `ADMIN_SUPPORT`

## Business Signup Contract

### `POST /v1/business-signups`

Purpose:

- create a pending business onboarding request

Required fields:

- `businessName`
- `ownerName`
- `mobileNumber`
- `email`
- `addressLine1`
- `city`
- `countryCode`
- `industryType`
- `serviceStationsCount`
- `openingHoursNote`
- `latitude`
- `longitude`
- `geolocationSource`
- `pinConfirmedAt`

Optional fields:

- `addressLine2`
- `region`
- `postalCode`
- `placeId`

Important contract rule:

- accurate coordinates plus confirmed pin are mandatory for signup completion

## Realtime Contract

Q-App currently uses Socket.IO for live queue updates.

Current implementation status:

- queue status updates are emitted
- shop dashboard queue updates are emitted

Current mobile contract status:

- realtime channel names and event payloads are not yet frozen as public `v1` contract docs

Until documented separately, mobile clients should treat realtime wiring as `implementation-coupled` rather than fully stable API contract.

## Stability Rules For Mobile Clients

Within `v1`, mobile clients can currently treat these as stable:

- version prefix `/v1`
- bearer-token auth model
- success envelope shape
- error envelope shape
- shop discovery and queue-join route paths
- operator dashboard route paths
- invitation route paths

Mobile clients must not depend on:

- non-production preview fields such as `codePreview` or `resetTokenPreview`
- undocumented Socket.IO event names
- exact sort order of unrelated list endpoints unless the endpoint explicitly documents it
- exhaustive enum assumptions without unknown-value handling

## Recommended Next Contract Docs

After this document, the next high-value API docs are:

- realtime Socket.IO contract
- endpoint-by-endpoint example JSON fixtures
- mobile error-handling guide
- operator app state machine guide
