# Q-App Realtime Contract v1

## Purpose

This document defines the current Socket.IO contract for Q-App mobile and web clients.

It is intentionally minimal.

Q-App realtime currently uses an `invalidation event` model:

- the server emits lightweight update notifications
- clients refetch canonical state over HTTP after receiving them

This keeps the realtime contract stable while the underlying queue logic continues to evolve.

## Scope

This document covers:

- connection model
- client subscription events
- server invalidation events
- room semantics

It does not define:

- a fully stateful realtime sync protocol
- guaranteed delivery semantics
- offline replay

## Transport

- Socket.IO over the same API host
- current server initialization lives in [realtime.ts](../apps/api/src/realtime.ts)

Local example:

- `http://127.0.0.1:4000`

## Current Auth Rule

Current implementation status:

- realtime subscriptions are not currently auth-gated at the Socket.IO layer

Important contract note:

- public customer queue tracking can use this today
- operator dashboards should still rely on HTTP auth for canonical protected data
- a future auth-gated Socket.IO upgrade should be treated as a deliberate contract change and documented clearly

## Room Model

### Shop Room

Purpose:

- subscribe to queue/dashboard invalidation for one shop

Client joins with:

- `shop:watch`

Payload:

```json
"demo-barber"
```

Server room key:

- `shop:<slug>`

Example internal room:

- `shop:demo-barber`

### Queue Room

Purpose:

- subscribe to one customer’s queue-status invalidation stream

Client joins with:

- `queue:watch`

Payload:

```json
"demo-queue-amir"
```

Server room key:

- `queue:<trackingToken>`

Example internal room:

- `queue:demo-queue-amir`

## Client-to-Server Events

### `shop:watch`

Purpose:

- subscribe the socket to a shop room

Payload type:

- non-empty string shop slug

Example:

```json
"demo-barber"
```

### `queue:watch`

Purpose:

- subscribe the socket to a queue room

Payload type:

- non-empty string queue tracking token

Example:

```json
"demo-queue-amir"
```

## Server-to-Client Events

### `shop:updated`

Purpose:

- notify subscribed clients that the watched shop queue state changed

Current payload:

```json
{
  "slug": "demo-barber",
  "timestamp": "2026-06-12T09:50:00.000Z"
}
```

Meaning:

- the mobile client should refetch `GET /v1/ops/shops/:slug/dashboard`
- or refetch `GET /v1/shops/:slug` if it is using public shop detail only

Typical triggers today:

- customer joins queue
- lifecycle recalculation changes queue state
- walk-in added
- queue paused
- queue resumed
- customer called
- service started
- service completed
- arrival response updates

### `queue:updated`

Purpose:

- notify subscribed clients that one tracked queue entry changed

Current payload:

```json
{
  "trackingToken": "demo-queue-amir",
  "timestamp": "2026-06-12T09:50:00.000Z"
}
```

Meaning:

- the mobile client should refetch `GET /v1/queue/status/:trackingToken`

Typical triggers today:

- queue join verification creates queue entry
- near-turn / arrival-confirmation lifecycle changes
- customer responds to `Are you coming?`
- customer is called
- service starts
- service completes
- queue slot expires or is released

## Canonical Realtime Client Pattern

### Customer App

1. Load queue status over HTTP
2. Connect Socket.IO
3. Emit `queue:watch` with `trackingToken`
4. On `queue:updated`, refetch `GET /v1/queue/status/:trackingToken`

### Operator App

1. Load dashboard over HTTP
2. Connect Socket.IO
3. Emit `shop:watch` with shop slug
4. On `shop:updated`, refetch `GET /v1/ops/shops/:slug/dashboard`

## Stability Rules

The following are now treated as the stable `v1` realtime contract baseline:

- event name `shop:watch`
- event name `queue:watch`
- event name `shop:updated`
- event name `queue:updated`
- payload field `slug` on `shop:updated`
- payload field `trackingToken` on `queue:updated`
- payload field `timestamp` on both server events
- invalidation-then-refetch client behavior

Clients must not assume:

- the server pushes full dashboard payloads
- the server pushes full queue-status payloads
- any ordering guarantee between two separate realtime events and independent HTTP requests

## Versioning Notes

Inside `v1`, allowed changes include:

- adding optional fields to the server event payloads
- adding new watch channels for new app surfaces

Breaking changes include:

- renaming the current event names
- removing `slug`, `trackingToken`, or `timestamp`
- switching from invalidation events to a different semantic model without a versioned contract change

## Recommended Client Resilience

Mobile clients should:

- debounce duplicate refetches when many update events arrive close together
- treat Socket.IO as a freshness layer, not the source of truth
- recover cleanly if the socket disconnects
- rejoin rooms after reconnect
- tolerate unknown additional payload fields

## Next Realtime Upgrades

Good future expansions:

- authenticated operator socket channels
- explicit room leave events
- batched update hints
- richer customer-facing queue event categories
- server-pushed minimal state diffs if the team later needs them
