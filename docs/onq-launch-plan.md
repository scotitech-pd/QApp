# OnQ — Launch Sprint Plan (QR-first)

Written 2026-08-20 · Supersedes conflicting details in execution-plan.md · Name: **OnQ** (pending founder's 10-min trademark/store search before Phase 2 listings)

## Product law (locked)

1. **QR is the universal entry point; the app is the preferred surface.** Scanning the counter QR joins via the bare-minimum web page (join, track, confirm — nothing else) so nobody is ever forced to install. The OnQ app is the full experience — its home screen has **Scan shop QR**, so in-shop customers scan the same code and join through the app. Web fallback stays minimal by design; richness lives in the app.
2. **Every surface must be understandable by a first-time user with zero explanation.** If a screen needs a tutorial, the screen is wrong.
3. **LAN first.** Everything is proven on local network (Mac + phones on shop/home Wi-Fi) before any hosting spend.

## Architecture for QR-first

- QR encodes `http://<host>/shops/<slug>` (LAN IP during testing; domain later). One printed counter sign per shop.
- Join flow (web): name + phone → on-screen OTP (PILOT_MODE) → live tracking page `/queue/<token>`.
- Owner runs the floor from the OnQ owner app (native) or web portal on any tablet/phone.

## How customers learn it's their turn (the notification ladder)

| Rung | When | Mechanism | Reliability |
|---|---|---|---|
| 1. Live page | Pilot (LAN, HTTP) | Tracking page updates in ~2s via Socket.IO; when called it flips to a full-screen "It's your turn" state + chime + vibration (Vibration API) + flashing title. Page shows "Keep this page open" banner. | High if page open; zero if phone locked long |
| 2. Human fallback | Pilot | Position + name on the owner's screen — barber calls out the name, exactly like today. OnQ's job is that the person is *back in the shop* by then thanks to the "Are you coming?" ping sent at position ≤2. | High — this is what shops already do |
| 3. Web Push | Hosted (HTTPS) | Push permission prompt on the tracking page. Works on Android Chrome even with screen locked; iOS only for installed PWA (16.4+). | Med-high on Android |
| 3b. **App push (BUILT)** | Native app | Expo push token registered per queue entry; API fires near-turn / are-you-coming / your-turn / missed automatically. Local banner+sound layer works everywhere incl. Expo Go; remote (closed-app) delivery activates in dev/TestFlight builds. Verified: lock-screen notification "It's your turn!" in simulator. | High |
| 4. WhatsApp/SMS | Phase 2 (₹) | Template message "You're next at {shop}" via WhatsApp Business API / MSG91 (DLT — paperwork starts during pilot). | Highest, costs money |

Honest statement: with a locked phone on rung 1, only rungs 3–4 reach the customer. The pilot design compensates by pinging early ("Are you coming?" at position 2, ~15 min out) while the customer is still actively glancing at the page, and by the human call-out. This mirrors reality: people waiting for a haircut check their phone every few minutes.

## Sprint tracker

Status: ✅ done · 🔄 in progress · ⬜ todo · Owner: F = Founder, C = Claude

### Sprint 0 — Foundation (DONE, for the record)
| ID | Module | Item | Status |
|---|---|---|---|
| S0.1 | API | Queue engine E2E (join→OTP→call→confirm→serve), verified by real HTTP runs | ✅ |
| S0.2 | API | Self-serve signup + admin approval → owner login + default service | ✅ |
| S0.3 | API | Insights + customer-records endpoints (live DB queries) | ✅ |
| S0.4 | Web | Customer + owner + admin surfaces, PWA manifest/SW/icons | ✅ |
| S0.5 | Native | Expo app: customer flow + owner floor/records/insights in approved blueprint design | ✅ |
| S0.6 | Infra | Supabase migrated + seeded; Vercel web deploy; Render blueprint in repo | ✅ |
| S0.7 | Design | Claude Design blueprint system implemented (both apps) | ✅ |

### Sprint 1 — QR-first joining, LAN (Aug 20–24)
| ID | Module | Item | Owner | Status |
|---|---|---|---|---|
| S1.1 | Brand | Rename Q-App → OnQ across web, native, manifest, copy | C | ✅ |
| S1.2 | Web/owner | Printable QR page per shop (`/ops/shops/<slug>/qr`): big QR + shop name + "Scan to join the queue" — print-ready A5 | C | ✅ |
| S1.3 | Web/customer | "Your turn" alert on tracking page: chime + vibration + flashing title + "keep page open" banner (verified live: title flips to "🔔 Your turn — OnQ", page flips to Go now state via socket) | C | ✅ |
| S1.4 | Web/customer | QR-entry polish: compact hero, join card above the fold | C | ✅ |
| S1.5 | QA | Two-phone LAN test via real QR scan: join on phone A, run floor on phone B, full loop incl. no-show branch — code-side loop verified in browser+simulator; founder phone test pending | F+C | 🔄 |
| S1.6 | Native | **Scan shop QR** on app home (expo-camera): scan counter code → shop opens in-app → join through app | C | ✅ |

### Sprint 2 — Shop readiness, LAN (Aug 25–28)
| ID | Module | Item | Owner | Status |
|---|---|---|---|---|
| S2.1 | Owner | Shop-device drill — technical half done in simulator: Done→served-today tick, Call→Start rotation, +10 min extend (20→30m), walk-in Sunil added, missed-turn auto-promotion observed. Staff-unaided half stays with founder | F+C | 🔄 |
| S2.2 | Web/owner | Staff one-pager built at `/ops/shops/<slug>/staff-guide` (print-ready, five actions + missed-turn/+10 min notes). Founder prints both | F+C | 🔄 |
| S2.3 | API | Stall guard: drill surfaced a seed visit "in chair 98057 min" — exactly the forgotten-Done failure. Spec below; insights now clamp duration outliers (≤8h) | C | ✅ |
| S2.4 | Ops | D2 paperwork: start WhatsApp Business / MSG91 DLT registration (weeks of lead time) | F | ⬜ |
| S2.5 | Gate | **G0**: full loop with zero laptop involvement on shop Wi-Fi | F+C | ⬜ |

### Sprint 3 — Pilot (Aug 31 – Sep 25, 4 weeks)
| ID | Item | Target |
|---|---|---|
| S3.1 | Week 1 daily on-site, same-day friction fixes | All blockers < 24h |
| S3.2 | Weekly owner debrief (staff hate? / customers ask? / pay ₹X?) | 4 debriefs logged |
| S3.3 | Remote joins per week | ≥20 by week 4 |
| S3.4 | Called → arrived within grace | ≥80% |
| S3.5 | Staff solo operation | By week 2 |
| S3.6 | Scope freeze: bugs only; ideas → backlog | 0 feature builds |
| S3.7 | **G1 gate review Sep 28** | 4/4 criteria → Phase 2 |

### Sprint 4 — Hosted + notifications (built 2026-08-20; founder items marked)
| ID | Module | Item | Status |
|---|---|---|---|
| S4.1 | Infra | Deploy API to founder's server (or Render), domain + HTTPS, repoint web/native/QRs | 🔄 founder — `render.yaml` ready; needs D1 + domain |
| S4.2 | Web | Web Push on tracking page: VAPID keys, SW `push`/`notificationclick`, "Turn on alerts" subscribes + registers per queue entry; server fires on near-turn / are-you-coming / your-turn / missed | ✅ |
| S4.3 | API | Notification providers: MSG91 SMS + WhatsApp Cloud API adapters (env-driven, WhatsApp tried first for alerts, SMS for OTP), Twilio kept, preview fallback | ✅ code — activation needs MSG91/WhatsApp credentials + DLT template (founder) |
| S4.4 | Owner | Queue reorder: `POST /ops/shops/:slug/queue/reorder` + ↑/↓ on waiting rows in the owner app; recalculates ETAs and emits live updates | ✅ |
| S4.5 | Mobile | Release APK (local gradle) + iOS project generated for archive; TestFlight upload = founder's App Store Connect session | 🔄 APK building; iOS archive/upload founder |
| S4.6 | Growth | Onboard shops 2–10, walkable radius | founder |
| S4.7 | Native | Universal/App Links: `/.well-known/apple-app-site-association` + `assetlinks.json` served from env; `app.config.js` adds associatedDomains + autoVerify intent filters; app opens `/shops/<slug>` from any link | ✅ prepped — activates with domain (S4.1) + release-keystore SHA-256 |
| S4.8 | Native+API | Customer accounts: Sign in with Apple (server-verified via Apple JWKS) + Google (tokeninfo, needs client IDs); Me tab with visit history; claim merges the phone-based record into the account so history is complete; joining stays account-free | ✅ — Google activates with OAuth client IDs (founder) |

Correction to an earlier note: walk-ins are already auto-confirmed by the lifecycle (no unanswerable "are you coming?"); the "On their way" tag on a walk-in is that auto-confirm.

## Stall guard spec (S2.3 output, build in Sprint 4)

Observed in the Sprint 2 drill: a visit left IN_SERVICE indefinitely ("started 98057 min ago") because nobody tapped Done. Rules:

1. Dashboard highlight: any in-chair visit past 2× its slot shows amber with a "Still going? +10 min / Done" nudge.
2. Auto-complete: at closing time (or 3× slot, whichever first) the visit auto-completes with `autoCompleted: true` so records stay truthful without staff action.
3. Insights already ignore durations >8h when averaging (shipped).

## Full user journey (pilot, LAN) — the verification script

### Ravi, 31, wants a haircut on Saturday

1. **Sees the sign** at Sharma Hair Studio's counter (or the shop's WhatsApp status): *"Skip the wait — scan to join the queue."* He scans with his camera. No app store, no download.
2. His browser opens the shop page: **"Sharma Hair Studio — 4 waiting · about 48 min"** with a join card: first name, mobile number, one button: **Join the queue**.
3. He enters "Ravi", his number, taps join. The code appears on screen (pilot mode) — he types it, taps **Confirm**. Total time: under 60 seconds.
4. Lands on his live page: **"#5 · about 48 min to go · we'll ask you to confirm when it's nearly your turn. Keep this page open."** He walks to the chemist and the chai stall. Glances at the page twice; it says #3, then #2.
5. At **position 2** the page flips: **"It's nearly your turn. Are you coming?"** — phone vibrates, chime plays. He taps **Yes, on my way** and walks back (5 min).
6. As he arrives, the barber's screen shows "Ravi · on their way". Barber taps **Start** when Ravi sits. 20 min later, **Done**. Ravi's page: **"All done — thanks!"** with 5 stars. He taps 4.
7. Ravi never installed anything. Next Saturday he scans again — same phone number, the shop's customer record now shows "Ravi · 2 visits".

