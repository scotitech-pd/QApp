# Q-App Product Roadmap

## Purpose

This roadmap sets the phasing, priorities, and explicit non-goals for Q-App. It is the single document a new team member should read to understand *what we are building, in what order, and what we are deliberately not building yet*.

If a feature is not on this roadmap, it is not on the plan. Adding to this document is the mechanism for adding to the plan.

## Guiding Principles

1. **One vertical, one city, ten shops** before we generalize. Barbershops in a single metro are the beachhead. Every design decision serves that beachhead first.
2. **The queue loop is the product.** Join → wait remotely → get called at the right time → arrive → get served. Everything else is a distraction until that loop is loved by real shops.
3. **Boring tech, obsessive execution.** No AI, no dynamic pricing, no ML ETAs in Phase 1. Postgres, Prisma, Socket.IO, Twilio. The differentiator is UX and reliability, not novelty.
4. **The industry-agnostic schema stays, the industry-agnostic UI does not.** We keep the generic data model so we can expand later without a rewrite. The interface, copy, and defaults are 100% barbershop-flavored in Phase 1.
5. **Two-sided cold start is a distribution problem, not a product problem.** We will hand-onboard the first 10 shops in person. Product decisions optimize for that motion, not for self-serve scale.
6. **Ship weekly to the pilot shops. Learn. Cut.** If a feature is not being used by pilot shops after 2 weeks, it is removed, not iterated.

## Success Metrics

We only track metrics that force honest answers.

### Phase 1 (Pilot)
- **10 shops actively using the queue loop** for 5+ business days each.
- **Median time from join to called** matches reality within ±5 minutes.
- **Silent-customer rate** (near-turn ping ignored) is < 20%.
- **Shop retention week over week** > 80% across the pilot cohort.
- **Customer NPS** from at least 100 surveyed queue completions > 40.

### Phase 2 (Repeatable Onboarding)
- **50 shops** onboarded, at least 30 self-serve.
- **Weekly active queue joins per shop** > 25 median.
- **Shop-side operator satisfaction** > 4.2 / 5.
- **First paying shop.**

### Phase 3 (Adjacent Verticals)
- **First non-barber vertical live** (salon or nail studio) with at least 5 shops.
- **Revenue > $5k MRR** across pilot verticals.
- **< 5% support-touch rate** per shop per week.

## Phases

### Phase 0 — Foundation (done / in progress)
Product docs, Prisma schema, API scaffolding, web scaffolding, auth, admin security, invitations, business signup with map pin, queue join with OTP, ops dashboard with call/start/complete/reinstate, arrival response loop plumbing, Socket.IO invalidation events, Twilio SMS with preview fallback.

Exit criteria: the [First Vertical Slice](./first-vertical-slice.md) runs end-to-end on a laptop with the seed data and passes its own acceptance checklist.

### Phase 1 — Pilot (next)
Goal: 10 real barbershops in one city using the queue loop for a full working week.

In scope:
- Close every gap identified in [First Vertical Slice](./first-vertical-slice.md).
- Manual queue reorder for staff (missing today).
- Meaningful ETA recalculation with debounce policy (defined in the slice spec).
- Admin: suspend/unsuspend a business, view a location's live queue and recent operational events.
- Test harness: integration tests around queue lifecycle transitions and arrival response.
- Production hardening: CORS allow-list, Socket.IO auth, rate limits reviewed, secrets audit.
- Basic operator onboarding material (a printable one-pager, no in-app coach marks yet).

Not in scope in Phase 1 (explicit):
- Booking and timed reservations (schema exists; endpoints do not).
- Payments, deposits, no-show fees.
- WhatsApp channel.
- FCM push notifications (SMS + web-socket-driven web page is enough).
- Analytics dashboard beyond a single "today's queue" view.
- Multi-industry theming, translation, RTL.
- Mobile app (Expo). The customer-facing surface is mobile web via the tracking-token URL.
- AI anything.

### Phase 2 — Repeatable Onboarding
Goal: onboarding a new shop is a self-serve, sub-10-minute flow.

In scope:
- Setup checklist gate before a location can go LIVE (backlog Epic 1).
- Staff invitations UX polish.
- Shop-side "queue paused because…" reason surfaced to customers.
- Basic analytics: daily served, average wait, no-show rate, peak hour.
- FCM push for the customer web app (falling back to SMS).
- Billing scaffolding (Stripe) — trial + first paid plan.
- Public shop discovery page with wait times (currently exists as scaffolding; needs polish and SEO).

Not in scope:
- Booking, still.
- Multi-industry launch.

### Phase 3 — Booking + Adjacent Verticals
Goal: prove the engine works for a second vertical without a rewrite.

In scope:
- Timed reservations on top of queueing (schema is ready).
- Staff availability windows and per-service duration overrides.
- One additional vertical (salon or nail studio) turned on with tailored defaults.
- WhatsApp channel if pilot data shows SMS deliverability is the bottleneck.

### Phase 4 — Scale Enablers
Only start when Phase 3 metrics are hit.

- Native mobile app (Expo).
- Payments / deposits / no-show protection.
- Group bookings, multi-service visits.
- Advanced analytics and cohort views.
- ML ETA (only after 6+ months of real data).

## Non-Goals (permanent, unless a metric proves otherwise)

- We are not building a general-purpose calendar or CRM.
- We are not building a marketplace with reviews-as-primary-navigation. Reviews exist to reinforce trust, not to be a Yelp.
- We are not building a loyalty/points program in-house. If it matters, we integrate.
- We are not building a POS.

## How This Roadmap Changes

- A change is proposed in a PR that edits this file.
- A change must state which metric it improves and which phase it belongs in.
- A change that adds work to Phase 1 must also cut something from Phase 1.

## Answered Foundational Questions

These were open at the start; the pilot owner has committed to answers. Revisit only when the pilot data forces us to.

1. **Which city and which 10 shops?** — Pilot shop #1 is already committed (owner is a personal contact of the founder). Shops 2–10 are deferred until pilot #1 exits successfully; we do not scout them yet.
2. **Who owns pilot-shop onboarding operationally?** — The founder owns onboarding. Mechanism: the shop owner completes `/business/signup` themselves (their data, their password); the founder acting as platform admin approves via `/admin/business-signups`. No manual seed script, no shared credentials.
3. **What is the pricing hypothesis for Phase 2?** — There is no pricing during the pilot. Q-App is free for pilot shops. Pricing is a Phase 2 question and will be shaped by "would you keep using it if we charged £X/month?" answers collected in the T+5 debrief. Wrong-number placeholder for planning: £29/shop/month.
4. **What is the plan when a shop's phone/tablet loses Wi-Fi mid-service?** — Deferred. Socket.IO reconnects automatically; ops dashboard shows a stale timestamp. Full offline behavior is not on the pilot scope. If it becomes a real problem in the pilot, it moves to Phase 1.
5. **How do we handle a customer whose phone dies mid-queue?** — Do nothing special. The arrival response timeout expires the customer and the queue moves on. This is the intended behavior of the "Are you coming?" loop; a dead phone is indistinguishable from an inattentive customer. Log the count for the T+5 debrief.

## Open Questions (Post-Pilot)

Not decided; not blocking; will be revisited after pilot data lands.

- What subset of the ops dashboard belongs on a shop-owner-facing analytics view in Phase 2?
- Which channel (SMS, WhatsApp, push) is worth the integration cost first?
- What's the right auto-complete idle timeout, if any?
- Do we allow customers to save a profile / favorites during the pilot, or hide those UI paths until they're needed?
