-- Expo push token per queue entry, so turn alerts can reach the customer's
-- device even when the app is closed.
ALTER TABLE "QueueEntry" ADD COLUMN "pushToken" TEXT;
