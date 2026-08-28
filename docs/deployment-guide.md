# OnQ Production — onq.scotitech.com

**Status: LIVE** (deployed 2026-08-28). This documents the deployment as it
actually runs, and is the runbook for operating and updating it.

OnQ shares the Enterprise-Portal VM (`192.168.0.101`) with appdeploy, axos and
uptime-kuma. It is fully containerised and isolated: its own containers, its
own PostgreSQL, its own localhost-only ports. The only shared surface is nginx,
which gained one new vhost file — no existing config was modified.

```
                          ┌──────────── VM 101 (192.168.0.101) ────────────┐
onq.scotitech.com ──443──►│  nginx  (TLS, existing — one new vhost)        │
                          │   ├─ /v1/*  /socket.io/*  /health ─► :4000 api │
                          │   └─ everything else ──────────────► :3100 web │
                          │                                                │
                          │  docker compose "onq":                         │
                          │    onq-api-1  → 127.0.0.1:4000                 │
                          │    onq-web-1  → 127.0.0.1:3100                 │
                          │    onq-db-1   → postgres 16, internal only     │
                          │                 volume: onq_onq-pgdata         │
                          └────────────────────────────────────────────────┘
```

Neighbours on this VM (untouched): appdeploy `8080`/`3001`, axos `3000`/`3002`,
uptime-kuma `3030`.

---

## Facts

| Item | Value |
|---|---|
| Public URL | <https://onq.scotitech.com> |
| App directory | `/home/hitesh/onq/app` |
| Git remote (on box) | `/home/hitesh/onq/repo.git` (pushed to over SSH) |
| Env file | `/home/hitesh/onq/app/.env` (chmod 600, secrets generated on server) |
| Compose file | `deploy/docker-compose.yml` |
| nginx vhost | `/etc/nginx/sites-available/onq.scotitech.com` |
| TLS | Certbot, expires 2026-11-26, auto-renew scheduled |
| Admin credentials | `/home/hitesh/onq/admin-credentials.txt` — move to a password manager and delete |
| DB volume | `onq_onq-pgdata` (Docker named volume) |

## Deploying an update

From the development Mac, push code to the server's bare repo:

```bash
git push server main          # remote: onq-server:onq/repo.git
```

Then on the server:

```bash
cd ~/onq/app
git pull
docker compose --env-file .env -f deploy/docker-compose.yml up -d --build
```

The API container runs `prisma migrate deploy` on every start, so schema
changes apply automatically. First build takes 10–15 min; later builds 2–3 min
thanks to layer caching.

## Operating

```bash
cd ~/onq/app
COMPOSE="docker compose --env-file .env -f deploy/docker-compose.yml"

$COMPOSE ps                    # status
$COMPOSE logs -f api           # API logs (also: web, db)
$COMPOSE restart api           # restart one service
$COMPOSE down                  # stop all (data survives in the volume)
$COMPOSE up -d                 # start all
```

Health checks:

```bash
curl -s https://onq.scotitech.com/health     # {"status":"ok",...}
curl -s https://onq.scotitech.com/v1/shops   # approved shops JSON
```

## Backups (set this up — not yet automated)

The database lives in the Docker volume `onq_onq-pgdata` on this VM. Nothing
backs it up automatically yet. Add to the `hitesh` crontab (`crontab -e`):

```bash
mkdir -p ~/onq/backups
# 02:30 nightly, 14-day retention
30 2 * * * cd /home/hitesh/onq/app && docker compose --env-file .env -f deploy/docker-compose.yml exec -T db pg_dump -U onq onq | gzip > /home/hitesh/onq/backups/onq-$(date +\%F).sql.gz && find /home/hitesh/onq/backups -name 'onq-*.sql.gz' -mtime +14 -delete
```

**Copy backups off this VM** — a Proxmox VM backup of 101, or an rsync to
another machine. A backup that only exists on the same disk as the database is
not a backup.

Restore drill (run once before you need it):

```bash
cd ~/onq/app
COMPOSE="docker compose --env-file .env -f deploy/docker-compose.yml"
$COMPOSE exec -T db psql -U onq -c 'CREATE DATABASE onq_restore_test;'
gunzip -c ~/onq/backups/onq-<date>.sql.gz | $COMPOSE exec -T db psql -U onq -d onq_restore_test
$COMPOSE exec -T db psql -U onq -d onq_restore_test -c 'SELECT count(*) FROM "BusinessLocation";'
$COMPOSE exec -T db psql -U onq -c 'DROP DATABASE onq_restore_test;'
```

## TLS renewal

Certbot renews automatically, but the HTTP-01 challenge needs **port 80
reachable from the internet**. The router currently forwards only 443, so open
`80 → 192.168.0.101:80` around renewal time (before 2026-11-26), then close it.

This affects the other scotitech certificates on this VM too — worth checking
`sudo certbot certificates` for expiry dates and doing them in one window.

## Rollback

```bash
cd ~/onq/app
git log --oneline -5
git reset --hard <last-good-sha>
docker compose --env-file .env -f deploy/docker-compose.yml up -d --build
```

Migrations are forward-only. **Never** run `prisma migrate reset` — it drops
all data. For a bad migration, write a new corrective migration.

Whole-VM rollback: restore the Proxmox snapshot of VM 101 (affects every
product on the VM — coordinate first).

## Production data

The database starts empty by design — no demo shops or demo users.

1. Shop owner registers in the app (Shop tab → *Register your shop*) or at
   <https://onq.scotitech.com/business/signup>
2. Admin approves at <https://onq.scotitech.com/admin/business-signups>
3. Shop appears in customer discovery and can take its first queue

To create another platform admin:

```bash
cd ~/onq/app && source .env
docker run --rm --network onq_default -v ~/onq/app/scripts:/app/scripts:ro \
  -e DATABASE_URL="postgresql://onq:${ONQ_DB_PASSWORD}@db:5432/onq" \
  -e DIRECT_URL="postgresql://onq:${ONQ_DB_PASSWORD}@db:5432/onq" \
  onq-api node scripts/create-admin.mjs <email> '<password>' <First> <Last>
```

## Known pilot trade-offs

- `PILOT_MODE=true`: OTP codes are shown on screen instead of sent by SMS (zero
  cost; the join screen explains it). Set `false` in `.env` and configure a
  provider (Twilio/MSG91/WhatsApp) to switch on real SMS.
- Photos are stored as compressed images in Postgres (~40–80 KB each, 220 KB
  cap, 6 per shop). Move to object storage before onboarding many shops.
- Hosting is on-prem: the pilot depends on office power and broadband. Add OnQ
  to the existing uptime-kuma (`:3030`) so outages surface immediately —
  monitor `https://onq.scotitech.com/health`.
- Mobile release builds point at `https://onq.scotitech.com`; dev builds still
  use the LAN Metro server. Rebuild and redistribute the APK after each release
  that changes the app itself.