**The failure branches (equally important):**
- Ravi ignores the "are you coming" ping (phone in pocket, page closed): the grace timer expires, he's marked missed, #3 is promoted. When he checks his phone: **"You missed your turn — no problem, you can join again."** The barber sees him under "Missed turn" and can tap **Re-add** if he walks in a minute later. Nobody argues.
- A walk-in uncle arrives who'll never scan anything: barber taps **+ Walk-in**, types "Sunil", he's #4 in the same queue. Remote and walk-in customers wait in one fair line.
- Rush hour, chair breaks: barber taps **⏸ Pause queue** — the shop page says "not taking new customers right now"; those already in queue are unaffected.

### Sharma, the owner, same Saturday

1. Opens the OnQ owner app on the counter phone (signed in once, weeks ago). Sees: **IN QUEUE 4 · EST. CLEAR 48m · SERVED TODAY 11**, and one big button: **"Call next — Ravi"**.
2. His whole day is four verbs: **Call, Start, Done, + Walk-in.** A client runs long → **+10 min** on the "In chair" card; everyone's wait shifts automatically.
3. Evening: **Customers** tab — 23 records built from the day, no data entry. **Earnings** tab — served count, busiest hours (6–8pm peak highlighted), this week ▲12% vs last.
4. What Sharma stops doing: answering "kitna time lagega?" 40 times a day, and managing the plastic-chairs argument about who's next. The screen is the referee.

### The founder (admin), once per shop
Shop owner fills the signup on their own phone (name, phone, pin on map, chairs, hours) → founder taps **Approve** in the admin panel → shop is live with a printable QR. Ten minutes, once.

