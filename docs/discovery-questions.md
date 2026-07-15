# Q-App Discovery Questions

These are the most important questions to answer before implementation begins. They focus on the parts of the product where workflow clarity will affect architecture, UX, and business rules.

Recommended default answers for these questions now live in [Product Decisions v1](./product-decisions-v1.md).

## 1. Business Onboarding

- How does a shop owner discover Q-App?
- Can a business self-register, or does the Q-App team onboard them manually at first?
- What information is required to create a business account?
- Does one owner manage one business or multiple business locations?
- Can a business invite staff members later?
- Does onboarding require approval before the business appears publicly?

## 2. Customer Onboarding

- Can a customer join a queue as a guest in Phase 1, or must they create an account?
- What minimum information is required to join the queue?
- Should phone number verification be mandatory?
- Can a customer track their queue position without logging in?
- How should repeat customers be recognized across future visits?

## 3. Queue Behaviour

- Is the queue global for the whole shop or separate by staff member?
- Can customers choose a specific barber or provider in Phase 1?
- Can a business manually reorder the queue?
- What happens if a customer does not arrive when called?
- Can a business pause the queue temporarily?
- Can a customer leave the queue themselves?

## 4. Service Flow

- What exactly marks a service as started?
- Can staff switch a customer from one provider to another?
- Are service extensions chosen from a predefined list or entered freely?
- Should completed services store actual duration for later analytics?

## 5. Booking Rules

- When premium bookings begin, can a shop reserve only certain times for bookings?
- Do bookings always take priority over queue customers?
- What happens if a booking customer arrives late?
- Are booking fees refundable, transferable, or forfeited?

## 6. Notifications

- Which channels are required in Phase 1: SMS, email, web push, or only in-app/web state changes?
- What is the exact trigger for a near-turn alert?
- Should customers confirm they are on the way?
- How many reminders should be sent before removing someone from the queue?

## 7. Payments

- Who pays Stripe fees: Q-App, the business, or the customer?
- Is the booking fee platform revenue only, or part of the business transaction?
- Will businesses eventually accept full service payments through Q-App?

## 8. Multi-Industry Expansion

- Which non-barber industry should be the second expansion target?
- Which parts of the workflow differ most by industry: duration, consent, staff assignment, or compliance?
- Should Q-App support industry templates during onboarding?

## 9. Operations and Admin

- Does Q-App need an internal admin panel from the beginning?
- Should Q-App staff be able to impersonate or assist businesses for support?
- What KPIs should business owners see in the dashboard in Phase 1?

## 10. Legal and Privacy

- How will location consent be collected for smart arrival features?
- What customer data should be retained, and for how long?
- Are there industry-specific consent or compliance requirements for beauty or healthcare-adjacent businesses?

## Recommended First Clarifications

If we continue from planning into implementation, the highest-value next answers are:

1. Business owner onboarding flow
2. Customer join-queue flow
3. Queue rules around late arrivals and no-shows
4. Whether queueing is shop-level or staff-level in Phase 1
5. Which notification channels are required in the MVP
