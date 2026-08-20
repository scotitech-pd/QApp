# Q-App Execution Plan

Owner: Founder (Pradeep) · Product: Q-App · Written: 2026-08-20 · Status: ACTIVE — this is the operating document. Where it conflicts with older docs, this wins.

## 1. Product thesis

Nobody should sit in a salon waiting. Customers join the queue from anywhere and arrive right on time; owners run the floor from one screen and get customer records + earnings for free as a by-product. Validation market: independent barbershops/salons in India (Bengaluru first). Free during validation; pricing only after the loop is loved.

## 2. Where we actually are (honest audit)

| Piece | State | Verified |
|---|---|---|
| Queue engine API (join → OTP → call → confirm → serve) | Built | ✅ E2E via real HTTP calls, repeatedly |
| Self-serve shop signup + admin approval (creates owner login + service) | Built | ✅ E2E |
| Owner insights + customer-records endpoints | Built | ✅ live queries |
| Web app (customer + owner + admin, PWA installable) | Built, deployed on Vercel | ✅ visual + flow checks |
| Database | Supabase live, migrated, seeded | ✅ |
| Native app (Expo, iOS+Android): customer flow + owner floor/records/insights in the approved blueprint design | Built | ✅ typecheck + simulator; LAN-tested |
| API hosting | **NOT deployed** (Render blueprint ready; founder wants own server) | ❌ blocker |
| Mobile release builds (APK / TestFlight) | Toolchain + Scotitech cert verified; build interrupted | ⏳ |
| Real SMS | PILOT_MODE (on-screen OTP) — deliberate | n/a |
| Payments / pricing | Deliberately absent | n/a |

The single blocker between "code" and "pilot" is **API hosting**. Everything else is polish.

## 3. Locked decisions (stop re-litigating)

