-- Phase 2 Migration: Schema additions for nhl_players
-- Adds role, was_player, source, created_at columns
-- All additive (no destructive changes)
-- Idempotent: uses IF NOT EXISTS

ALTER TABLE nhl_players
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player',
  ADD COLUMN IF NOT EXISTS was_player BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill source for all NHL.com-sourced rows (id 84xxxxx, range 1000000-9999999)
UPDATE nhl_players
  SET source = 'nhl.com'
  WHERE id BETWEEN 1000000 AND 9999999
    AND source IS NULL;

-- Mark 4 staff rows (verified by web search)
UPDATE nhl_players SET role = 'coach', was_player = true
  WHERE id = 30261767;  -- Peter Laviolette (WSH head coach, played 12 NHL games)

UPDATE nhl_players SET role = 'scout', was_player = false
  WHERE id = 30251762;  -- Paul Guay (VGK scout)

UPDATE nhl_players SET role = 'scout', was_player = false
  WHERE id = 30287042;  -- Art Wiebe (VGK scout, NHL.com/art-wiebe-8449464)

UPDATE nhl_players SET role = 'scout', was_player = false
  WHERE id = 31986902;  -- Colin O'Hara (NSH scout, b.1977)

-- Saku Salminen: reclassify from staff back to retired player
-- He was misidentified as staff. Real: Finnish, b.1994, played Liiga/KHL 2012-19, retired.
UPDATE nhl_players SET role = 'player', was_player = true, is_active = false
  WHERE id = 45634562;  -- Saku Salminen

-- Add index on role for fast filtering
CREATE INDEX IF NOT EXISTS idx_nhl_players_role ON nhl_players(role);

-- Verification queries (read-only, run separately)
-- SELECT role, was_player, count(*) FROM nhl_players GROUP BY role, was_player ORDER BY role;
-- SELECT source, count(*) FROM nhl_players GROUP BY source;
-- SELECT count(*) FROM nhl_players WHERE created_at IS NULL;  -- should be 0
