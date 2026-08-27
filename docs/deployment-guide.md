# OnQ Production Deployment — onq.scotitech.com

Audience: DevOps. Goal: OnQ live on Scotitech's own server behind a single
domain. One box runs both apps; Supabase stays the managed Postgres.

```
                    ┌──────────────────────── server ────────────────────────┐
customer/owner ──►  │  Caddy :443  (TLS, reverse proxy)                      │
  apps + browsers   │   ├── /v1/* , /socket.io/* , /health ──► onq-api :4000 │──► Supabase
                    │   └── everything else ────────────────► onq-web :3000  │    (Postgres)
                    └────────────────────────────────────────────────────────┘
```

Single origin = no CORS headaches, one certificate, one DNS record.
All deploy files referenced below live in the repo under `deploy/`.

---

## 0. Prerequisites

| Item | Requirement |
|---|---|
| Server | Ubuntu 22.04+ (2 GB RAM is plenty for the pilot) |
| DNS | `A` record: `onq.scotitech.com` → server IP (do this first; TLS needs it) |
| Firewall | Allow 80 + 443 inbound; keep 3000/4000 closed (localhost-only) |
| Node.js | v22 LTS (`curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt install -y nodejs`) |
| PM2 | `sudo npm i -g pm2` |
| Caddy | Install from official repo: <https://caddyserver.com/docs/install#debian-ubuntu-raspbian> |
| Git access | Read access to `github.com/scotitech-pd/QApp` (deploy key or PAT) |

## 1. One-time server setup

```bash
# App user + directories
sudo useradd -m -s /bin/bash onq
sudo mkdir -p /srv/onq/logs
sudo chown -R onq:onq /srv/onq

# Clone as the onq user
sudo -iu onq
git clone git@github.com:scotitech-pd/QApp.git /srv/onq/app
```

## 2. Secrets and environment

1. **Rotate the Supabase database password** (Supabase dashboard → Settings →
   Database → Reset password). The old one is considered compromised — it was
   shared in a chat. Grab the new pooler (6543) and direct (5432) URLs.
2. Create the env file:

```bash
cp /srv/onq/app/deploy/env.production.example /srv/onq/app/.env
nano /srv/onq/app/.env    # fill every <...>
chmod 600 /srv/onq/app/.env
```

Generate the secrets it asks for:

```bash
openssl rand -hex 48                  # AUTH_ACCESS_TOKEN_SECRET
npx web-push generate-vapid-keys     # VAPID public + private
```

## 3. Caddy (TLS + routing)

```bash
sudo cp /srv/onq/app/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy obtains and renews the Let's Encrypt certificate automatically once DNS
resolves to this server.

## 4. First deploy

```bash
sudo -iu onq
/srv/onq/app/deploy/deploy.sh
```

The script is idempotent and is also the **only** thing you run for every
subsequent release. It: pulls `main` → `npm ci` → Prisma generate + **migrate
deploy** (applies all pending migrations to Supabase — several are pending on
first run) → builds API + web → `pm2 startOrReload` → health checks.

Make PM2 survive reboots (once):

```bash
pm2 startup systemd -u onq --hp /home/onq   # run the sudo line it prints
pm2 save
```

## 5. Production data setup (once, after first deploy)

```bash
cd /srv/onq/app

# Real platform admin (replaces demo credentials)
node scripts/create-admin.mjs admin@scotitech.com 'STRONG-PASSWORD-HERE' 'Pradeep' 'Dahiya'

# Remove demo/seed accounts if the database still holds them:
#   admin@qapp.demo / owner@fadeyard.demo / manager@fadeyard.demo / staff@fadeyard.demo
# and the demo shops (Fade Yard etc.). Coordinate with the product owner —
# do NOT wipe the database; the pilot shop may already have real data.

# Pilot shop: registers itself in the app (Shop tab → Register your shop),
# then the admin approves it at https://onq.scotitech.com/admin/business-signups
```

## 6. Verification checklist

```bash
curl -s https://onq.scotitech.com/health            # {"status":"ok",...}
curl -s https://onq.scotitech.com/v1/shops | head   # JSON with data[]
```

- [ ] `https://onq.scotitech.com` loads the web app over TLS
- [ ] Realtime: open the site, join a queue from a second browser — position
      updates without refresh (Socket.IO through the proxy)
- [ ] Admin sign-in works with the NEW admin credentials
- [ ] `pm2 status` shows `onq-api` and `onq-web` online
- [ ] Reboot test: `sudo reboot`, then confirm both processes return

## 7. Releases, logs, rollback

```bash
# Release
sudo -iu onq /srv/onq/app/deploy/deploy.sh

# Logs
pm2 logs onq-api --lines 100
pm2 logs onq-web --lines 100

# Rollback (code)
cd /srv/onq/app && git reset --hard <last-good-sha> && ./deploy/deploy.sh
# Note: migrations are forward-only; never `migrate reset` — it wipes data.
```

## 8. After the server is live (product side, not DevOps)

These are follow-ups the product owner handles once the domain answers:

1. **Mobile release builds** — release builds already point at
   `https://onq.scotitech.com` (dev builds keep using the LAN); rebuild the
   Android APK / iOS archive and hand the APK to the pilot shop.
2. **Vercel** — either retire the Vercel deployment or keep it as staging; if
   kept, set `NEXT_PUBLIC_API_BASE_URL=https://onq.scotitech.com` there and add
   the Vercel URL to `CORS_ALLOWED_ORIGINS` on the server.
3. **Store push credentials** — APNs key (Apple) + FCM service account
   (Firebase) uploaded to Expo before store builds ship.
4. QR counter signs reprint automatically with the production URL from
   `/ops/shops/<slug>/qr`.

## 9. Known pilot trade-offs (accepted, revisit before scale)

- `PILOT_MODE=true`: OTP codes render on-screen instead of SMS (zero cost; the
  join flow explains it). Flip to `false` only with an SMS provider configured.
- Shop/customer photos are stored as small compressed images in Postgres
  (~40–80 KB each, hard cap 220 KB, max 6 per shop). Move to object storage
  (e.g. Supabase Storage) before onboarding many shops.
- Supabase free tier sleeps after 7 idle days — a daily health-check cron or
  uptime monitor hitting `/health` keeps everything warm and alerts you:
  `*/10 * * * * curl -fsS https://onq.scotitech.com/health > /dev/null`
