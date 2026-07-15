# Q-App API Auth Foundation

## Purpose

This document defines the first serious authentication and authorization foundation for Q-App.

It is designed for:

- future iOS and Android mobile apps
- the barber/business operator portal
- internal admin tools

The goal is to keep flows simple for clients while keeping backend access control strict.

## Auth Model

Q-App now uses:

- short-lived access tokens
- long-lived refresh sessions
- server-stored refresh token hashes
- auth audit events for security-sensitive actions
- stronger password policy enforcement
- temporary login lockout after repeated failures
- platform-admin security intervention endpoints
- suspicious-login alerting with admin triage
- security case history for support and investigation
- invitation-based business user onboarding
- password reset tokens with session revocation
- auth endpoint rate limiting
- role-based authorization

This gives mobile clients a standard pattern:

1. Login with identifier and password
2. Receive access token and refresh token
3. Use access token for normal API requests
4. Use refresh token to rotate the session when the access token expires
5. Revoke refresh session on logout
6. Accept business invites through a secure token flow when onboarding shop staff
7. Reset passwords through a time-limited token that revokes old sessions
8. Review recent auth activity and manage active devices from one account surface

## Password Policy

Current password policy is enforced for:

- password reset confirmation
- invitation acceptance
- any future password-set flows that use the shared password helper

Current rules:

- minimum length from config, default `10`
- at least one lowercase letter
- at least one uppercase letter
- at least one number
- at least one symbol

The API returns the first policy failure as the main error and also includes `passwordPolicyErrors` in `details`.

## Login Lockout

Q-App now tracks failed login attempts on the `User` record.

Current default behavior:

- lock the account after `5` failed login attempts
- lock duration `15` minutes
- values configurable through auth env vars

When the threshold is reached, login returns:

- HTTP `423`
- code `ACCOUNT_LOCKED`
- `lockedUntil` timestamp in `details`

Successful login resets:

- failed attempt count
- lockout state
- matching login rate-limit key for that identifier and IP

Successful password reset also clears:

- failed attempt count
- lockout state
- matching login rate-limit keys for the user email and phone on the current IP

Repeated failed-login behavior now also raises internal security alerts:

- `REPEATED_LOGIN_FAILURES` at the warning threshold
- `ACCOUNT_LOCKED` when the lockout threshold is reached

Successful login behavior now also raises a low-severity alert when:

- the account already has prior successful session history
- the new login comes from a device context the account has not used before

This currently uses:

- `deviceName`
- `platform`
- `userAgent`

The first known login becomes the baseline and does not create an alert.

## Role Model

### Platform Role

Stored on `User.appRole`.

- `USER`
- `PLATFORM_ADMIN`

Use `PLATFORM_ADMIN` for global internal access such as signup review and future support tooling.

### Business Role

Stored on `BusinessMembership.role`.

- `OWNER`
- `MANAGER`
- `STAFF_OPERATOR`
- `ADMIN_SUPPORT`

These roles are scoped to a business group, not the entire platform.

## Protected Route Strategy

### Public

- health
- meta
- public shop discovery
- shop detail
- customer queue join
- customer queue status
- business signup submission

### Platform Admin Only

- business signup review list
- business signup approval
- business signup rejection
- account security lookup and intervention routes

### Business Operator Access

Allowed for `OWNER`, `MANAGER`, `STAFF_OPERATOR`, or `PLATFORM_ADMIN`.

- operator dashboard
- call next
- start service
- complete service
- add walk-in
- pause queue
- resume queue
- manage business invitations

## Current Auth Endpoints

### `POST /v1/auth/login`

Input:

- `identifier`
- `password`
- optional `deviceName`
- optional `platform`

Output:

- user profile
- access token
- refresh token
- session id
- access token expiry seconds
- refresh token expiry timestamp

### `POST /v1/auth/refresh`

Input:

- `refreshToken`

Output:

- rotated access token
- rotated refresh token
- session id

### `POST /v1/auth/logout`

Input:

- `refreshToken`

Effect:

- revokes the matching refresh session

### `POST /v1/auth/password-reset/request`

Public endpoint.

Input:

- `identifier`

Behavior:

- always returns a neutral success message
- creates a password reset token when the account exists
- returns reset preview data in local non-production mode only