1. Barbers first, salons second (per product-decisions-v1).
2. One pilot shop (founder's contact) before any scale.
3. Free for everyone during validation. Pricing decided from pilot debrief data, not before.
4. Customer surface = native app + PWA fallback; owner surface = native app (+ web portal).
5. On-screen OTP during pilot (no SMS spend). Real SMS/WhatsApp only after pilot signal.
6. Design system = the approved blueprint design (Claude Design project). No redesigns until pilot ends.
7. Tech stack frozen: Express/Prisma/Postgres/Socket.IO + Next.js + Expo. No Flutter, no rewrites.

## 4. Phases, dates, gates

### Phase 0 — Close the gap (Thu Aug 20 → Fri Aug 28)
Goal: everything a real shop needs, running on real infrastructure.

1. **Deploy API** to founder's server (or Render free tier as interim — decision D1 below). HTTPS, env from pilot-runbook.
2. Point Vercel web + mobile `config.ts` at the hosted API; rebuild.
3. Produce the **release APK** (build was interrupted — rerun) and install on 2 real Android phones.
4. Full E2E smoke on hosted stack (signup → approve → join → serve), per pilot-runbook checklist.
5. Onboard the pilot shop **for real**: owner fills signup on their phone, founder approves, owner signs into the app on the shop device.
6. Print counter sign with QR → shop URL.

Exit gate G0: the founder can join the pilot shop's queue from a phone on mobile data and be served end-to-end with zero laptop involvement.

### Phase 1 — Pilot (Mon Aug 31 → Fri Sep 25, 4 weeks)
Goal: prove real customers and real staff use the loop unassisted.

- Week 1: founder on-site daily, 2h/day. Fix friction same-day.
- Weeks 2–4: remote monitoring, one on-site visit/week, weekly 15-min owner debrief (structured: what did staff hate / what did customers ask / would you pay ₹X?).
- Scope freeze: only bugs and pilot-blocking friction get built. Feature ideas go to the backlog, not the sprint.

Success criteria (from pilot-launch.md, unchanged):
- ≥20 remote joins per week by week 4
- ≥80% of called customers arrive within grace period
- Staff run the queue solo by week 2
- ≥5 pieces of structured qualitative feedback

Exit gate G1 (Mon Sep 28): all four met → Phase 2. Any missed → fix the specific broken thing, extend pilot 2 weeks. Two consecutive misses of the same metric → revisit thesis honestly.

### Phase 2 — Second cohort + channels (Oct)
Only after G1 passes.

- Onboard 5–10 shops in the same neighbourhood (walkable support radius).
- Real notifications for India: **WhatsApp Business API or MSG91 SMS — requires DLT registration, which takes weeks; start paperwork during Phase 1** (decision D2).
- Queue reorder for staff (top backlog gap from Epic 3).
- TestFlight (Scotitech account) + Play Store internal testing track ($25).
- Basic weekly owner email/report from the insights endpoint.

Exit gate G2 (end Oct): ≥5 shops active weekly, ≥60% shop retention week-over-week, willingness-to-pay signal from ≥3 owners.

### Phase 3 — Monetize + public launch (Nov–Dec)
- Pricing pilot from debrief data (placeholder hypothesis: ₹999/shop/month, free tier ≤10 customers/day).
- Public Play Store + App Store listings.
- Payments-on-file NOT built yet — invoice manually first; build billing only after 10 paying shops.
- Salon vertical prep (second market per decisions doc).

## 5. Operating cadence

- **Daily during launch week**, then weekly product review (30 min): pilot metrics vs targets, top 3 frictions, next week's 3 commitments.
- Metrics come from the insights + ops endpoints; no analytics tooling until Phase 2.
- Every scope addition must name the metric it moves and what it displaces. Otherwise it's backlog.

## 6. Top risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| API on founder-managed server goes down mid-shift | Med | Health-check cron + uptime alert; Render blueprint stays as 10-min fallback redeploy |
| Staff stop pressing Done and queue stalls | High | Week-1 on-site coaching; auto-complete timer is the first Phase 2 fix if observed |
| Customers baulk at on-screen OTP ("is this real?") | Med | Copy already says test mode; measure verify-rate; accelerate D2 if <80% |
| India SMS DLT delays block Phase 2 notifications | High | Start DLT registration during Phase 1 (weeks of lead time); WhatsApp Business as parallel path |
| Single dev dependency (all code by one agent+founder) | Med | Docs current; repo on GitHub; runbooks written |
| Shop #2–10 recruitment slower than hoped | Med | Pilot shop owner as reference + neighbourhood walk-ins with live demo on founder's phone |

## 7. Founder decisions needed (blocking)

- **D1 (blocks Phase 0):** API hosting — your own server (give me SSH/provider details) or Render free tier interim? Either works; own-server needs a domain + HTTPS story.
- **D2 (blocks Phase 2 timing):** notification channel for India — MSG91 SMS (needs DLT registration, start now) vs WhatsApp Business API vs both. Zero build needed during pilot; paperwork lead time is the issue.
- **D3 (blocks real onboarding):** pilot shop's real details — name, address, coordinates, hours, chairs, owner's email/phone.
- **D4 (nice-to-have):** public app name check — is "Q-App" the name we ship to stores, or do we brand properly before the store listings in Phase 2?

## 8. Next 10 days — concrete tickets

| # | Ticket | Owner | Due |
|---|---|---|---|
| 1 | Decide D1, provision hosting, deploy API + HTTPS | Founder + Claude | Aug 22 |
| 2 | Repoint Vercel + mobile config; redeploy/rebuild | Claude | Aug 22 |
| 3 | Rebuild release APK; install on 2 Android phones | Claude + Founder | Aug 23 |
| 4 | Hosted-stack E2E smoke per runbook | Claude | Aug 23 |
| 5 | D3 data collected; real shop onboarded via signup+approve | Founder | Aug 26 |
| 6 | Counter sign printed (QR); staff one-pager | Founder | Aug 27 |
| 7 | Dry-run shift with staff (fake customers) | Founder | Aug 28 |
| 8 | G0 gate check; go/no-go for Aug 31 launch | Both | Aug 28 |
| 9 | Start DLT/WhatsApp Business paperwork (D2) | Founder | Aug 28 |

