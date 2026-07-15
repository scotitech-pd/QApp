# Pilot Launch Spec

## Purpose

This is the concrete plan to put Q-App in front of **one real barbershop this week** for market validation. It is deliberately narrower than the [First Vertical Slice](./first-vertical-slice.md) and much narrower than the [Product Roadmap](./product-roadmap.md).

We are not building a SaaS. We are not charging money. We are testing whether a real shop and its real customers will use the queue loop.

## Success Criteria for the Pilot

The pilot is a success if, over 5 business days at the pilot shop:

1. At least **20 customers** join the queue remotely (from outside the shop).
2. At least **80%** of called customers show up within the grace period.
3. The shop's staff can run the queue **entirely from a tablet** without asking us for help mid-shift.
4. We collect **at least 5 pieces of qualitative feedback** (2 from staff, 3 from customers).

We are not measuring revenue, retention, or NPS yet. We are measuring: does this thing work in the wild.

## What Ships in the Pilot

### Shop onboarding (self-serve + admin approval)
- Shop owner visits `<host>/business/signup`, fills the form (business + owner details, opening hours, chairs, address, map pin, **their chosen password**), submits.
- Platform admin (you) visits `<host>/admin/business-signups`, reviews the pending signup, hits **Approve**.
- On approval the system creates: a `BusinessGroup`, a LIVE `BusinessLocation`, a default queueable `Service`, the owner's `User` account, and an `OWNER` `BusinessMembership`.
- The owner immediately signs in at `<host>/signin` with the email and password they chose during signup, and lands on `<host>/ops/shops/<their-slug>`.

### Customer-facing
- Public shop URL: `<host>/shops/<pilot-slug>` — shop name, opening hours, live wait estimate, "Join queue" button.
- Join flow: first name + phone → OTP → tracking URL.
- Status page: `<host>/queue/<trackingToken>` — position, ETA, arrival prompt when called, terminal states when served or removed.
- Real-time updates via Socket.IO.

### Staff-facing
- Ops dashboard: `<host>/ops/shops/<pilot-slug>` — live queue, call next, start service, complete service, add walk-in, reinstate a missed customer, pause/resume queue.
- Sign in with the credentials the owner set at signup time.

### What we explicitly do NOT ship in the pilot
- Booking / reservations.
- Payments.
- WhatsApp / FCM push.
- Analytics dashboard.
- Manual queue reorder (staff can skip a customer or remove them and re-add; explicit reorder ships in Phase 1).
- Multi-industry theming (copy is barbershop-flavored).
- Setup checklist gate.
- Password reset self-service via email (users can request via API but no SMTP is wired for the pilot; admin can reset out of band if needed).

## The SMS Decision

Real SMS via Twilio costs money and creates account-setup friction. For the pilot we run in **`PILOT_MODE=true`**:

- OTP is generated and stored server-side exactly as in production.
- The OTP is **also returned in the join response** and shown on the customer's screen ("Your code is 4829 — enter it below").
- No SMS is sent. No Twilio account needed.

This is not secure and we're honest about that. For market validation with a friendly shop it's fine. Flipping `PILOT_MODE=false` and setting Twilio credentials switches to real SMS delivery. No code change needed.

## What the Shop Owner Needs to Have Ready

Before they open the signup form:

- Business display name.
- Owner name, email, mobile phone, and a chosen password (min 10 chars).
- Address (line 1, city, postal code, country code).
- Latitude + longitude of the front door (Google Maps → right-click → copy coords), OR they can search the address in the map on the signup form.
- Opening hours as a free-text note (e.g. `Mon-Sat 09:00-19:00, Sun closed`).
- Number of service stations (chairs).
- Industry type (`BARBER` for the pilot shop).

The signup form uses Google Maps to confirm the pin. **A Google Maps JS API key must be set** in `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for the map preview to render — but the form still accepts manual lat/lng entry if the map is unavailable.

## Admin Approval

You (the platform admin) sign in at `<host>/signin` with your admin credentials, then go to `<host>/admin/business-signups`. Each pending signup shows:

- Business + owner details as filled.
- Latitude + longitude and confirmed pin.
- Buttons: **Approve** and **Reject** (with an optional reason).

Approval is idempotent-safe but not reversible in the UI — approved signups create real live shops. Reject if the details look wrong; the owner can submit a new signup.

## Deployment Shape

- **Database**: Supabase Postgres (free tier).
- **Web (Next.js)**: Vercel (free tier).
- **API (Express)**: Vercel serverless functions won't fit — Socket.IO needs a long-lived process. Deploy the API to **Render** or **Fly.io** free tier. Runbook uses Render.
- **Domain**: any free subdomain during the pilot. Custom domain later.
- **HTTPS**: required for the tracking-token URL to feel legitimate on mobile — every provider gives it for free.

Full details in [Pilot Runbook](./pilot-runbook.md).

## Day-1 Operational Plan

1. Deploy the app the night before (see runbook).
2. Log the shop owner into the signup form on their phone or your laptop, submit the pilot shop.
3. Approve it from your admin account.
4. The owner signs in on the shop tablet, confirms `/ops/shops/<slug>` loads their queue view.
5. Print a small A5 sign for the shop counter: shop URL + QR code to `/shops/<pilot-slug>`.
6. In person at opening: walk staff through the 5 actions they'll actually use (call, start, complete, add walk-in, pause).
7. Do a live end-to-end test: a member of our team joins the queue from their own phone, staff calls them, we complete the loop.
8. Stay in the shop for the first 2 hours to catch anything odd.
9. End of day 1: 15-minute debrief with the owner. Write down every friction point.

## Known Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Staff forget to press "complete service" and the queue stalls | Watch manually during pilot; auto-complete on next-called after idle timeout ships in Phase 1. |
| Customer joins remotely, then their phone dies | Arrival timeout expires them and the queue moves on. This is the arrival loop working correctly. |
| Wi-Fi in the shop drops | Socket.IO reconnects automatically; watch for stuck rows during the pilot. |
| A curious customer joins from far away and never arrives | Expected. Log it; it's data. |
| OTP being visible on-screen embarrasses us | The UI copy calls it "pilot mode" clearly. Owner already knows. |
| Owner forgets password | Admin (you) can rotate it directly against the database until self-service email reset is wired. |
| Prisma migrations fail against Supabase | Test the deploy the night before, not on day 1. |
| Google Maps key hits free quota | Extremely unlikely for a one-shop pilot; if it does, manual lat/lng entry still works. |

## After the Pilot

If pilot success criteria are met, start Phase 1 of the [Product Roadmap](./product-roadmap.md#phase-1--pilot-next) with the confidence that the core loop works. If not, take the feedback and rebuild the specific broken part before onboarding a second shop.

Do not onboard shop #2 until shop #1's pilot is done.
