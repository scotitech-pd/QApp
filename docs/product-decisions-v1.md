# Q-App Product Decisions v1

## Purpose

This document answers the discovery questions with realistic default product decisions for an MVP that can be sold, operated, and expanded.

These are not permanent truths. They are recommended starting decisions to reduce ambiguity and help the team design the product like a serious business system.

## Product Strategy Position

### Initial Market

Start with independent barbershops and small multi-chair barber businesses.

Why:

- High walk-in volume
- Visible waiting pain
- Operational simplicity compared with healthcare-adjacent sectors
- Faster feedback loops
- Lower compliance burden than clinics

### Second Expansion Market

Expand second into salons.

Why:

- Operationally close to barbers
- Similar queue and booking patterns
- More complex service durations, which helps strengthen the engine
- Easier expansion path than jumping directly into regulated industries

### Expansion Order Recommendation

Recommended sequence:

1. Barbers
2. Salons
3. Nail studios
4. Beauty clinics
5. Tattoo studios
6. Car washes
7. Vehicle service centres
8. Physiotherapy clinics
9. Dental clinics

Healthcare-adjacent categories should come later because consent, compliance, and service workflows become materially more complex.

## 1. Business Onboarding

### Recommended Answer

Phase 1 should use hybrid onboarding:

- Self-serve business registration
- Manual Q-App approval before the business becomes publicly discoverable

### Why

This gives fast lead capture without sacrificing marketplace quality.

In an early-stage product, manual approval helps prevent:

- Fake businesses
- Incomplete profiles
- Poor customer experience from unprepared shops

### Required Business Registration Fields

- Business name
- Owner full name
- Mobile number
- Email
- Password or magic-link login
- Business address
- Confirmed map pin and geo coordinates
- Industry type
- Number of active staff chairs or service stations
- Opening hours

### Location Capture Rule

Accurate business geolocation should be mandatory during signup.

Recommended rule:

- The signup flow requests location access to help detect the shop position automatically
- The detected position is shown on a map
- The business must confirm the map pin before continuing
- If the detected pin is wrong, the business can drag the pin or search again manually

Why:

- Nearby-shop discovery depends on accurate location
- Customer distance calculations depend on accurate location
- Future travel-time and smart-arrival features depend on accurate location

### Additional Setup Fields Before Go-Live

- Staff members
- Public profile photo or logo
- Queue enabled status
- Walk-in policy
- Buffer time settings

### Ownership Model

One owner account can manage multiple locations under one business group.

Why:

- Serious businesses often expand to multiple branches
- It avoids redesign later
- It still works for single-location shops

### Staff Management

Business owners can invite staff later by SMS or email.

Phase 1 staff access can be simple:

- Owner
- Manager
- Staff operator

### Approval Rule

A business should require approval before appearing in public discovery.

Q-App internal checks before approval:

- Contact details verified
- Address valid
- Geo pin confirmed
- Hours completed
- At least one staff member added
- Business understands queue workflow

## 2. Customer Onboarding

### Recommended Answer

Phase 1 customers should be able to join as guests.

Account creation should be optional, not required.

### Why

For queue products, every extra step reduces conversion.

If the customer is standing outside a busy shop, forcing account creation will hurt adoption.

### Minimum Join-Queue Information

- Name
- Mobile number

### Verification Rule

Phone number verification should be lightweight but required for remote queue join.

Recommended rule:

- If joining remotely, verify with one-time code
- If added by staff in-store, no verification required

### Queue Tracking Without Login

Yes.

Customers should receive a secure queue status link by SMS.

Why:

- Reduces friction
- Avoids password fatigue
- Works well for occasional users

### Repeat Customer Recognition

Use the verified mobile number as the primary customer identity key in early phases.

Later, optional full accounts can layer on top.

### Guest Memory and Future Account Linking

Q-App should remember lightweight guest preferences on the device after a successful OTP verification.

Recommended early device memory:

- verified first name
- verified mobile number
- favourite shops
- recent queue tracking link
- last joined shop

When a customer creates an account later, Q-App should link:

- matching verified mobile number to the existing customer record
- anonymous device preference profile to the account
- saved favourite shops to the account
- previous visits and ratings connected to that phone/customer identity

Why:

- repeat customers can quick-join without typing every time
- favourites and visit history are not lost when accounts are introduced
- customer accounts remain optional instead of blocking the MVP journey

## 3. Queue Behaviour

### Recommended Queue Model

Phase 1 should be shop-level queue only.

Why:

- Simpler for MVP operations
- Easier for businesses to understand
- Stronger ETA reliability
- Cleaner customer UX
- Avoids queue fragmentation early

### Staff Assignment Rule

The shop assigns the next available suitable staff member when service starts.

Customers do not choose a specific provider in the MVP.

Provider preference can be introduced in a later version after queue prediction is stable.

