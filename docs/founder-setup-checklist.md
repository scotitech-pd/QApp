# Founder Setup Checklist

What OnQ needs from the founder to go from "works on the Mac" to "live for the pilot shop", in priority order. Each item says exactly what to do, what to hand over, and what Claude does next. Costs are listed; everything not marked is free.

Legend: 🔴 blocks the pilot · 🟠 blocks a feature already built · 🟢 later

---

## 1. 🔴 Hosting for the API (decision D1) — 30 min

The web app (Vercel) and the database (Supabase) are already hosted. The API is the only missing piece, and everything hosted waits on it.

**Option A — Render (fastest, free tier):**
1. Create an account at render.com with GitHub.
2. New → **Blueprint** → select `scotitech-pd/QApp`. It reads `render.yaml`.
3. When prompted, paste:
   - `DATABASE_URL` — Supabase pooler string (port 6543, `?pgbouncer=true`)
   - `DIRECT_URL` — Supabase session string (port 5432)
   - `APP_BASE_URL` — your Vercel URL (e.g. `https://q-app.vercel.app`)
   - `NEXT_PUBLIC_API_BASE_URL` — leave blank, fill after the first deploy with the Render URL
   - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — ask Claude (generated, kept out of chat)
4. Send Claude the Render URL (e.g. `https://q-app-api.onrender.com`).

**Option B — your own server:** give Claude SSH access (or a deploy user), the OS, and the domain; Claude installs Node 20 + PM2/systemd, reverse proxy with HTTPS, and the same env.

**Claude then:** runs the 5 new migrations against Supabase, points Vercel and the apps at the API, runs the G0 checklist end to end, rebuilds the APK against the hosted API.

## 2. 🔴 A domain — 15 min, ~£10/yr

Needed for: QR signs that never change, iOS Universal Links / Android App Links, Web Push on real phones (HTTPS), and a non-embarrassing URL on the counter sign.

1. Buy a domain (e.g. `onq.in`, `getonq.app`).
2. DNS: `@` / `www` → Vercel (Vercel shows the records), `api` → Render (CNAME).
3. Tell Claude the domain.

**Claude then:** sets `ONQ_PUBLIC_DOMAIN`, regenerates the apps with associated domains, confirms `/.well-known/apple-app-site-association` and `assetlinks.json` serve, reprints the QR signs.

## 3. 🔴 Secrets hygiene — 10 min

- Rotate the Supabase DB password (Settings → Database → Reset) — the old one was pasted in chat. Send the new one privately or put it in `.env`.
- Change the demo admin password, or ask Claude for the `create-admin` script and make your own platform-admin account. The demo admin (`admin@qapp.demo`) should not exist in production.

## 4. 🟠 Apple — 45 min (you already pay the $99/yr)

1. developer.apple.com → Identifiers → `com.scotitech.qapp` → enable **Sign in with Apple**, **Push Notifications**, **Associated Domains**.
2. **APNs Auth Key**: Keys → create a key with Apple Push Notifications service → download the `.p8` once → note the Key ID and Team ID (`L5VNLM8G7B`). This is what lets Expo's push service reach iPhones.
3. On this Mac: Xcode → Settings → Accounts → sign in with the Scotitech Apple ID (enables automatic signing for dev builds and archives).
4. App Store Connect → New App → name **OnQ**, bundle `com.scotitech.qapp` (for TestFlight).
5. Free Expo account (expo.dev) — Claude uploads the APNs key there with `eas credentials`; no paid EAS plan needed.

**Claude then:** builds the dev build (Apple sign-in + remote push testable on your iPhone), archives for TestFlight; you press Upload in Xcode (needs your session).

## 5. 🟠 Google — 30 min, free

1. Google Cloud console → a project (the one with the Maps key is fine) → APIs & Services → Credentials → **OAuth client IDs**:
   - iOS: bundle `com.scotitech.qapp`
   - Android: package `com.scotitech.qapp` + SHA-1 of the release keystore (Claude provides it)
   - Web application
2. Send the three client IDs.
3. Firebase: create a project, add the Android app (`com.scotitech.qapp`), download `google-services.json`, and create a **service account key** (Project settings → Service accounts) — this is what lets Expo's push service reach Android phones.
4. (Optional, web signup map only) Maps JavaScript + Geocoding API key → `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` on Vercel.

**Claude then:** sets the IDs in env, verifies Google sign-in, uploads FCM credentials to Expo, confirms Android push.

## 6. 🟠 Messaging for India — start now, weeks of lead time

Not needed for the pilot (on-screen OTP + app/web push cover it), but the paperwork is slow, so start during the pilot.

- **WhatsApp Business (recommended first):** business.facebook.com → Meta Business verification → WhatsApp Cloud API → phone number ID + permanent access token → submit a template ("It's nearly your turn at {{1}}…"). Hand over: phone number ID, token, template name.
- **MSG91 SMS:** account → DLT registration (entity ID, 6-char sender ID, template with variables) → hand over: auth key, sender ID, template ID.

**Claude then:** pastes into env — the adapters are already built; no code change.

## 7. 🟢 Stores — when the pilot has proven the loop

- Google Play Console — $25 once. Claude generates a proper release keystore (you keep it safe — losing it means you can never update the app) and an AAB.
- Apple TestFlight first, then App Store review.

## 8. 🔴 The pilot shop itself

- Owner registers in the OnQ app (Shop tab → Register your shop) standing in the shop, so the GPS pin is the front door.
- You approve at `/admin` (check "Open in Maps").
- Print the QR sign and staff guide from the approval panel links.
- Day 1: run the staff drill from the plan's Sprint 2.

---

## Hand-over summary (what to actually send Claude)

| Item | Where it goes |
|---|---|
| Render URL (or server SSH) | API hosting |
| Domain name | Deep links, push, QR |
| New Supabase password | `.env` / Render |
| APNs `.p8` + Key ID, App Store Connect app created | iOS push + TestFlight |
| 3 Google OAuth client IDs | Google sign-in |
| Firebase service-account JSON + `google-services.json` | Android push |
| WhatsApp phone-number ID + token + template / MSG91 keys | India alerts |
| Confirmation Xcode is signed in | Dev build + archive |

Send secrets via `.env` on this Mac or a password manager share — not chat.
