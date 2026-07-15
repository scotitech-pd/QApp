-- CreateEnum
CREATE TYPE "SecurityAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "SecurityAlertType" AS ENUM ('REPEATED_LOGIN_FAILURES', 'ACCOUNT_LOCKED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuthEventType" ADD VALUE 'ADMIN_SECURITY_ALERT_ACKNOWLEDGED';
ALTER TYPE "AuthEventType" ADD VALUE 'ADMIN_SECURITY_ALERT_RESOLVED';
ALTER TYPE "AuthEventType" ADD VALUE 'ADMIN_SECURITY_ALERT_CASE_CREATED';

-- CreateTable
CREATE TABLE "SecurityAlert" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "linkedCaseId" TEXT,
    "acknowledgedByUserId" TEXT,
    "resolvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "type" "SecurityAlertType" NOT NULL,
    "status" "SecurityAlertStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "SecurityCaseSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "resolutionSummary" TEXT,
    "metadata" JSONB,

    CONSTRAINT "SecurityAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityAlert_targetUserId_status_createdAt_idx" ON "SecurityAlert"("targetUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAlert_type_status_severity_createdAt_idx" ON "SecurityAlert"("type", "status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAlert_linkedCaseId_idx" ON "SecurityAlert"("linkedCaseId");

-- AddForeignKey
ALTER TABLE "SecurityAlert" ADD CONSTRAINT "SecurityAlert_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityAlert" ADD CONSTRAINT "SecurityAlert_linkedCaseId_fkey" FOREIGN KEY ("linkedCaseId") REFERENCES "SecurityCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityAlert" ADD CONSTRAINT "SecurityAlert_acknowledgedByUserId_fkey" FOREIGN KEY ("acknowledgedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityAlert" ADD CONSTRAINT "SecurityAlert_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
