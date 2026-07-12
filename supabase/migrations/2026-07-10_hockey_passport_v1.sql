-- Hockey Passport v1 schema
-- Date: 2026-07-10
-- Author: KiloClaw (per Arnel directive #37345, vetted 2026-07-10 12:54 CDT)
--
-- Purpose: Add sport-specific tables for hockey career timeline, verified stats,
-- coach verification, and endorsements. Additive only — does NOT modify any
-- existing column, constraint, or policy.
--
-- Tables added:
--   1. hockey_seasons             — season lookup (id, label, dates)
--   2. coach_profiles             — verified coach profile (one per profiles.user_id)
--      Note: a pre-existing public.coaches table exists for the directory
--      (slug/first_name/last_name/certification_level). We use a different
--      name to avoid collision. The new coach_profiles is for users who
--      want to verify their coaching record via the passport flow.
--   3. coach_team_history         — coach ↔ team affiliations with seasons
--   4. hockey_player_team_history — player career timeline (the passport record)
--   5. hockey_player_stats_season — per-season stats (skater + goalie variants)
--   6. coach_endorsements         — coach → player attestations
--
-- Columns added to existing tables:
--   players.usa_hockey_number
--   players.hockey_canada_number
--   players.primary_position_category
--
-- Backfill (idempotent):
--   Existing players.team_id → first row in hockey_player_team_history,
--   marked verification_source = 'self_reported'.
--
-- Safety:
--   - Every CREATE uses IF NOT EXISTS where possible
--   - Every INSERT is wrapped with NOT EXISTS guard
--   - No DROP, no ALTER on existing columns, no policy rewrites
--   - RLS enabled on all new tables
--   - Service role bypasses RLS (existing supabaseAdmin client works unchanged)

-- ============================================================
-- 1. hockey_seasons (lookup table)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hockey_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hockey_seasons_label
  ON public.hockey_seasons(label);

ALTER TABLE public.hockey_seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read hockey_seasons" ON public.hockey_seasons;
CREATE POLICY "Public read hockey_seasons"
  ON public.hockey_seasons
  FOR SELECT
  USING (true);

-- Seed (idempotent via ON CONFLICT)
INSERT INTO public.hockey_seasons (label, start_date, end_date) VALUES
  ('2023-24', '2023-09-01', '2024-04-30'),
  ('2024-25', '2024-09-01', '2025-04-30'),
  ('2025-26', '2025-09-01', '2026-04-30'),
  ('2026-27', '2026-09-01', '2027-04-30')
ON CONFLICT (label) DO NOTHING;

-- ============================================================
-- 2. coach_profiles (verified coach record, one per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coach_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL UNIQUE REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  license_number TEXT,
  license_issuing_authority TEXT,
  license_expires_at DATE,
  years_coaching INT,
  current_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  bio TEXT,
  verification_status TEXT NOT NULL DEFAULT 'self_reported'
    CHECK (verification_status IN ('self_reported', 'platform_verified', 'federation_verified')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaches_profile
  ON public.coach_profiles(profile_id);

CREATE INDEX IF NOT EXISTS idx_coaches_current_team
  ON public.coach_profiles(current_team_id);

ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read coaches" ON public.coach_profiles;
CREATE POLICY "Public read coaches"
  ON public.coach_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owner upsert coaches" ON public.coach_profiles;
CREATE POLICY "Owner upsert coaches"
  ON public.coach_profiles FOR ALL
  USING (profile_id = auth.uid()::text)
  WITH CHECK (profile_id = auth.uid()::text);

-- ============================================================
-- 3. coach_team_history (coach ↔ team affiliations)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coach_team_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  role TEXT NOT NULL
    CHECK (role IN ('head_coach', 'assistant_coach', 'skills_coach', 'goalie_coach', 'manager', 'other')),
  season_id UUID REFERENCES public.hockey_seasons(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cth_coach
  ON public.coach_team_history(coach_id);

CREATE INDEX IF NOT EXISTS idx_cth_team
  ON public.coach_team_history(team_id);

ALTER TABLE public.coach_team_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read cth" ON public.coach_team_history;
CREATE POLICY "Public read cth"
  ON public.coach_team_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Coach owner write cth" ON public.coach_team_history;
CREATE POLICY "Coach owner write cth"
  ON public.coach_team_history FOR ALL
  USING (coach_id IN (SELECT id FROM public.coach_profiles WHERE profile_id = auth.uid()::text))
  WITH CHECK (coach_id IN (SELECT id FROM public.coach_profiles WHERE profile_id = auth.uid()::text));

-- ============================================================
-- 4. hockey_player_team_history (player career timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hockey_player_team_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  team_name_snapshot TEXT NOT NULL,
  league_id UUID REFERENCES public.leagues(id) ON DELETE SET NULL,
  league_name_snapshot TEXT,
  season_id UUID REFERENCES public.hockey_seasons(id) ON DELETE SET NULL,
  level TEXT
    CHECK (level IS NULL OR level IN (
      'youth', 'house', 'travel', 'aaa', 'aa', 'a', 'high_school',
      'junior', 'college', 'pro', 'recreational', 'other'
    )),
  jersey_number INT CHECK (jersey_number IS NULL OR (jersey_number >= 0 AND jersey_number <= 99)),
  position TEXT
    CHECK (position IS NULL OR position IN ('forward', 'defense', 'goalie')),
  role TEXT NOT NULL DEFAULT 'player'
    CHECK (role IN ('player', 'captain', 'alternate_captain', 'goalie', 'other')),
  start_date DATE,
  end_date DATE,
  verification_source TEXT NOT NULL DEFAULT 'self_reported'
    CHECK (verification_source IN ('self_reported', 'league_verified', 'coach_verified', 'platform_verified')),
  verified_by TEXT REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hp_team_hist_player
  ON public.hockey_player_team_history(player_id);

CREATE INDEX IF NOT EXISTS idx_hp_team_hist_team
  ON public.hockey_player_team_history(team_id);

CREATE INDEX IF NOT EXISTS idx_hp_team_hist_season
  ON public.hockey_player_team_history(season_id);

CREATE INDEX IF NOT EXISTS idx_hp_team_hist_dates
  ON public.hockey_player_team_history(start_date DESC NULLS LAST, end_date DESC NULLS LAST);

ALTER TABLE public.hockey_player_team_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read verified history" ON public.hockey_player_team_history;
CREATE POLICY "Public read verified history"
  ON public.hockey_player_team_history FOR SELECT
  USING (
    verification_source IN ('league_verified', 'coach_verified', 'platform_verified')
    OR player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()::text)
  );

DROP POLICY IF EXISTS "Owner insert history" ON public.hockey_player_team_history;
CREATE POLICY "Owner insert history"
  ON public.hockey_player_team_history FOR INSERT
  WITH CHECK (player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Owner update history" ON public.hockey_player_team_history;
CREATE POLICY "Owner update history"
  ON public.hockey_player_team_history FOR UPDATE
  USING (player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()::text));

-- Coach verification: a verified coach on the same team can verify a self_reported row
DROP POLICY IF EXISTS "Coach verify self_reported" ON public.hockey_player_team_history;
CREATE POLICY "Coach verify self_reported"
  ON public.hockey_player_team_history FOR UPDATE
  USING (
    verification_source = 'self_reported'
    AND team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.coach_profiles c
      WHERE c.profile_id = auth.uid()::text
        AND c.verification_status IN ('platform_verified', 'federation_verified')
        AND (
          c.current_team_id = hockey_player_team_history.team_id
          OR EXISTS (
            SELECT 1 FROM public.coach_team_history cth
            WHERE cth.coach_id = c.id
              AND cth.team_id = hockey_player_team_history.team_id
          )
        )
    )
  );

-- ============================================================
-- 5. hockey_player_stats_season (per-season stats)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hockey_player_stats_season (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.hockey_seasons(id) ON DELETE RESTRICT,
  team_history_id UUID REFERENCES public.hockey_player_team_history(id) ON DELETE SET NULL,
  league_id UUID REFERENCES public.leagues(id) ON DELETE SET NULL,
  level TEXT
    CHECK (level IS NULL OR level IN (
      'youth', 'house', 'travel', 'aaa', 'aa', 'a', 'high_school',
      'junior', 'college', 'pro', 'recreational', 'other'
    )),
  -- Skater stats
  games_played INT NOT NULL DEFAULT 0 CHECK (games_played >= 0),
  goals INT NOT NULL DEFAULT 0 CHECK (goals >= 0),
  assists INT NOT NULL DEFAULT 0 CHECK (assists >= 0),
  plus_minus INT NOT NULL DEFAULT 0,
  penalty_minutes INT NOT NULL DEFAULT 0 CHECK (penalty_minutes >= 0),
  -- Goalie stats (nullable, only filled when position = 'goalie')
  goalie_games_played INT CHECK (goalie_games_played IS NULL OR goalie_games_played >= 0),
  wins INT CHECK (wins IS NULL OR wins >= 0),
  losses INT CHECK (losses IS NULL OR losses >= 0),
  goals_against INT CHECK (goals_against IS NULL OR goals_against >= 0),
  saves INT CHECK (saves IS NULL OR saves >= 0),
  save_percentage NUMERIC(5,4) CHECK (save_percentage IS NULL OR (save_percentage >= 0 AND save_percentage <= 1)),
  shutouts INT CHECK (shutouts IS NULL OR shutouts >= 0),
  gaa NUMERIC(5,2) CHECK (gaa IS NULL OR gaa >= 0),
  verification_source TEXT NOT NULL DEFAULT 'self_reported'
    CHECK (verification_source IN ('self_reported', 'league_verified', 'coach_verified', 'platform_verified')),
  verified_by TEXT REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, season_id, team_history_id)
);

CREATE INDEX IF NOT EXISTS idx_hp_stats_player
  ON public.hockey_player_stats_season(player_id);

CREATE INDEX IF NOT EXISTS idx_hp_stats_season
  ON public.hockey_player_stats_season(season_id);

ALTER TABLE public.hockey_player_stats_season ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read verified stats" ON public.hockey_player_stats_season;
CREATE POLICY "Public read verified stats"
  ON public.hockey_player_stats_season FOR SELECT
  USING (
    verification_source IN ('league_verified', 'coach_verified', 'platform_verified')
    OR player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()::text)
  );

DROP POLICY IF EXISTS "Owner insert stats" ON public.hockey_player_stats_season;
CREATE POLICY "Owner insert stats"
  ON public.hockey_player_stats_season FOR INSERT
  WITH CHECK (player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Owner update stats" ON public.hockey_player_stats_season;
CREATE POLICY "Owner update stats"
  ON public.hockey_player_stats_season FOR UPDATE
  USING (player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()::text));

-- ============================================================
-- 6. coach_endorsements (coach → player attestations)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coach_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  endorsement_type TEXT NOT NULL
    CHECK (endorsement_type IN (
      'skills', 'character', 'leadership',
      'eligible_for_next_level', 'rec_ready', 'other'
    )),
  text TEXT NOT NULL CHECK (length(text) BETWEEN 10 AND 1000),
  visibility TEXT NOT NULL DEFAULT 'sport_scoped'
    CHECK (visibility IN ('sport_scoped', 'cross_sport', 'private')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'flagged', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_endorse_coach
  ON public.coach_endorsements(coach_id);

CREATE INDEX IF NOT EXISTS idx_endorse_player
  ON public.coach_endorsements(player_id);

CREATE INDEX IF NOT EXISTS idx_endorse_active
  ON public.coach_endorsements(player_id) WHERE status = 'active';

ALTER TABLE public.coach_endorsements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read endorsements" ON public.coach_endorsements;
CREATE POLICY "Public read endorsements"
  ON public.coach_endorsements FOR SELECT
  USING (
    visibility != 'private'
    OR coach_id IN (SELECT id FROM public.coach_profiles WHERE profile_id = auth.uid()::text)
    OR player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()::text)
  );

DROP POLICY IF EXISTS "Coach insert endorsement" ON public.coach_endorsements;
CREATE POLICY "Coach insert endorsement"
  ON public.coach_endorsements FOR INSERT
  WITH CHECK (coach_id IN (SELECT id FROM public.coach_profiles WHERE profile_id = auth.uid()::text));

DROP POLICY IF EXISTS "Coach update own endorsement" ON public.coach_endorsements;
CREATE POLICY "Coach update own endorsement"
  ON public.coach_endorsements FOR UPDATE
  USING (coach_id IN (SELECT id FROM public.coach_profiles WHERE profile_id = auth.uid()::text));

-- ============================================================
-- 7. Extend players with federation numbers + position category
-- ============================================================
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS usa_hockey_number TEXT,
  ADD COLUMN IF NOT EXISTS hockey_canada_number TEXT,
  ADD COLUMN IF NOT EXISTS primary_position_category TEXT
    CHECK (primary_position_category IS NULL OR primary_position_category IN ('forward', 'defense', 'goalie'));

-- ============================================================
-- 8. Backfill: existing players.team_id → first history row
--    Idempotent: NOT EXISTS guard prevents duplicates on re-run.
-- ============================================================
INSERT INTO public.hockey_player_team_history (
  player_id, team_id, team_name_snapshot, season_id, role,
  verification_source, created_at, updated_at
)
SELECT
  p.id,
  p.team_id,
  COALESCE(t.name, 'Unknown team'),
  (SELECT id FROM public.hockey_seasons WHERE label = '2025-26' LIMIT 1),
  'player',
  'self_reported',
  NOW(),
  NOW()
FROM public.players p
LEFT JOIN public.teams t ON t.id = p.team_id
WHERE p.team_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.hockey_player_team_history h
    WHERE h.player_id = p.id AND h.team_id = p.team_id
  );

-- ============================================================
-- End of migration
-- ============================================================