### `POST /v1/auth/password-reset/confirm`

Public endpoint.

Input:

- `token`
- `password`

Behavior:

- updates the password
- consumes the token
- revokes existing sessions for that user

### `GET /v1/auth/me`

Requires:

- bearer access token

Output:

- current user
- platform role
- business memberships
- staff profiles

### `GET /v1/auth/sessions`

Requires:

- bearer access token

Output:

- all sessions for the authenticated user
- current-session marker
- device and platform metadata

### `GET /v1/auth/activity`

Requires:

- bearer access token

Output:

- recent auth and security events for the authenticated user
- login success and failure history
- session/logout activity
- invitation creation and acceptance activity

### `POST /v1/auth/logout-current`

Requires:

- bearer access token

Effect:

- revokes the current session id from the access token

### `POST /v1/auth/logout-other-sessions`

Requires:

- bearer access token

Effect:

- revokes every other active session owned by the authenticated user
- keeps the current session active

### `POST /v1/auth/sessions/:sessionId/revoke`

Requires:

- bearer access token

Effect:

- revokes a specific session owned by the authenticated user

## Platform Admin Security Endpoints

These routes are for internal support and security operations.

All require:

- authenticated platform admin access

### `GET /v1/admin/security/users`

Query:

- optional `q`
- optional `lockedOnly=true`
- optional `limit`

Returns:

- user security summaries
- lockout status
- failed login count
- active session count
- business memberships

### `GET /v1/admin/security/users/:userId`

Returns:

- detailed user security summary for one account

### `POST /v1/admin/security/users/:userId/unlock`

Effect:

- clears failed login attempts
- removes account lockout
- clears matching login throttle state for that user

### `POST /v1/admin/security/users/:userId/revoke-sessions`

Effect:

- revokes every active session for the target user

### `POST /v1/admin/security/users/:userId/force-password-reset`

Effect:

- revokes active sessions
- clears lockout state
- creates a fresh password reset token
- returns reset preview data outside production

### `GET /v1/admin/security/auth-activity`

Query:

- optional `userId`
- optional `identifier`
- optional `type`
- optional `limit`

Returns:

- filtered auth/security activity across the platform
- affected user summary
- acting admin summary when relevant

## Platform Admin Security Alert Endpoints

These routes surface machine-generated security signals for admin review.

All require:

- authenticated platform admin access

### `GET /v1/admin/security/alerts`

Query:

- optional `userId`
- optional `status`
- optional `severity`
- optional `type`
- optional `limit`

Returns:

- security alerts for triage
- linked case summary when an alert has been escalated
- acknowledging and resolving admin identity when relevant

### `GET /v1/admin/security/alerts/:alertId`

Returns:

- one full alert record

### `POST /v1/admin/security/alerts/:alertId/acknowledge`

Input:

- optional `note`

Effect:

- marks the alert as `ACKNOWLEDGED`
- records the acting platform admin in auth audit history

### `POST /v1/admin/security/alerts/:alertId/resolve`

Input:

- `resolutionSummary`

Effect:

- marks the alert as `RESOLVED`
- records the acting platform admin in auth audit history

### `POST /v1/admin/security/alerts/:alertId/create-case`

Input:

- optional `assignedToUserId`
- optional `title`
- optional `summary`
- optional `initialNote`

Effect:

- creates a linked security case from the alert
- keeps the alert tied to the resulting case

## Platform Admin Security Case Endpoints

These routes provide lightweight case history around investigations and interventions.

All require:

- authenticated platform admin access

### `GET /v1/admin/security/cases`

Query:

- optional `userId`
- optional `assignedToUserId`
- optional `status`
- optional `severity`
- optional `limit`

Returns:

- security case records with notes, target user, creator, and assignee

### `POST /v1/admin/security/cases`

Input:

- `targetUserId`
- `title`
- optional `summary`
- optional `assignedToUserId`
- optional `initialNote`
- optional `severity`

Effect:

- creates a new security case
- can attach the first internal note immediately

### `GET /v1/admin/security/cases/:caseId`

Returns:

- one full security case with note history

### `POST /v1/admin/security/cases/:caseId/notes`

Input:

- `body`

Effect:

- appends an internal case note

### `POST /v1/admin/security/cases/:caseId/resolve`

