-- Migration: add agency table with slug support

CREATE TABLE IF NOT EXISTS "Agency" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL UNIQUE,
    "agency_code" TEXT UNIQUE,
    "agency_name" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "contacts" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "Grant"
    ADD COLUMN IF NOT EXISTS "agency_id" UUID,
    ADD COLUMN IF NOT EXISTS "agency_name" TEXT,
    ADD COLUMN IF NOT EXISTS "category_code" TEXT;

ALTER TABLE "Grant"
    ADD CONSTRAINT "Grant_agency_id_fkey"
    FOREIGN KEY ("agency_id") REFERENCES "Agency"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Grant_agency_id_idx" ON "Grant"("agency_id");
CREATE INDEX IF NOT EXISTS "Grant_category_code_idx" ON "Grant"("category_code");
CREATE INDEX IF NOT EXISTS "Grant_state_idx" ON "Grant"("state");
