# Q-App User Flows

## Purpose

This document translates the product decisions into practical user flows for both sides of Q-App:

- Customer side
- Business side

These flows are written for MVP-first execution, with clear notes where later phases expand the experience.

## Primary Actors

- Customer
- Business owner
- Manager
- Staff operator
- Q-App admin

## Product Model in One Line

Q-App is a shop-level live queue and booking system where businesses manage real operational flow and customers receive timing guidance so they arrive closer to their actual turn.

## Shared MVP Rules

- One queue per shop
- No provider selection in MVP
- Customer joins using phone number
- Staff assigns the next available provider operationally
- `Are you coming?` confirmation is part of the MVP
- If customer declines or does not respond, next customer can be promoted
- Walk-ins can be injected by staff and ETAs must recalculate

## Customer Side Flows

### 1. Discover and Evaluate a Shop

Goal:

Help a customer quickly decide whether to join a queue or choose another shop.

Flow:

1. Customer opens Q-App web app.
2. Customer allows location or searches by area.
3. System shows nearby shops.
4. Customer opens a shop profile.
5. Customer sees:
   - Shop name
   - Address
   - Open or closed status
   - Current queue length
   - Estimated waiting time
   - Queue open or paused status
   - Booking available or unavailable
6. Customer chooses one of:
   - `Join Queue`
   - `Book Slot`
   - Leave and browse other shops

Key UX rule:

The decision screen must feel lightweight. The customer should understand waiting time before being asked for details.

### 2. Join Queue Remotely

Goal:

Let a customer join the live queue with very little friction.

Flow:

1. Customer taps `Join Queue`.
2. System asks for:
   - Name
   - Mobile number
3. System sends one-time verification code for remote join.
4. Customer enters code.
5. System creates queue entry.
6. Customer sees confirmation screen with:
   - Queue position
   - Estimated waiting time
   - Shop details
   - Live status link
7. System sends SMS confirmation with secure queue link.

Success outcome:

Customer is in the queue and can track progress without creating a full account.

### 3. Join Queue In-Store

Goal:

Allow a walk-in customer to enter the system quickly when staff adds them at the counter.

Flow:

1. Customer arrives in person.
2. Staff taps `Add Customer`.
3. Staff enters:
   - Customer name or short customer identifier
   - Mobile number if available
4. System creates queue entry without OTP verification.
5. If mobile number is captured, customer can still receive status updates.

Note:

This path is important for real shops where not every customer wants to self-join.

### 4. Track Queue Status

Goal:

Keep the customer informed without spamming them.

Flow:

1. Customer opens secure queue status link.
2. System shows:
   - Current position
   - Estimated waiting time
   - Queue progress status
   - Whether the shop is running on time or delayed
3. Customer may receive meaningful updates such as:
   - Significant position change
   - Significant ETA change
   - Near-turn alert

Customer actions available:

- Stay in queue
- Leave queue
- Respond to arrival confirmation when prompted

### 5. Near-Turn and Arrival Confirmation

Goal:

Reduce no-shows and unnecessary in-shop waiting.

Flow:

1. System detects customer is near turn.
2. Trigger happens when customer is:
   - 2 positions away
   - Or about 15 minutes away
3. System sends near-turn alert.
4. System follows with `Are you coming?`
5. Customer chooses:
   - `Yes, I'm coming`
   - `No, remove me`
6. If customer taps `Yes`:
   - Queue entry stays active
   - System expects arrival during the grace window
7. If customer taps `No`:
   - Queue entry is released
   - Next customer is promoted
8. If customer does not respond within the defined window:
   - Queue entry is marked missed
   - Next customer is promoted

Why this matters:

This is the first operational layer of the smart-arrival engine.

### 6. Called Now and Arrival

Goal:

Handle the transition from waiting to service-ready.

Flow:

1. Staff calls the next customer.
2. System sends `Called now` state.
3. Customer arrives at the shop.
4. Staff confirms customer is present.
5. Customer moves from waiting state to ready-for-service state.
6. Staff starts service when provider becomes available.

Exception:

If customer does not arrive during the grace period, the entry can be marked missed.

### 7. Customer Leaves Queue Voluntarily

Goal:

