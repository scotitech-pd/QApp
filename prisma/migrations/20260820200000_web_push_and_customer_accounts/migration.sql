-- Web Push subscription per queue entry (browser fallback for turn alerts).
ALTER TABLE "QueueEntry" ADD COLUMN "webPushSubscription" JSONB;

-- Optional customer accounts (Sign in with Apple / Google) for visit history.
ALTER TABLE "Customer" ADD COLUMN "appleUserId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "googleUserId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "lastSignInAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Customer_appleUserId_key" ON "Customer"("appleUserId");
CREATE UNIQUE INDEX "Customer_googleUserId_key" ON "Customer"("googleUserId");
