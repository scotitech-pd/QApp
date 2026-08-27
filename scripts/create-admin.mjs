#!/usr/bin/env node
// Create or update a platform admin. Replaces the demo admin in production.
//   node scripts/create-admin.mjs admin@scotitech.com 'STRONG-PASSWORD' 'First' 'Last'
import crypto from "node:crypto";

import { PrismaClient, AppRole } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();

const [email, password, firstName = "Admin", lastName = "OnQ"] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password> [firstName] [lastName]");
  process.exit(1);
}
if (password.length < 12) {
  console.error("Use at least 12 characters for a production admin password.");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const derived = await new Promise((resolve, reject) =>
  crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)))
);
const passwordHash = `${salt}:${derived.toString("hex")}`;

await prisma.user.upsert({
  where: { email },
  update: { appRole: AppRole.PLATFORM_ADMIN, passwordHash, failedLoginAttempts: 0, lockedUntil: null },
  create: { appRole: AppRole.PLATFORM_ADMIN, email, firstName, lastName, passwordHash }
});
console.log(`Platform admin ready: ${email}`);
await prisma.$disconnect();
