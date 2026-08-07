-- 2026-07-25_backfill_legacy_columns_to_team_workspaces.sql
--
-- Pre-PR2 migration: add three display-only columns to team_workspaces
-- and backfill from legacy teams table.
--
-- Why: PR2 swaps 64 `from('teams')` call sites to `from('team_workspaces')`.
-- After the swap, 22 references to legacy-only columns (.division, .colors,
-- .state_province) would 500 unless these columns exist on team_workspaces.
--
-- These are display-only fields:
--   - division: text label (e.g. "Atlantic", "Metropolitan")
--   - colors: JSONB array (e.g. ["#FF0000", "#FFFFFF"])
--   - home_state: text (e.g. "Massachusetts")
--
-- All three are NULLABLE. No constraints. Safe to add and backfill.
-- Idempotent.

BEGIN;

ALTER TABLE team_workspaces
  ADD COLUMN IF NOT EXISTS division   TEXT,
  ADD COLUMN IF NOT EXISTS colors     TEXT[],
  ADD COLUMN IF NOT EXISTS home_state TEXT;

COMMENT ON COLUMN team_workspaces.division IS
  'Display-only division label (e.g. "Atlantic"). Backfilled from teams.division on 2026-07-25.';
COMMENT ON COLUMN team_workspaces.colors IS
  'Display-only team colors as text array of hex strings. Backfilled from teams.colors on 2026-07-25 (source column is text[], not JSONB).';
COMMENT ON COLUMN team_workspaces.home_state IS
  'Display-only state/province (e.g. "Massachusetts"). Backfilled from teams.state_province on 2026-07-25.';

-- Backfill from legacy teams. UUID-preserving migration means ids match.
-- colors is text[] in both tables now (no cast needed).
UPDATE team_workspaces tw
SET
  division   = t.division,
  colors     = t.colors,
  home_state = t.state_province
FROM teams t
WHERE t.id = tw.id
  AND (t.division IS NOT NULL OR t.colors IS NOT NULL OR t.state_province IS NOT NULL);

-- Verify counts
DO $$
DECLARE
  v_division_count   INT;
  v_colors_count     INT;
  v_home_state_count INT;
BEGIN
  SELECT COUNT(*) INTO v_division_count   FROM team_workspaces WHERE division IS NOT NULL;
  SELECT COUNT(*) INTO v_colors_count     FROM team_workspaces WHERE colors IS NOT NULL;
  SELECT COUNT(*) INTO v_home_state_count FROM team_workspaces WHERE home_state IS NOT NULL;
  RAISE NOTICE 'Backfilled: division=%, colors=%, home_state=%',
    v_division_count, v_colors_count, v_home_state_count;
END $$;

COMMIT;
