-- 2026-10-03: Scoresheet — Rink + Sheet + Coaches fields
-- Adds the per-game metadata needed for the redesigned official-style PDF:
--   - rink_id         : FK to rinks (no constraint; soft-deletes allowed)
--   - sheet_label     : free text ("North rink", "Rink A", "Sheet 2")
--   - coach fields    : name + optional rinkstop user FK, per side
--
-- All new columns are nullable. Existing rows (none yet — the scoresheet
-- app has not been deployed) are unaffected.

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS rink_id uuid,
  ADD COLUMN IF NOT EXISTS sheet_label text,
  ADD COLUMN IF NOT EXISTS home_coach_name text,
  ADD COLUMN IF NOT EXISTS home_coach_rinkstop_id text,
  ADD COLUMN IF NOT EXISTS away_coach_name text,
  ADD COLUMN IF NOT EXISTS away_coach_rinkstop_id text;

CREATE INDEX IF NOT EXISTS idx_games_rink ON public.games(rink_id) WHERE rink_id IS NOT NULL;