Let customers exit cleanly so ETAs stay accurate.

Flow:

1. Customer opens secure status link.
2. Customer taps `Leave Queue`.
3. System asks for confirmation.
4. Customer confirms.
5. Queue entry is removed.
6. Remaining queue ETAs recalculate.

### 8. Book a Paid Time Slot

Phase:

Phase 3

Goal:

Allow a customer to reserve a time slot when the schedule can support it.

Flow:

1. Customer opens shop profile.
2. Customer sees either:
   - Available booking slots
   - Or only `Join Queue` if the business is too busy
3. Customer selects a slot.
4. Customer selects service.
5. System calculates duration and validates slot capacity.
6. Customer pays booking fee.
7. Booking is confirmed.
8. Customer receives confirmation and reminder messages.

Booking rule:

If projected queue load makes reliable service impossible, no booking slots should be shown.

### 9. Smart Arrival Future Flow

Phase:

Phase 4+

Goal:

Tell the customer when to leave based on real travel timing.

Flow:

1. Customer opts in to location access.
2. System estimates travel time to shop.
3. System combines:
   - Queue progress
   - Current ETA
   - Travel time
   - Confirmation behaviour
4. System sends `Leave in X minutes` recommendation.
5. Customer confirms or ignores.
6. Queue engine continues adjusting timing.

Example:

- Current wait: 18 minutes
- Travel time: 11 minutes
- Recommendation: leave in 7 minutes

## Business Side Flows

### 1. Business Signup and Approval

Goal:

Capture new business demand while controlling quality.

Flow:

1. Business owner opens Q-App business signup.
2. Owner enters:
   - Business name
   - Owner name
   - Mobile number
   - Email
   - Address
   - Confirmed map location
   - Industry type
   - Number of chairs or stations
   - Opening hours
3. System requests location access to detect the business location.
4. System drops a map pin using detected coordinates.
5. Owner reviews the pin.
6. If the pin is wrong, owner moves the pin or refines the address manually.
7. Owner confirms the final pin location.
8. Owner creates password or uses magic-link flow.
9. System creates business record in pending state with stored coordinates.
10. Owner sees onboarding checklist.
11. Q-App admin reviews submission.
12. If approved:
   - Business becomes eligible for public listing
13. If incomplete:
   - Owner is asked to finish setup

### 2. Business Setup Before Go-Live

Goal:

Make sure the shop is operationally ready before customers join.

Flow:

1. Owner logs in to portal.
2. Owner completes profile:
   - Logo or cover image
   - Public description
   - Contact details
   - Map pin verification if location was adjusted later
3. Owner adds staff members.
4. Owner sets:
   - Queue enabled
   - Booking enabled or disabled
   - Default walk-in duration
   - Notification preferences
5. Owner reviews live preview.
6. Owner submits for go-live.
7. Admin approves.

Important rule:

The location pin must be confirmed because Q-App uses stored coordinates for nearby discovery and distance calculations.

### 3. Open the Shop for Daily Operations

Goal:

Start a working day quickly.

Flow:

1. Manager or staff operator logs in.
2. Dashboard shows:
   - Current queue
   - Staff available today
   - Booking list for the day
   - Queue paused or active state
3. Staff confirms queue is open.
4. Shop begins accepting joins.

Alternative:

If staffing problem exists, queue can be paused before customers join.

### 4. Monitor Live Queue Dashboard

Goal:

Give operators one operational screen for the day.

Flow:

1. Staff views queue dashboard.
2. Each queue entry shows:
   - Customer name
   - Position
   - Wait estimate
   - Arrival confirmation state
   - Called or missed status
3. Staff can:
   - Add customer
   - Add walk-in customer
   - Reorder queue
   - Pause queue
   - Call next
   - Start service
   - Complete service
   - Extend service

### 5. Add Walk-In Customer

Goal:

Reflect real-world walk-in demand inside the live queue.

Flow:

1. Walk-in customer arrives physically.
2. Staff taps `Add Walk-In Customer`.
3. Staff enters:
   - Customer name or short identifier
   - Optional mobile number
   - Estimated duration
   - Optional reason or note
4. System applies business default duration if staff does not edit it.
5. Queue is recalculated.
6. Affected customers receive updated ETAs if change is meaningful.

