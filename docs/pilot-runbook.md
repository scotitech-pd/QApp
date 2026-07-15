# Pilot Runbook — Vercel + Supabase (+ Render)

Concrete, ordered checklist to get Q-App running at one real shop. Operational companion to [Pilot Launch Spec](./pilot-launch.md).

## Why this three-piece stack

- **Supabase** — hosted Postgres, free tier, generous limits, works out of the box with Prisma.
- **Vercel** — the Next.js web app is what Vercel is built for. Free tier is fine.
- **Render** (or Fly.io) — the Express API uses Socket.IO which needs a **long-lived process**. Vercel serverless functions are the wrong shape; Render's free web service is a good fit.

All three have a free tier that covers a one-shop pilot indefinitely.

## Timeline

- **T-3 days**: provision hosting, deploy staging, test the signup + approve loop.
- **T-1 day**: deploy production, print signage.
- **T-0 (day 1)**: owner submits signup on-site, you approve, staff runs the shift.
- **T+5 days**: debrief, decide whether to onboard shop #2.

## Prerequisites You Need Once

- A Supabase account (free).
- A Vercel account (free).
- A Render account (free).
- A Google Cloud project with the **Maps JavaScript API** enabled + an API key. The signup form uses it for pin confirmation. Restrict the key to your Vercel domain.

## Step 1: Provision Supabase Postgres

1. Create a new project. Region: closest to the pilot shop.
2. In the project settings → **Database** → **Connection string**, copy the "Session pooler" (or direct) `postgres://...` URL. This is your `DATABASE_URL`.
3. In the SQL editor confirm you have access with `SELECT 1;`.
4. Run Prisma migrations against it:
   ```bash
   DATABASE_URL="<your-supabase-url>" npx prisma migrate deploy
   ```
5. Optionally seed the admin account only (customers + shop come from real signups):
   ```bash
   DATABASE_URL="<your-supabase-url>" node prisma/seed-demo.mjs
   ```
   The demo seed also creates a fully-populated demo shop `demo-barber` — feel free to leave it or delete it manually before day 1.

## Step 2: Deploy the API on Render

1. New → **Web Service** → connect this repo.
2. Root directory: `apps/api`.
3. Build command: `npm install && npx prisma generate`.
4. Start command: `npx tsx src/index.ts`. (For a "real" production build later we'd `tsc` and run `node dist/index.js`; for the pilot `tsx` is fine.)
5. Environment variables:
   ```
   NODE_ENV=production
   PILOT_MODE=true
   PORT=10000
   DATABASE_URL=<from supabase>
   APP_BASE_URL=https://<your-vercel-domain>.vercel.app
   NEXT_PUBLIC_API_BASE_URL=https://<your-render-domain>.onrender.com
   AUTH_ACCESS_TOKEN_SECRET=<generate 64+ random chars>
   ```
6. Deploy. Once it's up, hit `https://<render-domain>.onrender.com/health` — you should see `{"data":{"service":"q-app-api","status":"ok",...}}`.

## Step 3: Deploy the Web App on Vercel

1. New Project → import this repo.
2. Root directory: `apps/web`.
3. Framework preset: Next.js (auto-detected).
4. Environment variables:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://<render-domain>.onrender.com
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<from google cloud>
   ```
5. Deploy.

## Step 4: Smoke Test the Deploy

Before touching the shop, from your own devices:

1. `https://<vercel-domain>/business/signup` — fill it with **test** data, use a placeholder address, set a password, confirm pin, submit. You should see "Pending Signup Created".
2. Sign in at `https://<vercel-domain>/signin` with the demo admin (from `prisma/seed-demo.mjs`):
   - email: `admin@qapp.demo`
   - password: `QappAdmin123!`
3. Go to `https://<vercel-domain>/admin/business-signups`. Your test signup is there. Click **Approve**.
4. Sign out; sign in with the test owner's email/password you set at signup. You should land in the ops dashboard for the new shop.
5. From a different device or incognito, go to `https://<vercel-domain>/shops/<the-new-slug>` → **Join queue** → enter name + phone → the OTP appears on the same screen → enter it → land on the live status page.
6. Back on the ops device: click **Call** on the row. The customer's phone should transition to the "you're up" state within ~2 seconds.
7. Tap **Yes, coming** on the customer phone. Ops dashboard updates.
8. Click **Start** then **Complete** on ops. The customer sees the terminal state.

If any step fails, **do not go to day 1**. Fix and re-test.

Clean up: reject or manually delete the test shop before the real one goes live.

## Step 5: Prepare Day-1 Materials

- **A5 counter sign** for the shop: "Skip the wait. Join the queue → " + shop URL + a QR code pointing at `/shops/<pilot-slug>`. Any free online QR generator will do.
- **Staff one-pager** with the 5 actions they'll use:
  1. **Call** — moves the top of the queue to the "Are you coming?" state.
  2. **Start** — begin service; the row is now IN_SERVICE.
  3. **Complete** — finish service; row leaves the queue.
  4. **Walk-in** — add a customer who walked in without joining online.
  5. **Pause** — stop accepting new joins (e.g. during lunch).
- Ops URL bookmarked on the shop tablet.

## Step 6: Real Onboarding On Day 1

1. Sit with the owner at their tablet or phone.
2. Open `https://<vercel-domain>/business/signup`.
3. Fill together: business name, owner name, mobile, email, **password they choose** (write it down where the owner can see, tear up the paper after they've signed in), address, opening hours, chairs, industry.
4. Use "Find Address" to drop the map pin, drag the pin to the exact front door if needed, then click **Confirm Location**.
5. Submit.
6. On your own device, sign in as admin, approve.
7. Owner signs in with their credentials — they land on their ops dashboard. Show them the queue view and the 5 actions.
8. Do the live end-to-end test with one of your own phones as the "customer".

## What to Watch on Day 1

- **API 5xx count** > 0 in Render logs → investigate immediately.
- **Socket.IO disconnects** > 1 per customer → shop Wi-Fi issue; note it, don't panic.
- **`ArrivalResponseStatus.EXPIRED` counts** — high count means the near-turn timer is too short for this shop; note for tuning after the pilot.
- **Verification challenges created / verified ratio** — verified should be > 80% within an hour of creation. Lower means customers are dropping off before entering the OTP.

## Rollback

There is nothing to roll back. If the deployment is broken, tell the shop "we're not using it today" and fix it. Do not leave a half-working queue running.

## After the Pilot

At T+5 days, sit with the shop owner for 30 minutes:

- Show them their numbers: total joins, verified joins, called, showed up, no-shows, avg wait.
- Ask three questions:
  1. What did staff hate?
  2. What did customers ask about?
  3. Would you keep using it if we charged £X/month?
- Write it down before you leave.

Only after that, decide whether to onboard shop #2.

## Common Issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Signup form map is blank | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` not set or restricted incorrectly | Set env var on Vercel; add Vercel domain to the key's HTTP referrer restrictions. |
| Approve returns 401 | Admin session expired | Re-login at `/signin`, retry. |
| Approve returns "already an owner" conflict | The email is already tied to a different business group | Use a different email or delete the existing membership manually. |
| Owner login says "invalid credentials" | The signup was created before the password column existed | Rejected; owner submits a new signup. |
| API returns "Queue is not open for this shop" | Location is paused or not LIVE | On ops dashboard: **Resume queue**. |
| Customer never sees "you're up" | Socket.IO connection failed | Check API logs for CORS or handshake errors; refresh the customer page. |
| Migrations refuse to apply | Prisma sees drift | Never run `migrate reset` on prod. Investigate drift; if a manual DB change was made, undo it. |
