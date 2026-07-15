-- Add owner password hash to BusinessSignup so the owner can sign in immediately after admin approval.
ALTER TABLE "BusinessSignup" ADD COLUMN "passwordHash" TEXT;
