-- Profile picture from the identity provider, and soft-deletion marker for
-- store-compliant account deletion (personal data is scrubbed; visit rows stay
-- anonymised so shop records remain truthful).
ALTER TABLE "Customer" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "Customer" ADD COLUMN "deletedAt" TIMESTAMP(3);