### Manual Reordering

Yes, managers should be able to reorder the queue manually, with audit logging.

Why:

- Real operations are messy
- VIPs, returning customers, children, and errors happen
- A rigid system will be abandoned

### Late Arrival Rule

When called, the customer enters a grace period.

Recommended Phase 1 rule:

- Near-turn alert sent before their turn
- `Are you coming?` confirmation request sent before final call
- Called status lasts 5 minutes
- If the customer confirms, hold their place for the grace window
- If the customer declines or does not respond, status becomes missed
- The next customer is promoted automatically
- Staff can reinstate once within the same day

### Arrival Confirmation Rule

Yes, arrival confirmation should be part of the MVP because it is a core differentiator.

Recommended lightweight MVP flow:

1. Customer joins queue
2. System tracks ETA and queue progress
3. Near-turn alert is triggered
4. Customer receives `Are you coming?`
5. Customer can respond `Yes` or `No`
6. If `Yes`, keep them active
7. If `No` or no response within the defined window, release the turn and promote the next customer

The full travel-aware version can become more intelligent later, but the confirmation loop itself should exist from the start.

### Queue Pause Rule

Yes, a shop can pause queue intake temporarily.

Examples:

- Staff shortage
- Equipment issue
- Unexpected delay

When paused:

- New joins are blocked
- Existing queued customers remain active

### Customer Self-Removal

Yes, customers should be able to leave the queue themselves through the secure status link.

This improves ETA quality and keeps the queue honest.

## 4. Service Flow

### Service Start

A service starts when staff explicitly taps `Start Service`.

Do not infer service start automatically from queue position.

Why:

- Real shops are unpredictable
- Explicit actions produce cleaner data

### Service Completion

A service completes only when staff taps `Complete Service`.

This ensures duration history is intentional and auditable.

### Staff Reassignment

Yes, a customer can be reassigned to another provider before service starts.

If reassignment happens after service start, require manager permission.

### Service Extensions

Phase 1 should support both:

- Predefined extension types
- Free-text manual extension note

Recommended predefined examples:

- Beard
- Facial
- Wash
- Design work
- Additional treatment

Why:

- Structured options improve analytics
- Free-text avoids blocking real operations

### Duration Tracking

Yes, actual service duration must always be stored.

This is essential for Phase 2 ETA accuracy.

### Walk-In Injection Workflow

Walk-in handling should be explicit in the MVP.

Recommended workflow:

1. Staff taps `Add Walk-In Customer`
2. Staff enters customer name or short identifier
3. System applies a default estimated duration set by the business
4. Staff can adjust the estimated duration if needed
5. Optional reason can be added
6. System inserts the walk-in into the active operating flow
7. Queue ETAs are recalculated
8. Affected customers receive updated wait estimates

This is a core operational workflow, not an edge case.

## 5. Booking Rules

### Time Slot Exposure

Businesses should be able to expose only selected time windows for premium bookings.

Why:

- Most operators will not want bookings to consume the entire day
- This protects walk-in economics

### Slot Availability Rule

If the business is too busy, no booking slots should be shown.

The customer should only see `Join Queue`.

Recommended default logic:

- Slot visibility should depend on projected queue completion and available scheduling capacity
- If the operating schedule cannot absorb a timed booking without causing service failure, the slot should not appear
- Service duration must be included in slot calculation

In the barber MVP, a simple approximation can be used first, such as a rough queue-duration multiplier based on active queue load and expected average service time.

### Priority Rule

Bookings should have protected priority only within their booked time window.

Recommended rule:

- Booked customers should be served within a defined tolerance
- Walk-in queue remains active around those windows

This is more realistic than giving bookings absolute priority at all times.

### Late Booking Rule

Recommended booking grace policy:

- 5 minutes late: still valid
- 5 to 10 minutes late: business may accept or downgrade to walk-in queue
- More than 10 minutes late: booking marked no-show by default

### Refund Rule

Phase 3 MVP default:

- Booking fee is non-refundable
- Business-caused cancellations always refundable

Why:

- Easier for customers to understand
- Easier for businesses to operate
- Easier for finance and support handling in the MVP

### Fee Treatment

The booking fee should initially be platform revenue, not part of the service payment.

Why:

- Simpler accounting
- Cleaner marketplace business model
- Easier for shops to adopt early

## 6. Notifications

### Phase 1 Notification Channels

Required for MVP:

- SMS
- Real-time web status page

Optional later:

- Web push
- Email
- Mobile push

### Why SMS First

SMS is the most realistic early channel for queue operations because:

- It reaches non-app users
- It works instantly
- It reduces friction

### Near-Turn Trigger

The near-turn alert should trigger when the customer is either:

- 2 positions away
- Or estimated 15 minutes away

Whichever happens first.

This combines queue position and ETA safety.

