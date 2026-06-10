-- 2026-06-10_fixtures_natural_key_uniq.sql
-- Add unique constraint on the natural game key to prevent duplicate fixtures.
--
-- Background: scripts/sync-nhl-live.js used insert() with a fresh
-- crypto.randomUUID() for every sync run, with no unique constraint on the
-- natural key (league_id, scheduled_at, home_team_id, away_team_id). Daily
-- re-syncs created 9-11 copies of each Stanley Cup Final game, bloating
-- the /directory/games page and the /api/scores response.
--
-- Fix: enforce uniqueness at the database level. Any insert that violates
-- the natural key is rejected. Combined with switching the sync script to
-- upsert(onConflict: 'league_id,scheduled_at,home_team_id,away_team_id'),
-- this guarantees one row per real game.
--
-- Verified 2026-06-10:
--   - Pre-fix: 9,660 rows with 4 dupe groups (38 duplicate rows in NHL)
--   - Post-fix: 9,622 rows, 0 dupe groups
--   - 3x re-runs of sync-nhl-live.js: 3 writes, 0 failures, count held at 9,622

-- Idempotent: skip if constraint already exists (so this migration is safe to re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fixtures_natural_key_uniq'
      AND conrelid = 'public.fixtures'::regclass
  ) THEN
    ALTER TABLE public.fixtures
      ADD CONSTRAINT fixtures_natural_key_uniq
      UNIQUE (league_id, scheduled_at, home_team_id, away_team_id);
  END IF;
END $$;

-- Note: NULL team_ids are NOT covered by this constraint (NULL doesn't
-- violate UNIQUE in SQL). The fixtures_reject_null_teams trigger
-- (migration 2026-06-08_fixtures_integrity.sql) handles that for the
-- protected leagues (NHL, AHL, PWHL, KHL).

-- Reusable dedup tool: scripts/dedup-fixtures-all-leagues.js
-- Idempotent — safe to run weekly. Scheduled via cron.
