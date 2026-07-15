-- CreateEnum
CREATE TYPE "SecurityCaseStatus" AS ENUM ('OPEN', 'MONITORING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "SecurityCaseSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuthEventType" ADD VALUE 'ADMIN_SECURITY_CASE_CREATED';
ALTER TYPE "AuthEventType" ADD VALUE 'ADMIN_SECURITY_CASE_NOTE_ADDED';
ALTER TYPE "AuthEventType" ADD VALUE 'ADMIN_SECURITY_CASE_RESOLVED';
ALTER TYPE "AuthEventType" ADD VALUE 'ADMIN_SECURITY_CASE_REOPENED';

-- CreateTable
CREATE TABLE "SecurityCase" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "resolutionSummary" TEXT,
    "status" "SecurityCaseStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "SecurityCaseSeverity" NOT NULL DEFAULT 'MEDIUM',

    CONSTRAINT "SecurityCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityCaseNote" (
    "id" TEXT NOT NULL,
    "securityCaseId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "SecurityCaseNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityCase_targetUserId_createdAt_idx" ON "SecurityCase"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityCase_assignedToUserId_status_updatedAt_idx" ON "SecurityCase"("assignedToUserId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "SecurityCase_status_severity_updatedAt_idx" ON "SecurityCase"("status", "severity", "updatedAt");

-- CreateIndex
CREATE INDEX "SecurityCaseNote_securityCaseId_createdAt_idx" ON "SecurityCaseNote"("securityCaseId", "createdAt");

-- AddForeignKey
ALTER TABLE "SecurityCase" ADD CONSTRAINT "SecurityCase_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityCase" ADD CONSTRAINT "SecurityCase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityCase" ADD CONSTRAINT "SecurityCase_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityCaseNote" ADD CONSTRAINT "SecurityCaseNote_securityCaseId_fkey" FOREIGN KEY ("securityCaseId") REFERENCES "SecurityCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityCaseNote" ADD CONSTRAINT "SecurityCaseNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
