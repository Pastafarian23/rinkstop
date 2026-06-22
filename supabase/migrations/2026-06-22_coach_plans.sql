-- ============================================================
-- Coach Plans — read-only template library + bookmark/run tracking
-- ============================================================
-- Day 3 (2026-06-22), Arnel directive. Builds the read-only layer
-- of the Coach Plans feature. Creation layer (drag-drop builder)
-- is deferred per Arnel's earlier brief.
--
-- Three tables:
--   1. practice_plans        — 10 seed templates (admin/seeded)
--   2. user_saved_plans      — bookmarks (any user)
--   3. plan_progress         — "I ran this" history (any user)
--
-- Read access: any authenticated user can see practice_plans + their
-- own user_saved_plans + plan_progress. Inserts/updates on
-- practice_plans are admin-only (seeded via /supabase/seed_*.sql);
-- users can write to user_saved_plans and plan_progress for themselves.
--
-- Backwards compatible: no existing tables changed.

-- ----------------------------------------------------------
-- practice_plans — the templates
-- ----------------------------------------------------------
CREATE TABLE practice_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  focus TEXT NOT NULL CHECK (focus IN ('skills', 'game_situations', 'off_ice', 'goalie', 'conditioning')),
  age_min INT NOT NULL CHECK (age_min >= 4 AND age_min <= 99),
  age_max INT NOT NULL CHECK (age_max >= age_min AND age_max <= 99),
  duration_min INT NOT NULL CHECK (duration_min >= 5 AND duration_min <= 240),
  skill_level TEXT NOT NULL DEFAULT 'all' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'all')),
  structure JSONB NOT NULL,
  -- structure shape:
  --   {
  --     "warmup":    [{ "name": "...", "duration_min": 5, "notes": "..." }],
  --     "main":      [{ "name": "...", "duration_min": 15, "drills": "...", "notes": "..." }],
  --     "cooldown":  [{ "name": "...", "duration_min": 5 }],
  --     "coach_notes": "..."
  --   }
  coach_notes TEXT,
  equipment TEXT[] DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_age_range CHECK (age_max >= age_min)
);

CREATE INDEX idx_practice_plans_focus ON practice_plans(focus);
CREATE INDEX idx_practice_plans_age ON practice_plans(age_min, age_max);
CREATE INDEX idx_practice_plans_duration ON practice_plans(duration_min);
CREATE INDEX idx_practice_plans_published ON practice_plans(is_published) WHERE is_published = TRUE;

ALTER TABLE practice_plans ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read published plans
CREATE POLICY "Read published practice plans"
  ON practice_plans FOR SELECT
  TO authenticated
  USING (is_published = TRUE);

-- Only service role (admin) can insert/update/delete
-- (no explicit policy = deny for non-service-role)

-- ----------------------------------------------------------
-- user_saved_plans — bookmarks
-- ----------------------------------------------------------
CREATE TABLE user_saved_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  plan_id UUID NOT NULL REFERENCES practice_plans(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, plan_id)
);

CREATE INDEX idx_user_saved_plans_user ON user_saved_plans(user_id);
CREATE INDEX idx_user_saved_plans_plan ON user_saved_plans(plan_id);

ALTER TABLE user_saved_plans ENABLE ROW LEVEL SECURITY;

-- Users can read their own saves
CREATE POLICY "Read own saved plans"
  ON user_saved_plans FOR SELECT
  TO authenticated
  USING (user_id = auth.jwt() ->> 'sub');

-- Users can insert their own saves
CREATE POLICY "Insert own saved plans"
  ON user_saved_plans FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.jwt() ->> 'sub');

-- Users can delete their own saves (un-bookmark)
CREATE POLICY "Delete own saved plans"
  ON user_saved_plans FOR DELETE
  TO authenticated
  USING (user_id = auth.jwt() ->> 'sub');

-- ----------------------------------------------------------
-- plan_progress — "I ran this" history
-- ----------------------------------------------------------
CREATE TABLE plan_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  plan_id UUID NOT NULL REFERENCES practice_plans(id) ON DELETE CASCADE,
  team_id UUID REFERENCES team_workspaces(id) ON DELETE SET NULL,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_actual_min INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plan_progress_user ON plan_progress(user_id);
CREATE INDEX idx_plan_progress_plan ON plan_progress(plan_id);
CREATE INDEX idx_plan_progress_team ON plan_progress(team_id);
CREATE INDEX idx_plan_progress_ran_at ON plan_progress(ran_at DESC);

ALTER TABLE plan_progress ENABLE ROW LEVEL SECURITY;

-- Users can read their own progress
CREATE POLICY "Read own plan progress"
  ON plan_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.jwt() ->> 'sub');

-- Users can insert their own progress
CREATE POLICY "Insert own plan progress"
  ON plan_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.jwt() ->> 'sub');

-- ----------------------------------------------------------
-- Trigger: keep updated_at fresh on practice_plans
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_practice_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER practice_plans_updated_at
  BEFORE UPDATE ON practice_plans
  FOR EACH ROW
  EXECUTE FUNCTION trg_practice_plans_updated_at();