Operational outcome:

Walk-ins are not hidden from the system. They become part of the live queue logic.

### 6. Call Next Customer

Goal:

Move the queue forward while keeping timing accurate.

Flow:

1. Staff taps `Call Next`.
2. System identifies next eligible customer.
3. System checks:
   - Confirmation state
   - Missed or active state
   - Booking protection if relevant
4. System marks customer as called.
5. Customer receives called alert.
6. Staff waits for arrival within grace window.

If no arrival:

- Entry can move to missed
- Next customer is promoted

### 7. Start Service

Goal:

Begin service explicitly so actual durations are captured.

Flow:

1. Customer is physically present.
2. Staff selects queue entry.
3. Staff taps `Start Service`.
4. Staff assigns available provider.
5. System changes entry to in-service state.
6. Start time is stored for analytics.

### 8. Extend Service Mid-Flow

Goal:

Allow real service changes without breaking trust.

Flow:

1. Staff opens active service.
2. Staff taps `Extend Service`.
3. Staff chooses:
   - Predefined extension
   - Or manual note
4. System adjusts expected duration.
5. Queue ETAs recalculate.
6. Affected customers receive delay update if needed.

### 9. Complete Service

Goal:

Close the visit and feed the ETA engine with real data.

Flow:

1. Staff opens active service.
2. Staff taps `Complete Service`.
3. System records:
   - End time
   - Actual duration
   - Assigned provider
4. Customer leaves completed state.
5. Queue updates and next customer becomes eligible.

### 10. Handle Missed Customer

Goal:

Keep the queue moving fairly.

Flow:

1. Customer receives near-turn and `Are you coming?`
2. Customer does not respond or does not arrive in grace window.
3. System marks entry as missed.
4. Next customer is promoted.
5. Staff can optionally reinstate the missed customer once during the day.

Important rule:

The queue should not stall waiting for silent customers.

### 11. Pause Queue Intake

Goal:

Protect service quality when operations are under strain.

Flow:

1. Manager taps `Pause Queue`.
2. Manager optionally selects reason:
   - Short staffed
   - Delay
   - Temporary break
   - Other
3. System blocks new joins.
4. Existing queue continues.
5. Public shop page shows queue paused.
6. Manager later resumes queue intake.

### 12. Manage Booking Availability

Phase:

Phase 3

Goal:

Expose paid slots only when the shop can actually honor them.

Flow:

1. Owner or manager enables bookings.
2. System evaluates operating capacity.
3. System considers:
   - Open hours
   - Active queue load
   - Average service durations
   - Existing bookings
4. System shows only safe bookable slots.
5. If schedule is too busy:
   - No slots are shown
   - Customer only sees `Join Queue`

### 13. Daily Insight Review

Goal:

Help the business understand whether Q-App is improving operations.

Flow:

1. Owner opens dashboard.
2. Owner reviews:
   - Queue joins
   - Customers served
   - Average wait time
   - Queue abandonment
   - Average service duration
   - Peak demand hours
3. Owner adjusts staffing or queue settings over time.

## Cross-System Event Flow

This is the core system loop that connects both sides:

1. Customer joins queue
2. Business dashboard updates live
3. ETA is recalculated
4. Customer receives queue updates
5. Staff adds walk-ins or service extensions as needed
6. ETA recalculates again
7. Near-turn and confirmation messages are sent
8. Customer confirms or drops
9. Staff starts and completes service
10. Actual duration feeds future ETA quality

## MVP Screens Implied by These Flows

### Customer

- Nearby shops list
- Shop detail page
- Join queue screen
- OTP verification screen
- Queue status screen
- Arrival confirmation screen
- Booking screen

### Business

- Signup screen
- Setup checklist
- Daily queue dashboard
- Add customer modal
- Add walk-in modal
- Service detail panel
- Booking capacity settings
- Basic analytics dashboard

## Open UX Decisions Still Worth Designing

- How frequently queue ETA should refresh visually
- How long the response window should be for `Are you coming?`
- Whether missed customers see rejoin or reinstate options themselves
- How much detail to show publicly about current queue state
- Whether shop pause reason should be visible to customers
