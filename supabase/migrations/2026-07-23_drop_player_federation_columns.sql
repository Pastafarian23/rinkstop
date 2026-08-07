-- ============================================================
-- WS10 PR2 — Drop legacy player federation columns
-- ============================================================
-- Date: 2026-07-23
--
-- Replaces players.usa_hockey_number + players.hockey_canada_number
-- with public.federation_registrations (added in
-- 2026-07-23_federation_registrations.sql, shipped in PR #49).
--
-- Why drop instead of keep:
--   - Dual-write path is a data-integrity footgun (one row out of
--     sync = which one is canonical?). PR #49 already moved ALL
--     reads and writes to federation_registrations.
--   - New code never reads these columns; they're dead weight.
--   - Future readers won't know they're deprecated.
--
-- Safety pattern (matches WS8 PR4 / PR #53 proven shape):
--   1. Pre-flight RAISE NOTICE reports row counts that still have
--      non-NULL values in each column.
--   2. If any rows have non-NULL values, RAISE EXCEPTION aborts
--      the migration BEFORE the DROP runs. Nothing is lost.
--   3. If pre-flight reports 0 in both columns, the DROP proceeds.
--
-- Why this is safe at apply time even without a separate audit:
--   - The abort guard is the audit. If anything unexpected exists,
--     the migration errors out cleanly. Arnel sees the count in the
--     RAISE NOTICE output and decides whether to investigate.
--   - DROP COLUMN IF EXISTS is idempotent — re-running a successful
--     migration is a no-op.
--   - No app code reads these columns as of 2026-07-23 14:09 UTC
--     (verified by grep — only JSON field names in the PATCH API
--     route + UI form, which route to federation_registrations).
--
-- Per Workstream 1 Rule 6 (Zero Data Mutation): this is a schema
-- change, not a row mutation. The pre-flight guard ensures no data
-- is silently destroyed.
--
-- Per Destructive Action Rule v3 (2026-07-23): pre-flight is the
-- authorization gate. If pre-flight > 0, the migration aborts and
-- Arnel decides whether to manually migrate the data into
-- federation_registrations before re-running.
-- ============================================================

-- ─── Pre-flight: count rows still using legacy columns ──────
DO $$
DECLARE
  usa_count bigint;
  hc_count bigint;
  any_count bigint;
BEGIN
  SELECT count(*) FILTER (WHERE usa_hockey_number IS NOT NULL) INTO usa_count FROM public.players;
  SELECT count(*) FILTER (WHERE hockey_canada_number IS NOT NULL) INTO hc_count FROM public.players;
  SELECT count(*) FILTER (WHERE usa_hockey_number IS NOT NULL OR hockey_canada_number IS NOT NULL) INTO any_count FROM public.players;

  RAISE NOTICE 'Pre-flight: % players with usa_hockey_number, % with hockey_canada_number, % total with either',
    usa_count, hc_count, any_count;

  -- If any rows still have legacy data, abort. The data must be
  -- migrated into federation_registrations manually first.
  IF any_count > 0 THEN
    RAISE EXCEPTION
      'Cannot drop legacy federation columns: % player(s) still have usa_hockey_number or hockey_canada_number set. Migrate these into federation_registrations before re-running.',
      any_count;
  END IF;
END $$;

-- ─── Drop the legacy columns ───────────────────────────────
ALTER TABLE public.players
  DROP COLUMN IF EXISTS usa_hockey_number,
  DROP COLUMN IF EXISTS hockey_canada_number;
