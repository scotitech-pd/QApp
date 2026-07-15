# Q-App Wireframe Specs

## Purpose

This document turns the user flows into screen-level wireframe requirements for both sides of Q-App:

- Customer web app
- Business portal

These are not visual design comps. They define structure, content, actions, and states so product, design, and engineering can align before UI styling begins.

## Wireframe Principles

- Show waiting value early
- Minimize typing for customers
- Keep business actions one tap away during live operations
- Prioritize queue clarity over feature density
- Keep smart-arrival interactions obvious and lightweight

## Customer Web App

### C1. Nearby Shops List

Purpose:

Help the customer decide where to go based on real-time wait conditions.

Main sections:

- Header with Q-App branding and location/search
- Filter bar
- Shop cards list

Each shop card should show:

- Shop name
- Distance
- Open or closed
- Queue length
- Estimated wait
- Queue paused indicator if relevant
- Booking available badge if relevant
- Primary action: `View Shop`

Primary actions:

- Change location
- Search by area
- Open shop profile

Key states:

- Loading nearby results
- No shops found
- Location permission denied
- Queue paused shop

### C2. Shop Detail Page

Purpose:

Convert the customer into a queue join or booking action.

Main sections:

- Shop hero with name, address, status
- Real-time queue summary
- Booking availability summary
- Shop details
- Primary action area

Queue summary should show:

- Current queue size
- Estimated wait
- Last updated indicator
- Queue open or paused

Primary action area:

- `Join Queue`
- `Book Slot` when booking is available
- `Join Queue` only when no safe slots exist

Key states:

- Queue open
- Queue paused
- Booking unavailable due to load
- Shop closed

### C3. Join Queue Screen

Purpose:

Collect only the minimum information needed to create a queue entry.

Fields:

- Name
- Mobile number

Support text:

- Why phone number is needed
- That a live tracking link will be sent

Primary actions:

- `Continue`
- Back to shop

Key states:

- Valid form
- Invalid phone number
- Submission error

### C4. OTP Verification Screen

Purpose:

Verify remote queue joins with minimum friction.

Main elements:

- OTP code inputs
- Phone number confirmation
- Resend timer

Primary actions:

- `Verify`
- `Resend Code`

Key states:

- Waiting for code
- Incorrect code
- Code expired
- Too many attempts

### C5. Queue Join Confirmation Screen

Purpose:

Confirm successful queue entry and reduce customer anxiety immediately.

Main sections:

- Success banner
- Queue position
- Estimated wait
- Shop summary
- Live status link CTA

Primary actions:

- `Track My Queue`
- `Done`

### C6. Live Queue Status Screen

Purpose:

Give customers a simple real-time view without requiring login.

Main sections:

- Current status badge
- Position and ETA panel
- Progress explanation
- Action bar

Status examples:

- In queue
- Near turn
- Called now
- Missed
- Completed

Action bar:

- `Leave Queue`
- `Refresh`

Optional message area:

- Shop is delayed
- Walk-in added
- Timing changed

### C7. Arrival Confirmation Screen

Purpose:

Capture the differentiating `Are you coming?` interaction clearly.

Main sections:

- Alert headline
- Current ETA or position context
- Two clear response buttons

Primary actions:

- `Yes, I'm Coming`
- `No, Remove Me`

Key states:

- Response pending
- Confirmed coming
- Removed from queue
- Response expired

### C8. Called Now Screen

Purpose:

Tell the customer it is time to present themselves at the shop.

Main sections:

- Called now banner
- Grace period countdown
- Shop arrival reminder

Primary actions:

- `I'm Here` if the business chooses to expose this later
- `Need More Time` for future versions only

MVP note:

The business remains the authority for marking actual arrival.

### C9. Leave Queue Confirmation Modal

Purpose:

Prevent accidental queue exits.

Content:

- Short consequence message
- Confirm or cancel actions

Primary actions:

- `Yes, Leave Queue`
- `Stay in Queue`

### C10. Booking Slot Selection Screen

Phase:

Phase 3

Purpose:

Let the customer select from only the slots the system can safely honor.

Main sections:

- Service selector
- Date selector
- Available slots grid

Rules:

- Hide slots if schedule load is too high
- If no slots are valid, show `Join Queue` path instead

Primary actions:

- Select slot
- Continue to payment

### C11. Booking Payment Screen

Phase:

Phase 3

Purpose:

Collect booking fee cleanly and transparently.

Main sections:

- Booking summary
- Service summary
- Fee summary
- Payment form

Primary actions:

- `Pay Booking Fee`

Key states:

- Payment processing
- Payment failed
- Payment success

### C12. Future Smart Arrival Screen

Phase:

Phase 4+

Purpose:

Surface the `Leave in X minutes` recommendation when location-aware travel timing is enabled.

Main sections:

- Leave recommendation
- Queue ETA
- Travel time
- Location permission state

Primary actions:

- `Enable Location`
- `Okay`

## Business Portal

### B1. Business Signup Screen

Purpose:

Capture high-intent business leads.

Fields:

- Business name
- Owner name
- Mobile number
- Email
- Address
- Industry type
- Number of chairs or stations
- Opening hours

Mandatory location capture:

