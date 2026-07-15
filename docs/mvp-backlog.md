# Q-App MVP Backlog

## Purpose

This backlog turns the product documents into a build order for the first serious MVP.

## Release Goal

Ship one operational slice that proves:

- businesses can sign up with accurate location
- customers can join a live queue
- staff can operate the queue in real time
- the `Are you coming?` loop keeps the queue moving

## Epic 1: Business Onboarding

### Goal

Enable a business to register, confirm exact map location, and reach approval state.

### Stories

- As a business owner, I can sign up with business and owner details.
- As a business owner, I must confirm my map pin before signup completes.
- As a business owner, I can move the map pin if auto-detected coordinates are wrong.
- As Q-App admin, I can review a pending business and approve or reject it.
- As a business owner, I can complete a setup checklist before going live.

### Acceptance Focus

- Location coordinates are stored reliably.
- A business cannot become public without approval.

## Epic 2: Customer Queue Entry

### Goal

Let customers discover a shop and join the queue with minimal friction.

### Stories

- As a customer, I can browse nearby shops and see wait times.
- As a customer, I can join a queue using my name and phone number.
- As a customer, I receive OTP verification for remote join.
- As a customer, I get a secure live queue status link after joining.
- As a customer, I can leave the queue myself.

### Acceptance Focus

- Queue join is fast on mobile web.
- Queue status works without full account creation.

## Epic 3: Live Queue Operations

### Goal

Give the business a daily operating console that staff can actually use.

### Stories

- As staff, I can see the current queue live.
- As staff, I can add an in-store customer.
- As staff, I can add a walk-in customer with default or edited duration.
- As staff, I can call the next customer.
- As staff, I can start and complete service.
- As staff, I can reorder the queue when needed.
- As staff, I can pause queue intake temporarily.

### Acceptance Focus

- Queue updates are reflected on both sides in real time.
- Operator actions are one or two taps from the dashboard.

## Epic 4: Smart Arrival Seed

### Goal

Prove the first differentiating loop of Q-App.

### Stories

- As a customer, I receive a near-turn alert.
- As a customer, I can answer `Yes, I'm coming` or `No, remove me`.
- As the system, I promote the next customer if there is no response.
- As staff, I can see confirmation state on the queue dashboard.
- As staff, I can reinstate a missed customer once if needed.

### Acceptance Focus

- The queue does not stall on silent customers.
- Confirmation events are tracked for analytics.

## Epic 5: ETA and Queue Recalculation

### Goal

Keep wait estimates useful when operations change.

### Stories

- As the system, I recalculate ETAs when a walk-in is added.
- As the system, I recalculate ETAs when service starts late.
- As the system, I recalculate ETAs when service duration is extended.
- As a customer, I receive meaningful delay updates only when needed.

### Acceptance Focus

- Recalculation is auditable.
- Customers are not spammed by every tiny movement.

## Epic 6: Admin and Support

### Goal

Give Q-App enough internal control to operate the early marketplace.

### Stories

- As admin, I can view pending businesses.
- As admin, I can inspect a location and its queue activity.
- As admin, I can suspend a problematic business.
- As admin, I can view operational events for support troubleshooting.

## Phase 1 Build Order

1. Business signup with mandatory map pin confirmation
2. Admin approval flow
3. Customer nearby shops and shop detail pages
4. Customer join queue plus OTP
5. Business live queue dashboard
6. Add customer and add walk-in
7. Call next, `Are you coming?`, and auto-promotion
8. Start service and complete service
9. Recalculate ETA and show meaningful queue updates

## First Vertical Slice

The first end-to-end slice should include:

1. One business signs up and confirms location
2. Admin approves the business
3. Customer sees the shop nearby
4. Customer joins queue
5. Staff sees customer in dashboard
6. Staff calls next
7. Customer responds to `Are you coming?`
8. Staff starts and completes service

If this works cleanly, the product core is real.

## Nice-to-Have After Core Slice

- Queue pause reasons shown to customers
- Basic analytics dashboard
- WhatsApp notification channel
- Booking availability groundwork
