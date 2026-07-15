-- CreateEnum
CREATE TYPE "AuthEventType" AS ENUM ('LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'REFRESH_SUCCEEDED', 'REFRESH_FAILED', 'LOGOUT_REFRESH_TOKEN', 'LOGOUT_CURRENT', 'LOGOUT_OTHER_SESSIONS', 'SESSION_REVOKED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'INVITATION_CREATED', 'INVITATION_ACCEPTED');

-- CreateTable
CREATE TABLE "AuthAuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "AuthEventType" NOT NULL,
    "identifier" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceName" TEXT,
    "platform" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AuthAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthAuditEvent_userId_createdAt_idx" ON "AuthAuditEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAuditEvent_sessionId_createdAt_idx" ON "AuthAuditEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAuditEvent_identifier_createdAt_idx" ON "AuthAuditEvent"("identifier", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAuditEvent_createdAt_idx" ON "AuthAuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "AuthAuditEvent" ADD CONSTRAINT "AuthAuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAuditEvent" ADD CONSTRAINT "AuthAuditEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuthSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
