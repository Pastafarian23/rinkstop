-- ============================================================
-- team_events — add is_off_ice + practice_plan_id columns
-- ============================================================
-- Piece G1b (2026-06-26), per Arnel's Piece G scope:
--   Q5: off-ice training is just a type of practice (use a flag)
--   Q6: practice plan linking is OPTIONAL, not required (nullable FK)
--
-- Both columns are additive and nullable (or have safe defaults).
-- No CHECK constraint changes, no RLS changes, no NOT NULL.
-- Reversible: ALTER TABLE team_events DROP COLUMN IF EXISTS ...;
--
-- Indexes are partial — only on rows where the column is set,
-- keeping the index footprint minimal.

ALTER TABLE team_events
  ADD COLUMN IF NOT EXISTS is_off_ice BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE team_events
  ADD COLUMN IF NOT EXISTS practice_plan_id UUID
    REFERENCES practice_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_team_events_plan
  ON team_events(practice_plan_id) WHERE practice_plan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_events_off_ice
  ON team_events(is_off_ice) WHERE is_off_ice = TRUE;

COMMENT ON COLUMN team_events.is_off_ice IS
  'True when this practice happens off-ice (per Q5 — not a separate entity, just a flag)';
COMMENT ON COLUMN team_events.practice_plan_id IS
  'Optional link to practice_plans.id (per Q6 — nullable, calendar events exist standalone)';