### On-The-Way Confirmation

Required in Phase 1.

Recommended customer response options:

- `Yes, I'm coming`
- `No, remove me`

If there is no response within the defined confirmation window, the system can promote the next customer.

### Reminder and Missed Logic

Recommended sequence:

1. Join confirmation immediately
2. Position change notifications only when meaningful
3. Near-turn alert
4. `Are you coming?`
5. Called now alert
6. Missed-turn alert if grace period expires or no response is received

Do not spam every small queue movement.

## 7. Payments

### Stripe Fee Handling

In Phase 3, the customer should pay the booking fee plus any payment processing fee only if market testing shows low conversion impact.

Default internal assumption:

- Q-App absorbs Stripe fees initially

Why:

- Cleaner customer pricing
- Simpler message during validation

### Business Revenue Model

Initial model:

- Platform keeps booking fee
- Business still collects service payment directly offline

Later model:

- Optional full service payments through Q-App

### Long-Term Payment Direction

Yes, businesses should eventually be able to accept full service payments through Q-App, but not in Phase 1 or early Phase 3.

## 8. Multi-Industry Expansion

### Recommended Second Industry

Salons.

### Biggest Cross-Industry Workflow Differences

The most important differences by industry are:

- Service duration variability
- Staff specialization
- Intake and consent requirements
- Booking dependency versus walk-in dependency

### Industry Templates

Yes, Q-App should support industry templates during onboarding.

Each template can prefill:

- Common service types
- Typical durations
- Queue defaults
- Booking defaults
- Required intake fields

This keeps the core engine generic while making onboarding feel tailored.

## 9. Operations and Admin

### Internal Admin Panel

Yes, Q-App needs a lightweight internal admin panel from the beginning.

Minimum admin capabilities:

- Approve businesses
- Suspend businesses
- View queue activity
- View customer support logs
- Trigger support actions

### Impersonation and Support Access

Yes, but only as secure support-session access with audit logging.

Why:

- Early-stage B2B products need hands-on support
- This can save churn during onboarding

### Phase 1 Business KPIs

Business owners should see:

- Total queue joins today
- Customers served today
- Average wait time today
- Queue abandonment count
- Average service duration
- Peak demand hours

Keep analytics simple and operational, not overly financial, in the MVP.

## 10. Legal and Privacy

### Location Consent

Location tracking must be opt-in, separate from general terms acceptance, and introduced only in the smart arrival phase.

The consent UX should clearly explain:

- Why location is requested
- When it is used
- How long it is retained
- How to turn it off

### Data Retention

Recommended early policy assumptions:

- Queue event history retained for analytics
- Customer profile basics retained while account or phone identity remains active
- Precise location data retained only as long as operationally necessary

Specific retention windows should be finalized with legal review before launch.

### Regulated Industries

Beauty clinics, physiotherapy clinics, and dental clinics should not reuse barber workflows blindly.

These sectors may require:

- Consent capture
- Appointment reason handling
- Privacy restrictions
- Staff qualification mapping

This is why they should come after the scheduling engine is proven in lower-risk industries.

## Core Differentiator: Smart Arrival Engine

Q-App should explicitly treat the smart arrival system as one of its strongest differentiators.

Core concept:

- Customer location or travel estimate
- Travel time
- Queue progress
- Confirmation state

Combined to decide when the customer should leave and whether the next customer should be promoted.

### MVP Form

The MVP should include the first operational layer of this idea:

- Queue ETA monitoring
- Near-turn alerting
- `Are you coming?` confirmation
- Auto-promotion when the customer declines or does not respond

### Future Form

The more advanced version expands this with:

- Live location consent
- Maps-based travel time
- `Leave now` timing recommendations
- Smarter no-show prevention

This is the feature family that helps Q-App become more than a generic booking product.

## MVP Default Decisions Summary

If the team needed to start product design today, the recommended defaults are:

1. Start with barbers, expand second into salons
2. Offer self-serve business signup with manual approval
3. Let customers join as guests using phone-based identity
4. Use one shop-level queue with no provider selection in the MVP
5. Use SMS plus live web status as MVP notifications
6. Make manual queue control and overrides available to businesses
7. Capture actual service durations from day one
8. Include `Are you coming?` confirmation and auto-promotion in the MVP
9. Treat booking fees as platform revenue first
10. Build a lightweight internal admin panel early
11. Keep the core scheduling engine industry-agnostic

## Decisions That Should Be Reviewed After 10 Live Shops

- Whether shop-level queueing is enough or staff-level queues are needed
- Whether the `Are you coming?` response window should vary by business type
- Whether customers need full accounts earlier than expected
- Whether SMS cost is justified versus WhatsApp or push alternatives
- Whether booking fees convert better at a fixed or dynamic price
- Whether salons should remain the second expansion market after observing real usage
