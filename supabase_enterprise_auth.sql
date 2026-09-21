-- ===========================================================================
-- ENTERPRISE AUTH & INVITATION-ONLY ONBOARDING
-- Added 2026-09-15.
--
-- Paste this whole file into the Supabase SQL Editor and run it.
-- Purely ADDITIVE and safe to run repeatedly (IF NOT EXISTS everywhere):
-- no table is dropped, no row is deleted, only nullable columns are added.
-- Existing sign-ins by email keep working untouched.
--
-- Two things this unlocks:
--   1. Sign in with an EMAIL ADDRESS or a MOBILE NUMBER — one field, either one.
--      Phones are stored in E.164 form (+919876543210), which is what every SMS/OTP
--      provider expects, so switching on one-time codes later needs no further schema
--      work: just a provider key and the verify step.
--   2. Store accounts are invited, not self-served. A merchant submits an access
--      request and an admin approving it provisions the real account.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- User: phone-based identity
-- ---------------------------------------------------------------------------

-- Mobile number in E.164 form (+919876543210). NULL for email-only accounts.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(20);

-- An account may be identified by its phone number alone, so email can no longer be
-- mandatory. A UNIQUE column tolerates any number of NULLs, so phone-only and
-- email-only accounts coexist without conflicts.
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- Set once an OTP provider confirms the number. Reserved for the SMS sign-in step.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" TIMESTAMP WITH TIME ZONE;


-- ---------------------------------------------------------------------------
-- User: account lifecycle
-- ---------------------------------------------------------------------------

-- 'active' | 'invited' | 'suspended'. Sign-in refuses anything that is not 'active'.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'active';

-- 'user' | 'admin'. Guarded with IF NOT EXISTS in case an older database predates it.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" VARCHAR(20) NOT NULL DEFAULT 'user';

-- Soft disable flag used alongside `status`.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Forces a password change on first sign-in after an admin provisions the account.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Interface language preference (en | hi | ta | te | kn | bn).
-- The API has always written this field. Without the column the preference was
-- silently discarded, so a language choice never survived a re-login. This fixes it.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "language" VARCHAR(10);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP WITH TIME ZONE;

-- One account per mobile number. Partial index, so the many NULLs stay allowed
-- (Postgres only enforces uniqueness on rows where the column is NOT NULL).
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_phone_unique"
    ON "User"("phone") WHERE "phone" IS NOT NULL;

-- Make sure every existing row is explicitly active rather than relying on a default
-- applied at column-creation time.
UPDATE "User" SET "status" = 'active' WHERE "status" IS NULL;


-- ---------------------------------------------------------------------------
-- AccessRequest: the invitation-only front door
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "AccessRequest" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "businessName" VARCHAR(255),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "city" VARCHAR(120),
    "category" VARCHAR(120),
    "message" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "source" VARCHAR(40) DEFAULT 'website',
    "reviewedBy" VARCHAR(255),
    "reviewedAt" TIMESTAMP WITH TIME ZONE,
    "reviewNote" TEXT,
    "provisionedUserId" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT "AccessRequest_contact_required"
        CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL),
    CONSTRAINT "AccessRequest_status_valid"
        CHECK ("status" IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS "idx_access_request_status"
    ON "AccessRequest"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_access_request_email" ON "AccessRequest"("email");
CREATE INDEX IF NOT EXISTS "idx_access_request_phone" ON "AccessRequest"("phone");

-- This table holds personal contact details. It is written only by the API using the
-- service-role key (which bypasses RLS), so it stays closed to everyone else:
-- RLS enabled, deliberately NO policies and NO grants to anon/authenticated.
ALTER TABLE "AccessRequest" ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- Make the new columns visible to PostgREST immediately
-- ---------------------------------------------------------------------------
-- Supabase normally reloads its schema cache on DDL. If it doesn't, the REST API keeps
-- answering "column not found" for columns that already exist, which looks exactly like
-- a broken deployment. This forces the reload.
NOTIFY pgrst, 'reload schema';


-- ---------------------------------------------------------------------------
-- Verify (optional) — these should all return counts, not errors
-- ---------------------------------------------------------------------------
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'User' AND column_name IN ('phone','status','language','mustChangePassword');
-- SELECT count(*) AS pending_requests FROM "AccessRequest" WHERE status = 'pending';
