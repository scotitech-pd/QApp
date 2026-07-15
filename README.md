# Q-App

Q-App is the working foundation for an industry-agnostic real-time scheduling and queue management platform.

The product starts with barbershops as the validation market, then expands into salons, beauty clinics, nail studios, tattoo studios, car washes, vehicle service centres, physiotherapy clinics, dental clinics, and other service businesses that need a flexible mix of walk-ins, queueing, and timed bookings.

## Product Direction

Q-App combines:

- Virtual queue management
- Dynamic service extensions
- Premium time slot reservations
- Smart travel notifications
- Walk-in customer accommodation

The long-term goal is to eliminate physical waiting while preserving the flexibility that real-world service businesses need.

## Initial Technology Direction

- Frontend web: Next.js
- Backend API: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma
- Realtime: Socket.IO
- Notifications: Firebase Cloud Messaging
- Maps and travel: Google Maps
- Payments: Stripe
- Mobile phase recommendation: Expo / React Native

Expo is the recommended mobile path for Q-App because it keeps the team in the TypeScript ecosystem, reduces development overhead, and provides a fast route to iOS and Android once the web MVP is validated.

## Documentation Map

- [Product Roadmap](./docs/product-roadmap.md)
- [Pilot Launch Spec](./docs/pilot-launch.md)
- [Pilot Runbook](./docs/pilot-runbook.md)
- [First Vertical Slice](./docs/first-vertical-slice.md)
- [Architecture Foundation](./docs/architecture-foundation.md)
- [API Auth Foundation](./docs/api-auth-foundation.md)
- [Mobile API Contract v1](./docs/mobile-api-contract.md)
- [Mobile API Fixtures v1](./docs/mobile-api-fixtures.md)
- [OpenAPI Mobile Spec v1](./docs/openapi-mobile-v1.json)
- [Realtime Contract v1](./docs/realtime-contract.md)
- [API Versioning Rules](./docs/api-versioning-rules.md)
- [Role and Flow Product Reset](./docs/role-flow-product-reset.md)
- [Customer Pain Journey](./docs/customer-pain-journey.md)
- [Discovery Questions](./docs/discovery-questions.md)
- [Product Decisions v1](./docs/product-decisions-v1.md)
- [User Flows](./docs/user-flows.md)
- [Wireframe Specs](./docs/wireframe-specs.md)
- [Data Model](./docs/data-model.md)
- [MVP Backlog](./docs/mvp-backlog.md)

## Workspace Layout

- `apps/web`: Next.js customer and business web foundation
- `apps/api`: Express API foundation
- `prisma`: Prisma schema
- `docs`: product, UX, and implementation planning docs

## Getting Started

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env`
3. Start the web app with `npm run dev:web`
4. Start the API with `npm run dev:api`
5. Validate the mobile API contract with `npm run contract:test:mobile`

The scaffold is intentionally light. It gives the team a clean starting point for the first vertical slice without pretending the full product is already implemented.

## Product Principles

- Build the engine around generic businesses, not barber-specific assumptions.
- Separate queue logic from booking logic so both can evolve independently.
- Treat service duration, staff availability, and customer arrival timing as first-class concepts.
- Keep the Phase 1 MVP operationally simple so real usage can validate behaviour quickly.
- Add AI only after meaningful production data exists.

## Current State

This repository currently starts with product documentation first, so future design and development decisions can stay aligned to one source of truth.
