# Q-App Data Model

## Purpose

This document explains the initial Prisma data model for Q-App and the reasoning behind the first schema.

The goal is to support:

- A shop-level queue MVP
- Future premium bookings
- Smart arrival confirmation
- Walk-in injection
- Service extensions
- Multi-industry expansion

## Core Modeling Decision

The schema uses `Visit` as the central lifecycle object.

Why:

- A queue customer and a booking customer are both service visits
- Shared lifecycle data should not be duplicated
- Queue features and booking features can evolve around one core object
- Later industries will still fit the same visit model

## Primary Entity Groups

### Business and Access

- `User`
- `BusinessGroup`
- `BusinessLocation`
- `BusinessMembership`
- `StaffMember`

These models support multi-location ownership, staff management, and permissions.

### Customer and Identity

- `Customer`
- `VerificationChallenge`

These support guest queue joins, phone-based identity, and OTP or WhatsApp verification flows.

### Services and Visits

- `Service`
- `Visit`
- `ServiceAdjustment`

These support the actual service lifecycle, including duration updates and later booking-slot logic.

### Queue and Arrival

- `QueueEntry`
- `NotificationEvent`
- `OperationalEvent`

These support live queue operations, arrival confirmation, and auditability.

### Booking and Payments

- `Reservation`
- `Payment`

These support premium time-slot reservations and fee collection.

## Important Design Choices

### 1. One Queue Per Location

The schema scopes queue operations to `BusinessLocation`.

This matches the MVP rule:

- one queue per shop
- no provider selection by customers in MVP

### 2. Provider Assignment Happens at Service Start

`Visit.assignedStaffMemberId` is optional until service actually begins.

This matches the product rule that staff selection is operational, not customer-facing, in the MVP.

### 3. Guest Customers Are First-Class Records

`Customer` does not require a full user account.

This keeps the join flow lightweight while still allowing:

- queue tracking
- repeat-customer recognition
- booking history later

### 4. Arrival Confirmation Is Stored Explicitly

`QueueEntry` stores confirmation fields such as:

- confirmation status
- request time
- response time
- called time
- missed time

This makes the `Are you coming?` flow measurable and enforceable.

### 5. Service Extensions Are Structured

`ServiceAdjustment` lets the system record:

- predefined add-ons
- manual duration increases
- operator overrides

This protects the historical data needed for ETA improvement.

### 6. Events Are Audited

`OperationalEvent` stores significant operational changes.

This is important for:

- support
- analytics
- dispute resolution
- later intelligence features

### 7. Business Geolocation Is Required

Each business location should store confirmed coordinates.

Why:

- Nearby discovery depends on distance calculation
- Shop ranking by distance depends on reliable coordinates
- Future smart-arrival and travel-time features depend on this being correct

The model also keeps room for:

- auto-detected coordinates
- manually corrected pin placement
- map provider place identifiers

## Relationship Summary

- A `BusinessGroup` has many `BusinessLocation` records
- A `BusinessGroup` has many `BusinessMembership` records
- A `BusinessLocation` has many `StaffMember`, `Service`, `Visit`, `QueueEntry`, `Reservation`, and event records
- A `Customer` has many `Visit` records
- A `Visit` may have one `QueueEntry`
- A `Visit` may have one `Reservation`
- A `Visit` may have one `Payment`
- A `Visit` may have many `ServiceAdjustment`, `NotificationEvent`, and `OperationalEvent` records

## Tables Intentionally Kept Simple

Some concerns are kept lightweight in the first schema:

- Opening hours are stored as `Json`
- Profile and operational settings are stored directly on `BusinessLocation`
- Notification payloads are stored as `Json`

Location itself is not lightweight in the same way:

- latitude and longitude are required
- pin confirmation metadata is stored explicitly

This keeps the MVP flexible while still leaving room to normalize later if needed.

## Future Extensions

The current schema is ready to expand into:

- industry-specific intake templates
- maps-based smart arrival data
- staff specialization
- multi-channel notifications
- full service payments
- deeper forecasting and AI features

## Files

- [Prisma Schema](../prisma/schema.prisma)
