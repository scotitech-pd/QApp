# Q-App API Versioning Rules

## Purpose

This document defines how Q-App API changes are versioned, deprecated, and released so mobile clients remain stable across backend evolution.

The key principle is simple:

- mobile apps cannot upgrade instantly
- therefore the API must evolve more conservatively than the web UI

## Current Versioning Strategy

### Major Versioning

Q-App uses path-based major versioning:

- current version: `/v1`
- future breaking release example: `/v2`

Example:

- `/v1/auth/login`
- `/v2/auth/login`

### Contract Baseline

Everything documented in [mobile-api-contract.md](./mobile-api-contract.md) is the working `v1` contract baseline.

If a change would invalidate that baseline for an existing mobile app, it is a breaking change.

## Breaking vs Non-Breaking Changes

### Breaking Changes

These require a new major version unless the route is explicitly marked internal-only or pre-contract:

- removing a field
- renaming a field
- changing a field type
- changing a field from nullable to required in a way that breaks older clients
- changing enum meanings incompatibly
- removing an endpoint
- changing required authentication rules
- changing URL path structure
- changing response envelope shape
- changing pagination behavior incompatibly
- changing business semantics in a way that alters existing client assumptions

Examples:

- `estimatedWaitMin` changing from number-or-null to string
- `trackingToken` being removed in favor of another key
- `POST /v1/queue/join/start` becoming auth-only

### Non-Breaking Changes

These are allowed inside the current major version:

- adding a new optional field
- adding a new endpoint
- adding a new query parameter
- adding a new protected route for a new app capability
- improving validation messages without changing the machine code contract
- adding new error `details` fields
- adding new enum values when clients are expected to tolerate unknown values

Important mobile rule:

- clients must tolerate unknown enum values gracefully
- clients must ignore unknown object fields

Without that discipline, additive backend changes become accidental mobile breakage.

## Versioning Rules Starting Now

### Rule 1: No Envelope Changes Inside `v1`

The current success and error envelope shapes are locked for `v1`.

### Rule 2: No Path Renames Inside `v1`

Existing documented route paths stay stable until `v2`.

### Rule 3: Additive Changes Prefer Optional Fields

When adding data to an existing response:

- add a new optional field
- do not repurpose an old field

### Rule 4: New Business States Must Be Forward-Compatible

For statuses and enums:

- mobile clients must treat unknown values as non-fatal
- backend may add enum values in `v1` when documentation is updated

### Rule 5: Dev Preview Fields Are Not Public Contract

These fields may exist locally or in non-production:

- `codePreview`
- `resetTokenPreview`
- `resetUrlPreview`

They are not part of the public mobile contract and may not be relied on by production apps.

### Rule 6: Internal Admin Routes Are Separate From Public Mobile Commitments

Platform-admin routes are important, but they are not part of the same external compatibility promise as customer/operator mobile flows.

They should still be documented and versioned responsibly, but they may evolve faster than public customer-facing routes.

## Deprecation Policy

### Minimum Deprecation Window

For public mobile-facing routes and fields:

- minimum target deprecation window: `120 days`

Before removal or breaking replacement:

1. mark the field or endpoint deprecated in docs
2. add migration guidance
3. announce the replacement path
4. keep the old behavior available during the deprecation window

### Deprecation Documentation

Every deprecation must record:

- what is deprecated
- replacement contract
- first deprecation date
- removal target date
- affected client surfaces

## Change Categories

### Category A: Safe Additive

Examples:

- new optional response field
- new admin endpoint
- new alert type

Action:

- update docs
- no major version bump

### Category B: Behavior Expansion

Examples:

- new queue status value
- new security alert type
- new optional workflow branch

Action:

- update docs
- verify clients tolerate unknown values
- no major bump if forward compatibility is preserved

### Category C: Breaking Structural Change

Examples:

- new auth model
- removed field
- renamed endpoint
- changed response envelope

Action:

- create `/v2`
- document migration
- maintain overlap period

## Mobile Client Version Headers

These are adopted rules for future mobile apps even if not strictly enforced yet.

Mobile clients should send:

- `X-Client-Platform`: `ios` or `android`
- `X-Client-Version`: app version string
- `X-App-Build`: build number

Why:

- support and security teams can correlate behavior to app builds
- backend can make safer deprecation decisions
- rollout issues become easier to trace

## Error Code Rules

Human-readable `error` messages may improve over time.

Mobile apps should key logic off:

- HTTP status
- `code`
- specific documented `details` fields when relevant

Examples:

- `ACCOUNT_LOCKED`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `BAD_REQUEST`
- `CONFLICT`

Versioning rule:

- do not silently repurpose an existing machine `code` to mean something different

## Field Design Rules

### Naming

- use stable camelCase JSON fields
- avoid abbreviations unless industry-standard

### Nullability

- if a field can be absent for valid business reasons, prefer explicit `null`
- do not switch `null` fields to omitted fields casually inside the same major version

### Timestamps

- all public timestamps should remain ISO 8601 strings

### Identifiers

- opaque identifiers stay opaque
- never encode business meaning that clients are expected to parse

## Realtime Versioning

Socket.IO support exists today, but its public contract is not yet frozen.

Rule until documented:

- do not treat current event names and payloads as stable public API

Once a realtime contract doc exists:

- event names
- event payloads
- room semantics
- auth rules

should follow the same additive-vs-breaking rules as HTTP endpoints.

## Recommended Release Process

For any mobile-facing API change:

1. update the relevant contract doc first
2. classify the change as additive or breaking
3. ship backend change
4. validate against at least one mobile-oriented fixture or integration test
5. record notable changes in a changelog section

## Immediate Next Governance Steps

- add sample request/response fixtures per endpoint
- add a realtime contract doc
- start sending client version headers from future mobile apps
- add automated contract tests for the highest-risk auth and queue routes
