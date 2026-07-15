# Q-App Architecture Foundation

## Goal

Define the technical direction for a scalable Phase 1 MVP that can later evolve into a multi-industry real-time scheduling platform.

## Recommended Stack

### Web Frontend

- Next.js for the customer web app and business portal

Why:

- Strong SEO and discoverability for nearby-shop browsing
- One web codebase can support both customer and business experiences
- Good fit for authenticated dashboards and public landing/search pages

### Backend

- Node.js + Express + TypeScript

Why:

- Fits real-time event-driven product needs
- Matches the rest of the TypeScript ecosystem
- Easy to structure into modular domains before moving to larger service decomposition later

### Database

- PostgreSQL + Prisma

Why:

- Relational model fits staff schedules, services, bookings, queue entries, and event history well
- Prisma accelerates iteration in early-stage product development

### Realtime

- Socket.IO

Why:

- Good fit for live queue updates, position changes, service state changes, and business dashboards

### Notifications

- Firebase Cloud Messaging

Why:

- Cross-platform push support for future mobile apps
- Can also support web push use cases where appropriate

### Maps and Travel

- Google Maps Platform

Why:

- Travel-time estimation is central to smart arrival and leave-now notifications

### Payments

- Stripe

Why:

- Good fit for simple booking-fee monetization in Phase 3

## Mobile Recommendation

Use Expo / React Native when mobile begins.

### Why Not Flutter First

- Flutter adds a second major development ecosystem and language
- It weakens code and domain sharing with the TypeScript-based web and backend stack
- It increases hiring, maintenance, and integration overhead for a product still finding product-market fit

### When to Reconsider

Flutter should only be reconsidered if later product requirements prove that:

- Custom rendering is a major competitive differentiator
- Native-level UI performance becomes a bottleneck
- The product team has a strong Flutter hiring or delivery advantage

## Architectural Principle: Build for Multi-Industry From Day One

Even though Phase 1 validates with barbers, the architecture should model generic service operations.

### Core Platform Entities

- Business
- Business location
- Staff member / provider
- Service
- Service category
- Visit
- Queue entry
- Reservation
- Time slot
- Notification
- Payment
- Customer
- Business settings

### Industry-Specific Layers

Industry differences should mostly live in:

- Service catalog templates
- Business rules configuration
- Customer intake fields
- Slot duration defaults
- Compliance requirements

The scheduling engine itself should remain generic.

## Suggested Initial Bounded Contexts

### Identity and Access

- Customer accounts
- Business owner accounts
- Staff accounts
- Roles and permissions

### Business Setup

- Business profile
- Location
- Opening hours
- Industry type
- Staff setup
- Service configuration

### Queue Operations

- Join queue
- Walk-in creation
- Queue ordering
- Position changes
- Service start and completion
- Delay propagation

### Booking Operations

- Slot generation
- Service-based duration matching
- Booking fee collection
- Reservation lifecycle

### Notification Engine

- Trigger rules
- Delivery channels
- Templates
- Customer acknowledgements

### Scheduling Intelligence

- ETA calculations
- Duration history
- Staff speed profiles
- Queue rebalancing logic

## MVP System Shape

For Phase 1, keep deployment simple:

- Next.js app for customer and business UI
- Express API server
- PostgreSQL database
- Socket.IO for live updates
- Background jobs for notifications and ETA recalculation

This can start as a modular monolith rather than microservices.

## API and Data Design Guidance

### Naming

Avoid hard-coded barber terms in the backend and database.

Prefer:

- `businesses`
- `locations`
- `staff_members`
- `services`
- `queue_entries`
- `reservations`
- `visits`

Avoid:

- `barbers`
- `haircuts`
- `shop_queue_only`

### Auditing

Track every operational change:

- Queue join
- Queue leave
- Queue reorder
- Service start
- Service completion
- Duration extension
- Walk-in add

This event history becomes essential for Phase 2 and beyond.

### Configurability

Design for configurable business rules such as:

- Queue enabled or disabled
- Bookings enabled or disabled
- Maximum booking horizon
- Default service durations
- Auto-release window for late arrivals
- Notification timing thresholds

## Non-Functional Priorities

### Phase 1 Priorities

- Fast operator workflow
- Reliable realtime updates
- Clear audit trail
- Simple deployment
- Basic analytics instrumentation

### Later Priorities

- Scheduling engine sophistication
- Deeper automation
- Advanced forecasting
- Multi-location business support

## Metrics to Instrument Early

- Queue joins
- Queue drop-offs
- Queue completions
- Average actual wait time
- ETA error
- Service duration actual vs expected
- Walk-in vs pre-queue demand
- Business daily active usage
- Notification delivery and engagement

## Proposed Documentation Follow-Ups

- User journey specs
- Entity relationship design
- API contract draft
- Queue rules specification
- Booking rules specification
- Notification matrix
