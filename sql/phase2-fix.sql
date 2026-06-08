-- Phase 2 Fix: Backfill source and created_at for rows that didn't get the defaults
-- The original migration only handled the 583 NHL.com inserts.
-- We need to:
--  1. Mark remaining NHL rows (kept from dedupe) as 'highlightly'
--  2. Mark all NCAA rows as 'highlightly'
--  3. Set created_at = updated_at for all rows that have NULL created_at

-- 1. The 2,960 NHL rows that aren't already 'nhl.com' → 'highlightly'
UPDATE nhl_players
  SET source = 'highlightly'
  WHERE source IS NULL
    AND league_name = 'NHL';

-- 2. The 1,726 NCAA rows → 'highlightly'
UPDATE nhl_players
  SET source = 'highlightly'
  WHERE source IS NULL
    AND league_name = 'NCAA';

-- 3. created_at: use updated_at as a stand-in for all rows that have NULL.
--    (We can't truly reconstruct the original insert time, but updated_at is the
--    best we have and it's a truthful "we don't know when this was inserted,
--    use the last-touched time" proxy.)
UPDATE nhl_players
  SET created_at = COALESCE(updated_at, now())
  WHERE created_at IS NULL;
