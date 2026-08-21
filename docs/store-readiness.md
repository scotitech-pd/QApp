# Store Readiness — App Store & Google Play

What reviewers check, and where OnQ stands. Tick before each submission.

## Account & privacy (both stores)
- [x] **Privacy policy URL** — `/privacy` on the web app (set the hosted URL in both store listings).
- [x] **Terms** — `/terms`.
- [x] **In-app account deletion** — Me → Account → Delete account (App Store 5.1.1(v); Play "account deletion" policy). Scrubs name, email, phone, avatar, provider links, favourites, push tokens; anonymises visit rows.
- [x] **Web deletion path** — `/account-deletion` (Play Data Safety requires a URL reachable outside the app).
- [x] **Sign in with Apple offered alongside Google** (App Store 4.8).
- [x] **Joining a queue needs no account** — core function is not gated by login.
- [ ] **Play Data Safety form** — declare: name, phone, email (optional), approximate/precise location (optional, not stored), device push token. No ads, no sale, no third-party sharing beyond hosting.
- [ ] **App Privacy (App Store Connect)** — same declarations; "Data Linked to You": contact info (name, phone, email), identifiers (user ID); "Not linked": coarse location.

## Permissions (purpose strings present)
- [x] Location (when in use) — `NSLocationWhenInUseUsageDescription`, Android `ACCESS_FINE_LOCATION` requested at runtime with context.
- [x] Camera — QR scanner purpose string.
- [x] Notifications — runtime prompt only when the user has a queue place.

## Identity & versioning
- [x] App name **OnQ**, bundle/package `com.scotitech.qapp`.
- [x] Version `1.0.0`, iOS build `1`, Android `versionCode 1` — **bump both on every upload**.
- [x] Version shown in-app (Me tab footer) so support tickets carry it.
- [ ] App icon 1024×1024 without alpha (iOS) and adaptive icon (Android) — current icon is a placeholder glyph; replace with final artwork before submission.
- [ ] Screenshots: 6.7" + 6.1" iPhone; Android phone (+ 7" tablet optional).

## Review logistics
- [ ] **Demo account for reviewers** — provide the seeded staff login in the review notes (owner side) and note that customer flow needs no login.
- [ ] Review notes: explain the two surfaces (customer / shop), that OTP is on-screen in pilot mode, and how to trigger "your turn" (ops dashboard → Call).
- [ ] Support URL + contact email in both listings.
- [ ] Age rating: 4+ / Everyone (no UGC beyond verified-visit reviews; reviews are moderated via owner reports — add a report action later if Apple asks).

## Technical
- [x] Production API over HTTPS (blocked on hosting + domain — see founder checklist).
- [x] No dev-only UI in release builds (dev prefill is `__DEV__`-gated; Expo dev overlays absent in release).
- [ ] Remove `usesCleartextTraffic` once the API is HTTPS.
- [ ] Crash-free smoke on a physical iPhone and a physical Android before each upload.
