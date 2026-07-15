import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env")
];

const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));

dotenv.config(envPath ? { path: envPath } : undefined);

function toNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const pilotMode = process.env.PILOT_MODE === "true" || process.env.PILOT_MODE === "1";

export const appConfig = {
  env: process.env.NODE_ENV ?? "development",
  host: process.env.HOST ?? "0.0.0.0",
  port: toNumber(process.env.PORT, 4000),
  appBaseUrl: process.env.APP_BASE_URL ?? "http://127.0.0.1:3000",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000",
  databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
  pilotMode,
  auth: {
    accessTokenSecret: process.env.AUTH_ACCESS_TOKEN_SECRET ?? "q-app-dev-access-secret-change-me",
    accessTokenTtlSeconds: toNumber(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS, 900),
    refreshTokenTtlDays: toNumber(process.env.AUTH_REFRESH_TOKEN_TTL_DAYS, 30),
    passwordResetTtlMinutes: toNumber(process.env.AUTH_PASSWORD_RESET_TTL_MINUTES, 30),
    passwordMinLength: toNumber(process.env.AUTH_PASSWORD_MIN_LENGTH, 10),
    loginMaxFailedAttempts: toNumber(process.env.AUTH_LOGIN_MAX_FAILED_ATTEMPTS, 5),
    loginLockoutMinutes: toNumber(process.env.AUTH_LOGIN_LOCKOUT_MINUTES, 15)
  }
};
