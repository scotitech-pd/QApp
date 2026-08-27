#!/usr/bin/env bash
# OnQ deploy — idempotent; run as the onq user from anywhere.
# First run: clone the repo to /srv/onq/app and create /srv/onq/app/.env first.
set -euo pipefail

APP_DIR="/srv/onq/app"
cd "$APP_DIR"

echo "==> Pulling latest main"
git fetch origin main
git reset --hard origin/main

echo "==> Installing dependencies (root workspaces)"
npm ci

echo "==> Prisma client + migrations (uses DATABASE_URL/DIRECT_URL from .env)"
npx prisma generate
npx prisma migrate deploy

echo "==> Building API"
npm run build:api

echo "==> Building web"
npm run build:web

echo "==> Restarting processes"
pm2 startOrReload deploy/ecosystem.config.cjs
pm2 save

echo "==> Smoke check"
sleep 2
curl -fsS http://127.0.0.1:4000/health >/dev/null && echo "API healthy"
curl -fsS -o /dev/null http://127.0.0.1:3000 && echo "Web responding"
echo "Deploy complete."
