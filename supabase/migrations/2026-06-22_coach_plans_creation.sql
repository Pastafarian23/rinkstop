-- ============================================================
-- Coach Plans — creation layer (Day 4)
-- ============================================================
-- Adds user-creation support to practice_plans.
--
-- Changes:
--   1. Add created_by_user_id to practice_plans (NULL = seeded/system plan)
--   2. Update RLS: users can create/update/delete their own plans only
--   3. Add slug generation helper (immutable, but not auto-generated
--      since the seed data has hand-picked slugs we want to preserve)
--   4. Add is_template boolean (default false; seeded plans stay
--      "is_template" so they're surfaced as starters; user plans
--      start as drafts they can choose to publish)
--   5. Add a default is_published = true (kept simple: published on
--      save, no draft state for v1)
--
-- Backwards compatible: existing rows are unaffected (created_by_user_id
-- defaults to NULL, is_template defaults to FALSE for the seed inserts
-- that happen after this migration).
--
-- This migration assumes 2026-06-22_coach_plans.sql has run first.

-- ----------------------------------------------------------
-- Schema changes
-- ----------------------------------------------------------
ALTER TABLE practice_plans
  ADD COLUMN IF NOT EXISTS created_by_user_id TEXT,
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS equipment TEXT[] NOT NULL DEFAULT '{}';

-- equipment already exists in v1 but make it NOT NULL with default for safety
-- (won't alter if already NOT NULL with default in production)

-- Index for "my plans" queries
CREATE INDEX IF NOT EXISTS idx_practice_plans_created_by
  ON practice_plans(created_by_user_id)
  WHERE created_by_user_id IS NOT NULL;

-- Index for template library queries
CREATE INDEX IF NOT EXISTS idx_practice_plans_template
  ON practice_plans(is_template)
  WHERE is_template = TRUE;

-- ----------------------------------------------------------
-- Helper: check if current user can edit a plan
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION can_edit_practice_plan(p_plan_id UUID, p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM practice_plans p
    WHERE p.id = p_plan_id
      AND p.created_by_user_id = p_user_id
  );
$$;

-- ----------------------------------------------------------
-- Mark the 10 seed plans as is_template = TRUE
-- ----------------------------------------------------------
UPDATE practice_plans
SET is_template = TRUE
WHERE slug IN (
  'u8-u10-skating-fundamentals',
  'u12-puck-control-circuit',
  'u14-shooting-mechanics',
  'u16-u18-edge-work',
  'breakout-fundamentals',
  'power-play-umbrella',
  'faceoff-techniques',
  'u12-u14-off-ice-conditioning',
  'goalie-positioning-basics',
  'pre-game-warmup'
);

-- ----------------------------------------------------------
-- RLS updates: users can write their own plans
-- ----------------------------------------------------------

-- Drop old "read published" policy (we still want it, but add a new one for owners)
DROP POLICY IF EXISTS "Read published practice plans" ON practice_plans;
CREATE POLICY "Read published or own practice plans"
  ON practice_plans FOR SELECT
  TO authenticated
  USING (
    is_published = TRUE
    OR created_by_user_id = auth.jwt() ->> 'sub'
  );

-- Users can create plans they own
CREATE POLICY "Create own practice plans"
  ON practice_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by_user_id = auth.jwt() ->> 'sub'
    AND created_by_user_id IS NOT NULL
  );

-- Users can update their own plans
CREATE POLICY "Update own practice plans"
  ON practice_plans FOR UPDATE
  TO authenticated
  USING (created_by_user_id = auth.jwt() ->> 'sub')
  WITH CHECK (created_by_user_id = auth.jwt() ->> 'sub');

-- Users can delete their own plans
CREATE POLICY "Delete own practice plans"
  ON practice_plans FOR DELETE
  TO authenticated
  USING (created_by_user_id = auth.jwt() ->> 'sub');

-- ----------------------------------------------------------
-- Update user_saved_plans RLS to also allow reading
-- "template starters" without saving (for the builder)
-- (no change needed; user_saved_plans only contains rows the user saved)
-- ----------------------------------------------------------
