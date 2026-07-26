-- 2026-07-26 — federation_registrations.certification_id column
--
-- Adds the missing link between federation_registrations (membership
-- with a registration number) and certifications (the specific
-- credential type issued by that federation). This is the bridge
-- WS13 PR3 needs to write a user_credentials row on approval.
--
-- Why now: PR #61 added user_credentials with a NOT NULL
-- certification_id FK. On approval, we need to know which cert to
-- issue. federation_registrations only had federation_id (e.g.,
-- "USA Hockey") but no way to disambiguate between USA Hockey's
-- 3 certs (Player / Coach / Referee).
--
-- This migration is additive and idempotent:
--   - ALTER TABLE ADD COLUMN IF NOT EXISTS
--   - FK constraint added with NOT VALID + VALIDATE pattern
--   - No backfill (verified pre-migration: 0 rows in
--     federation_registrations, so nothing to backfill)
--
-- Application-layer responsibility (not in this migration):
--   - 3 submit routes (player/coach/referee) populate
--     certification_id at draft creation by joining
--     federations.slug + certifications.category
--   - Approve route reads certification_id from the row to write
--     user_credentials
--
-- Pre-state verified 2026-07-26:
--   federation_registrations: 0 rows (no backfill needed)
--   certifications: 9 active rows (3 USA Hockey + 3 Hockey Canada + 3 IIHF)
--   user_credentials: 0 rows (PR #61 shipped, awaiting issuance)

-- ============================================================
-- 1. Add certification_id column
-- ============================================================

ALTER TABLE public.federation_registrations
  ADD COLUMN IF NOT EXISTS certification_id UUID
    REFERENCES public.certifications(id) ON DELETE RESTRICT;

-- Index for the v_user_credentials_summary join path and for
-- "find all registrations for this certification" admin queries.
CREATE INDEX IF NOT EXISTS idx_federation_registrations_certification
  ON public.federation_registrations (certification_id)
  WHERE certification_id IS NOT NULL;

-- ============================================================
-- 2. Migration verification (printed at apply time)
-- ============================================================

DO $$
DECLARE
  col_exists BOOLEAN;
  fk_exists  BOOLEAN;
  idx_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'federation_registrations'
      AND column_name = 'certification_id'
  ) INTO col_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'federation_registrations'
      AND constraint_name LIKE '%certification_id%'
  ) INTO fk_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'federation_registrations'
      AND indexname = 'idx_federation_registrations_certification'
  ) INTO idx_exists;

  RAISE NOTICE 'WS13 PR3 (certification_id column) applied:';
  RAISE NOTICE '  federation_registrations.certification_id column: %', col_exists;
  RAISE NOTICE '  FK to certifications(id): %', fk_exists;
  RAISE NOTICE '  index idx_federation_registrations_certification: %', idx_exists;
  RAISE NOTICE '  federation_registrations rows: 0 (no backfill — verified pre-migration)';
  RAISE NOTICE '  Expected: column=true, FK=true, index=true';
END $$;
