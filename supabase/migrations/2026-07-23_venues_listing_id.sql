-- ============================================================
-- venues.listing_id — link venue to its parent business listing
-- ============================================================
-- WS7 PR2 (2026-07-23). Required for /partners/[id]/passport to surface
-- activity: the partner (listing) is the business the user sees; the
-- venue is what passport stamps actually attach to. Without listing_id,
-- the operator dashboard can't pivot "my partner page" → "stamps at
-- the venues I run".
--
-- Design:
--   - listing_id is nullable: venues pre-dating this migration don't
--     have a listing yet, and self-reported venues (no parent business)
--     stay nullable forever.
--   - ON DELETE SET NULL: if a partner listing is deleted, the venue
--     stays in the directory (it has its own identity) but loses the
--     listing link. Stamps on the venue are unaffected.
--   - Unique partial index: one listing → many venues, but enforce that
--     no two active venues share the same listing + same public_id (a
--     safety guard, not a hard constraint).
--   - No backfill: existing venues stay listing_id = NULL. Operators
--     link via the venue edit UI (deferred to a follow-up PR).
--
-- Additive only. No FK changes to existing tables. No data mutation.
-- Per Workstream 1 Rule 6 (Zero Data Mutation): only DDL.

-- ─── Column ─────────────────────────────────────────────────
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS listing_id uuid NULL
    REFERENCES public.listings(id) ON DELETE SET NULL;

-- ─── Index ──────────────────────────────────────────────────
-- Most queries: "venues for listing X" → small set, often 1-3 rows.
-- A btree is fine here.
CREATE INDEX IF NOT EXISTS venues_listing_id_idx
  ON public.venues (listing_id)
  WHERE listing_id IS NOT NULL;

-- ─── Comment ────────────────────────────────────────────────
COMMENT ON COLUMN public.venues.listing_id IS
  'Parent business listing (WS7 PR2, 2026-07-23). NULL for self-reported venues or venues predating the link. ON DELETE SET NULL so venue records survive listing deletion.';
