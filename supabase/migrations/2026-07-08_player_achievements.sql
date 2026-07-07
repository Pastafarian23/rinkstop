-- 2026-07-08 — Player Achievements (Phase 1b-2)
-- Prep doc: docs/phase-1b-2-prep-achievements-timeline.md
-- Approved by Arnel 2026-07-07 ("use your recommendations and proceed")
--
-- Adds: player_achievements table (manual parent-entered milestones).
-- The career timeline is computed on-read (no separate table in v1).
--
-- v2 follow-ups (per Arnel 2026-07-07 13:21 CDT):
--   - Stat-derived achievements ("100 career goals") — separate piece
--   - Tournament results integration — separate piece
--   - Org-side achievement grants — separate piece
--   - Persistent player_timeline_events table (if read perf becomes a problem)
--   - Player-self view of own achievements (adult players)

BEGIN;

-- =============================================================================
-- player_achievements
-- =============================================================================

CREATE TABLE public.player_achievements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  granted_by      text NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
  title           text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description     text CHECK (description IS NULL OR char_length(description) <= 500),
  category        text NOT NULL DEFAULT 'milestone' CHECK (category IN (
                    'milestone', 'tournament', 'award', 'team',
                    'personal', 'stat', 'other'
                  )),
  achieved_at     date NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- v2: trigger-maintained status='archived' for soft-delete (matches 1b-1)

COMMENT ON TABLE public.player_achievements IS
  'Player-level achievements (awards, milestones, team events). Parent-entered in v1; v2 may add org-side grants and stat-derived achievements.';

COMMENT ON COLUMN public.player_achievements.category IS
  '7 enum values: milestone, tournament, award, team, personal, stat, other. stat is reserved for v2 (stat-derived achievements).';

COMMENT ON COLUMN public.player_achievements.achieved_at IS
  'The date the achievement happened. May be in the future (parent enters as a reminder); the UI shows future-dated items with a "scheduled" badge.';

CREATE INDEX player_achievements_player_idx
  ON public.player_achievements (player_id, achieved_at DESC);

CREATE INDEX player_achievements_player_category_idx
  ON public.player_achievements (player_id, category, achieved_at DESC);

-- =============================================================================
-- RLS — player_achievements
-- =============================================================================

ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;

-- Read: parent of the player (matches 1b-1 RLS pattern; forward-compatible for adult players)
CREATE POLICY player_achievements_select ON public.player_achievements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_achievements.player_id
        AND mp.manager_user_id = current_user_id()
    )
  );

-- Insert: parent of the player only (v1 — org-side grants in v2)
CREATE POLICY player_achievements_insert ON public.player_achievements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_achievements.player_id
        AND mp.manager_user_id = current_user_id()
    )
    AND granted_by = current_user_id()
  );

-- Update: parent of the player only (v1 — for editing a typo, etc.)
CREATE POLICY player_achievements_update ON public.player_achievements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_achievements.player_id
        AND mp.manager_user_id = current_user_id()
    )
  );

-- No DELETE policy in v1. Matches 1b-1 destructive-action protocol.

COMMIT;