- Request browser location access
- Show detected location on map
- Allow address search fallback
- Allow drag-and-drop pin correction
- Require `Confirm Location` before `Create Business`

Primary actions:

- `Confirm Location`
- `Create Business`

Key states:

- Pending approval confirmation
- Missing required fields
- Location permission denied
- Detected pin inaccurate
- Map pin not yet confirmed

### B2. Onboarding Checklist Screen

Purpose:

Guide a new business to operational readiness.

Checklist items:

- Verify contact details
- Confirm shop location pin
- Add staff
- Complete profile
- Configure queue settings
- Review public listing
- Submit for approval

Primary actions:

- Continue each setup task
- Submit for review

### B3. Business Profile Setup Screen

Purpose:

Configure the public-facing shop profile.

Main sections:

- Logo or cover upload
- Public description
- Contact details
- Address and map pin

Map section should support:

- Current saved coordinates
- `Use My Current Location`
- Search by address or place
- Drag pin to correct exact storefront position

Primary actions:

- `Save Draft`
- `Continue`

### B4. Staff Setup Screen

Purpose:

Create the operator and provider roster.

Main sections:

- Staff list
- Invite form
- Staff role selector

Roles:

- Owner
- Manager
- Staff operator

Primary actions:

- `Add Staff`
- `Invite Staff`
- `Deactivate`

### B5. Queue Settings Screen

Purpose:

Define the core operating rules for a location.

Main settings:

- Queue enabled
- Booking enabled
- Default walk-in duration
- Near-turn trigger settings
- Grace period
- Notification preferences

Primary actions:

- `Save Settings`

### B6. Daily Queue Dashboard

Purpose:

Act as the main operating console for the shop.

Main layout:

- Top summary bar
- Active queue column
- Current in-service panel
- Quick action bar

Top summary bar:

- Queue active or paused
- Customers waiting
- Average ETA
- Bookings today

Queue entry card should show:

- Customer name
- Position
- ETA
- Confirmation status
- Called or missed badge

Quick actions:

- `Add Customer`
- `Add Walk-In`
- `Call Next`
- `Pause Queue`

### B7. Add Customer Modal

Purpose:

Add in-store customers quickly.

Fields:

- Customer name
- Mobile number optional

Primary actions:

- `Add to Queue`

### B8. Add Walk-In Modal

Purpose:

Insert a walk-in into the live operational flow.

Fields:

- Customer name or short identifier
- Mobile number optional
- Estimated duration
- Optional reason

Primary actions:

- `Add Walk-In`

Result:

- Queue recalculates
- Affected ETAs update

### B9. Queue Entry Detail Drawer

Purpose:

Give staff entry-level actions without leaving the dashboard.

Details shown:

- Customer info
- Queue timestamps
- Confirmation history
- Current ETA
- Notes

Actions:

- `Call Customer`
- `Mark Arrived`
- `Reorder`
- `Remove`
- `Reinstate`

### B10. Start Service Panel

Purpose:

Begin service explicitly and assign an available provider.

Fields:

- Assigned provider
- Planned duration
- Notes optional

Primary actions:

- `Start Service`

### B11. Extend Service Modal

Purpose:

Update timing when service scope changes.

Fields:

- Extension type
- Extra minutes
- Optional note

Primary actions:

- `Apply Extension`

Result:

- Visit duration updates
- Queue ETAs recalculate

### B12. Complete Service Action

Purpose:

Close the visit and release the next queue movement.

Confirmation content:

- Customer name
- Actual duration summary

Primary actions:

- `Complete Service`

### B13. Pause Queue Modal

Purpose:

Temporarily stop new queue joins without disrupting current customers.

Fields:

- Pause reason
- Internal note optional

Primary actions:

- `Pause Queue`
- `Resume Queue`

### B14. Booking Capacity Screen

Phase:

Phase 3

Purpose:

Control when booking slots should appear.

Main sections:

- Booking enablement
- Capacity rules
- Slot preview

Key logic visibility:

- If projected load is too high, no slots should be exposed
- Queue remains the only option in overloaded periods

### B15. Basic Analytics Screen

Purpose:

Show whether the system is improving operations.

Main cards:

- Queue joins today
- Customers served today
- Average wait time
- Queue abandonment
- Average service duration
- Peak demand hours

## Q-App Internal Admin

### A1. Business Approval Queue

Purpose:

Review and approve businesses before public launch.

Each record should show:

- Business name
- Industry
- Setup completion status
- Contact verification status

Primary actions:

- `Approve`
- `Request Changes`
- `Suspend`

### A2. Support Session Screen

Purpose:

Allow internal support to investigate operational issues safely.

Main sections:

- Business summary
- Current queue snapshot
- Recent events
- Support audit log

## Responsive Notes

- Customer screens should be mobile-first.
- Business dashboard should support tablet and desktop well.
- The queue dashboard should remain usable on narrow laptop screens without hiding core actions.

## Open Design Decisions

- Whether customer ETA is shown as exact minutes or as a range
- Whether queue status should visualize a progress timeline
- Whether arrival confirmation should appear as a full page or bottom sheet on mobile web
- How visible queue pause reasons should be to customers
- How much historical detail staff should see in the queue drawer
