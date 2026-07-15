import { PrismaClient } from "@prisma/client";

declare global {
  var qAppPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.qAppPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.qAppPrisma = prisma;
}
