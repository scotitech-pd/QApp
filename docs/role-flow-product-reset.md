# Q-App Role and Flow Product Reset

## Purpose

This document resets the Q-App web experience back to the original product intent.

The current backend and API work is useful, but the visible web UI has drifted into a testing surface. A serious product should not expose the internal build process, debug tools, demo credentials, or disconnected route choices to normal users.

The product should feel like three clear experiences:

- Customer
- Shop owner
- Q-App admin

Internal roles such as manager, staff operator, and admin support can still exist in the backend. They should not become separate top-level products in the main UI.

## Honest Current Gap

The current UI does not meet the product expectation because it mixes:

- customer queue flows
- shop owner operations
- admin approval
- API test lab
- docs navigation
- demo routes
- preview routes
- credential presets

This makes the app feel like a developer sandbox, not a product.

Specific problems:

- The home page describes the project instead of starting a useful workflow.
- `Device Lab`, `Docs`, and `Smart Arrival Preview` are visible as primary product actions.
- The sign-in screen exposes demo presets, which feels unserious outside a test-only route.
- The navigation shows too many concepts at once: Home, Shops, Business, Lab, Ops, Admin.
- The shop owner flow starts at an operations dashboard before onboarding, setup, and business readiness are clear.
- The customer queue flow is functional but not emotionally reassuring enough for a consumer product.
- The admin screen exists, but it is not framed as an internal back office.

## Correct User-Facing Role Model

### 1. Customer

Customer means the person looking for a nearby service business and joining a queue.

Customer should not need an account in the MVP.

Customer actions:

- Find nearby shops
- View live wait and queue status
- Join queue with name and phone
- Verify phone
- Track queue position
- Respond to `Are you coming?`
- Leave queue

Primary customer routes:

- `/`
- `/shops`
- `/shops/[slug]`
- `/queue/[trackingToken]`

Customer mental model:

I want to know where to go, how long I will wait, and when I should arrive.

### 2. Shop Owner

Shop owner means the business-side product.

For MVP simplicity, owner, manager, and staff operator can share one visible portal called `Shop Portal`. Permissions can still differ internally.

Shop owner actions:

- Register business
- Confirm exact map pin
- Complete onboarding checklist
- Invite staff
- Configure queue settings
- Open or pause queue
- Add walk-ins
- Call next customer
- Start service
- Complete service
- See live queue state

Primary shop owner routes:

- `/shop/signin`
- `/shop/signup`
- `/shop/onboarding`
- `/shop/dashboard`
- `/shop/settings`

Shop owner mental model:

I need to run today’s queue quickly while the system keeps customers informed.

### 3. Q-App Admin

Admin means the internal Q-App team.

Admin should be clearly separated from customer and shop owner experiences.

Admin actions:

- Review pending businesses
- Approve, reject, or request changes
- Inspect shop location quality
- Review support/security activity
- Suspend or intervene when needed

Primary admin routes:

- `/admin/signin`
- `/admin/businesses`
- `/admin/businesses/[id]`
- `/admin/security`

Admin mental model:

I need to keep the marketplace trustworthy and support live operations.

## Route Reset

### Product Routes To Keep Public

- `/`
- `/shops`
- `/shops/[slug]`
- `/queue/[trackingToken]`
- `/shop/signup`
- `/shop/signin`
- `/admin/signin`

### Product Routes To Protect

- `/shop/onboarding`
- `/shop/dashboard`
- `/shop/settings`
- `/admin/businesses`
- `/admin/security`

### Routes To Hide From Product Navigation

These can still exist for development, but must not appear in normal navigation:

- `/lab`
- `/docs`
- `/previews/smart-arrival`
- demo-only route shortcuts
- credential preset controls

If retained, these should sit behind a development-only entry point or environment flag.

## Correct First Screen

The first screen should not be a roadmap or documentation page.

Recommended MVP first screen:

- mobile-first nearby shop discovery
- search/location input at the top
- live wait cards below
- shop owner and admin links small and secondary

Primary customer CTA:

- `Find a shop`

Secondary business CTA:

- `For shops`

Secondary admin CTA:

- only visible on internal/admin entry or footer

## Customer Flow Reset

The customer flow should be a guided sequence:

