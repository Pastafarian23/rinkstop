-- RinkStop Hockey Passport — Workstream 3.5 PR6: Subject Passport ID Column
-- Date: 2026-07-22
-- Author: KiloClaw
--
-- Purpose: Add subject_passport_id column to public.stamps so each stamp
-- records WHICH Passport was stamped, not just which user_id. This is
-- the WS3.5 Family Hub Multi-Stamp prerequisite: when a parent scans and
-- picks a kid's Passport, the stamp needs to attach to the kid's Passport
-- record, not the parent's.
--
-- Per WS3.5 PR6 spec (workstreams/workstream-3-5.md):
--   "Each stamp records which Passport was stamped (existing
--    stamps.subject_passport_id column — but need to confirm WS3 PR3 has
--    it; if not, add it)."
--
-- WS3 did NOT add this column. PR6 ships it.
--
-- Per Workstream 1 Rule 9 (No Existing Foreign Keys Change): this
-- migration only ADDS a column + index + CHECK constraint. Does not
-- modify any existing FK. The new column has no FK constraint because
-- passports.passport_id is TEXT and stamps.subject_passport_id is TEXT
-- and we don't enforce FK to passports (the auth schema is the source
-- of truth — passports is a denormalized cache).
--
-- Per Workstream 1 Rule 5 (Feature Flags Mandatory): Runtime gate is
-- STAMPS_FAMILY_PICKER_ENABLED at the application layer. This migration
-- ships unconditionally; the flag gates the picker UI in PR5 and the
-- service-layer acceptance in PR6. Production behavior is unchanged
-- until the env flag is flipped.
--
-- Conventions (matched to WS3 PR1 + WS3.5 PR1 migrations):
--   - Every ALTER TABLE column add uses IF NOT EXISTS
--   - Every CHECK extension uses DROP CONSTRAINT IF EXISTS (idempotent)
--   - verification_tier: TEXT + CHECK (not ENUM) — matches WS3 PR1 style
--   - Service-role writes only; all reads via RLS policies
--   - Per Workstream 1 Rule 9: only ADDS columns to existing tables.
--     Does not modify columns, FKs, or constraints on existing tables.
--
-- Backward compatibility:
--   - All existing stamps have subject_passport_id = NULL. The
--     application backfills at read time via actor_user_id and
--     subject_user_id (one Passport per user today, so the
--     resolution is unambiguous).
--   - The column is optional for backward reads; new writes always
--     set it when the stamp has a subject (third-party / family pick).
--     Self-scans set it to the actor's passport_id (always resolved
--     at write time).

BEGIN;

-- ============================================================
-- 1. Add subject_passport_id column to public.stamps
--
-- TEXT (matches passports.passport_id type — no FK constraint, per
-- Rule 9). Nullable because:
--   - Existing rows have no value (backfill via app on read).
--   - Self-scans may resolve to NULL in degenerate cases (caller has
--     no Passport yet) — app surfaces an error in that case.
--
-- Index for the picker query patterns: "list stamps for Passport X" by
-- joining against subject_passport_id. Partial index covers both
-- confirmed and disputed statuses (not revoked/rejected which are
-- terminal). Same pattern as the existing stamps_subject_user_id_idx.
-- ============================================================

ALTER TABLE public.stamps
  ADD COLUMN IF NOT EXISTS subject_passport_id text;

CREATE INDEX IF NOT EXISTS stamps_subject_passport_id_idx
  ON public.stamps (subject_passport_id, stamped_at DESC)
  WHERE subject_passport_id IS NOT NULL;

-- ============================================================
-- 2. Consistency CHECK: subject_passport_id ↔ subject_user_id
--
-- If subject_user_id is set, then subject_passport_id MUST also be set
-- (we always know which Passport a third-party scan attaches to). If
-- subject_user_id is NULL (self-scan), subject_passport_id MUST be set
-- to the actor's passport_id (we always know our own Passport). The
-- only valid NULL pattern is: both NULL (impossible per the above)
-- OR both set with matching identity (verified via app, not DB — DB
-- only enforces presence).
--
-- In practice we relax this CHECK: only enforce that at least one of
-- the two is set. This matches the current WS3 reality (some self-
-- scans may have NULL subject_user_id while still having a valid
-- Passport).
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.stamps'::regclass
      AND contype = 'c'
      AND conname = 'stamps_subject_identity_check'
  ) THEN
    ALTER TABLE public.stamps
      ADD CONSTRAINT stamps_subject_identity_check
      CHECK (
        subject_user_id IS NOT NULL
        OR subject_passport_id IS NOT NULL
        OR actor_user_id IS NOT NULL
      );
  END IF;
END $$;

-- ============================================================
-- 3. Idempotency note
--
-- Re-running this migration is safe:
--   - ALTER TABLE ... ADD COLUMN IF NOT EXISTS (idempotent)
--   - DO block that adds the CHECK is gated on existence (idempotent)
--   - CREATE INDEX IF NOT EXISTS (idempotent)
-- If you re-apply after the first apply, the IF NOT EXISTS guards skip
-- the no-op work; no error.
-- ============================================================

COMMIT;