Input:

- `resolutionSummary`

Effect:

- marks the case as `RESOLVED`
- stores the resolution summary

### `POST /v1/admin/security/cases/:caseId/reopen`

Input:

- optional `note`

Effect:

- moves the case back to `MONITORING`
- optionally adds a reopening note

## Invitation Endpoints

### `GET /v1/auth/invitations/:token`

Public endpoint.

Used to:

- inspect an invitation before account creation
- confirm role and business context
- validate that the token is still active

### `POST /v1/auth/invitations/:token/accept`

Public endpoint.

Used to:

- accept a business invitation
- set the invited user password
- create or update the user account
- create the business membership
- create the staff profile when relevant

### `GET /v1/ops/shops/:slug/invitations`

Protected endpoint.

Allowed for:

- `OWNER`
- `MANAGER`
- `PLATFORM_ADMIN`

### `POST /v1/ops/shops/:slug/invitations`

Protected endpoint.

Allowed for:

- `OWNER`
- `MANAGER`
- `PLATFORM_ADMIN`

Use this to invite:

- `MANAGER`
- `STAFF_OPERATOR`
- `ADMIN_SUPPORT`

## Token Design

### Access Token

- signed server-side
- includes user id, session id, app role, issue time, expiry
- short-lived

### Refresh Token

- opaque random token
- only hashed form is stored in the database
- rotated on refresh
- can be revoked independently

### Password Reset Token

- opaque random token
- only hashed form is stored in the database
- time-limited
- single use
- revokes old sessions on successful reset

## Rate Limiting

Current auth rate limiting is applied to:

- login
- refresh
- password reset request
- password reset confirm

The current implementation is process-memory based, which is fine for the local and single-instance stage.

To keep recovery flows usable, successful login and successful password reset now clear the relevant login rate-limit key for that user/IP combination.

Planned production evolution:

- shared store such as Redis
- richer per-identifier and per-device policies
- alerting on suspicious auth patterns

## Auth Audit Trail

Q-App now records auth audit events in a dedicated `AuthAuditEvent` table.

Current event coverage includes:

- login success
- login failure
- refresh success
- refresh failure
- refresh-token logout
- current-session logout
- logout of other sessions
- specific session revocation
- password reset request
- password reset completion
- invitation creation
- invitation acceptance
- admin account unlock
- admin revoke all sessions
- admin forced password reset
- admin security case created
- admin security case note added
- admin security case resolved
- admin security case reopened
- admin security alert acknowledged
- admin security alert resolved
- admin security alert escalated into case

Admin-triggered events now also capture the acting platform admin, so support interventions are attributable and reviewable.

This keeps security history separate from queue operations and makes it easier to support future mobile account-security screens and future internal ops tools.

## Security Case Model

Q-App now stores lightweight internal security cases with:

- target user
- creator
- optional assignee
- severity
- status
- summary and resolution summary
- chronological note history

## Security Alert Model

Q-App now stores machine-generated security alerts separately from investigator-owned cases.

Current alert types:

- `REPEATED_LOGIN_FAILURES`
- `ACCOUNT_LOCKED`
- `NEW_DEVICE_LOGIN`

Current alert statuses:

- `OPEN`
- `ACKNOWLEDGED`
- `RESOLVED`

Alerts can remain standalone or be escalated into linked security cases.

Current statuses:

- `OPEN`
- `MONITORING`
- `RESOLVED`

Current severities:

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

## Local Demo Credentials

Seeded by `npm run seed:demo`.

- Platform admin: `admin@qapp.demo` / `QappAdmin123!`
- Owner: `owner@fadeyard.demo` / `QappOwner123!`
- Manager: `manager@fadeyard.demo` / `QappManager123!`
- Staff operator: `staff@fadeyard.demo` / `QappStaff123!`

Note:

- invitation acceptance creates additional local test users when you exercise that flow
- `npm run seed:demo` resets the base demo state

These are for local development only.

## Next Backend Steps

- add shared-store rate limiting such as Redis
- add support/admin views for security activity investigation
- add assignment workflows and SLA-style escalation for security cases
- add more detection rules such as unusual device patterns and impossible-travel style heuristics
- move to shared-store rate limiting such as Redis
- move from demo credentials to production onboarding policies