1. Open Q-App
2. See nearby shops and wait times
3. Open shop
4. Tap `Join Queue`
5. Enter name and phone
6. Verify OTP
7. Land on queue status page
8. Receive `Are you coming?`
9. Confirm or leave queue

Important UI rules:

- No account creation for customers in MVP
- No provider selection
- No technical language
- No API/test labels
- Queue status must feel calm and trustworthy
- `Are you coming?` must be visually central, not buried inside a test panel

## Shop Owner Flow Reset

The shop owner flow should be a portal, not scattered pages.

Recommended sequence:

1. Owner signs up
2. Owner confirms location pin
3. Owner sees pending approval state
4. After approval, owner completes setup checklist
5. Owner opens daily dashboard
6. Owner operates queue

The shop dashboard should become the main business screen.

It should include:

- queue active or paused state
- customers waiting
- current service
- `Add Walk-In`
- `Call Next`
- `Start`
- `Complete`
- arrival confirmation state
- simple settings access

Do not show staff invitation and admin-like controls as equal weight to live queue actions. They are secondary.

## Admin Flow Reset

The admin flow should feel like a back office.

Recommended sequence:

1. Admin signs in
2. Admin lands on pending business queue
3. Admin opens a business review detail
4. Admin checks contact, address, map pin, and setup status
5. Admin approves or requests changes

The admin UI should not sit in the same nav hierarchy as customer browsing.

## Backend Role Mapping

The API can keep detailed permission roles.

Visible product mapping:

- Customer: guest queue user
- Shop owner: `OWNER`, `MANAGER`, `STAFF_OPERATOR`
- Q-App admin: `PLATFORM_ADMIN`

In the UI:

- `OWNER`, `MANAGER`, and `STAFF_OPERATOR` should all enter the Shop Portal
- Permission differences can hide or show specific controls inside the portal
- They should not appear as separate product roles during onboarding

## Visual Direction

Q-App should feel operational, modern, and trustworthy.

Avoid:

- roadmap cards
- documentation-first homepage
- debug JSON panels in product routes
- visible demo credentials
- too many rounded marketing cards
- beige-heavy visual language
- buttons for every possible backend endpoint

Prefer:

- dense but calm mobile layouts
- bottom action bars for customer queue actions
- clear status bars for shop operations
- focused task screens
- short labels
- role-specific navigation
- one primary action per screen

## Build Reset Plan

### Step 1: Separate Product UI From Testing UI

Move `/lab`, `/docs`, and `/previews/*` out of primary navigation.

Keep them only as development tools.

### Step 2: Replace Home Page

Make `/` the customer discovery entry point.

The first page should show:

- location/search
- nearby shops
- live wait
- queue status
- primary action to view a shop

### Step 3: Create Role Entry Points

Create clear entry points:

- `/shop/signin`
- `/shop/signup`
- `/admin/signin`

The shared auth system can stay underneath, but the user sees the role they intended to use.

### Step 4: Rebuild Shop Portal Around Daily Operations

Make `/shop/dashboard` the shop owner’s primary screen.

Focus first on:

- waiting queue
- in service
- add walk-in
- call next
- start service
- complete service
- pause/resume queue

Move invitations and settings behind secondary tabs.

### Step 5: Rebuild Admin As Back Office

Make admin review feel internal and focused:

- pending businesses list
- review detail
- approve
- request changes
- reject/suspend

### Step 6: Polish Customer Queue Journey

Split join and OTP into a more natural mobile flow:

- shop detail
- join form
- OTP
- queue status
- arrival confirmation

Do not expose `codePreview` outside development mode.

## Success Criteria For The Reset

The reset is successful when a first-time tester can answer these questions without explanation:

- Am I a customer, shop owner, or admin?
- What should I do first?
- Where am I in the queue journey?
- What is the shop expected to do next?
- Why did the queue move?
- How do I get back to the main screen for my role?

## Recommended Immediate Next Build

Start with a UI reset before adding more backend capability.

Recommended order:

1. Hide debug/dev routes from primary navigation
2. Replace `/` with customer shop discovery
3. Create `/shop/signin` and `/admin/signin`
4. Rename business-facing routes from `ops` to `shop`
5. Rework shop dashboard into a mobile-first daily operations screen
6. Move test credentials and JSON panels into `/lab` only
7. Rebuild customer join as a clean step-by-step flow

This will not throw away the backend work. It will wrap it in the correct product experience.
