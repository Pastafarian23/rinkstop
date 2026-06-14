-- Migration: Game stats foundation (per-claim verification + site data)
-- 2026-06-14
--
-- Three tables that capture rich play-by-play data for every completed game:
--   play_by_play           one row per goal event
--   game_shot_summary      one row per (fixture, period) — shot totals
--   game_goalie_stats      one row per (fixture, team) — goalie performance
--   game_stats_audit       tracks which fixtures have been synced
--
-- Today we only have fixtures.home_score/away_score. The audit can verify
-- the final score; nothing else. After this migration we can verify
-- named scorers, save counts, and period-level claims — and feed the
-- team/player detail pages on the site.
--
-- Coverage:
--   NHL: full data from NHL.com (8 goals, 2 goalies, shots per period).
--   Non-NHL: final score + period scores from Highlightly only.
--   The 'source' column on each row records where the data came from so
--   the verifier can be conservative for non-NHL rows.

-- ----------------------------------------------------------------------------
-- play_by_play
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.play_by_play (
  id            BIGSERIAL PRIMARY KEY,
  fixture_id    UUID NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  league        TEXT NOT NULL,
  source        TEXT NOT NULL,            -- 'nhl.com' | 'highlightly' | 'hockeytech' | etc.
  period        INT NOT NULL,             -- 1, 2, 3, 4 (OT), 5 (SO)
  period_type   TEXT,                     -- 'REG' | 'OT' | 'SO'
  time_in_period TEXT,                    -- 'MM:SS'
  team_id       UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  team_abbrev   TEXT,
  scorer_player_id BIGINT,                -- nhl.com numeric player id (NHL only)
  scorer_name   TEXT NOT NULL,
  is_power_play BOOLEAN NOT NULL DEFAULT FALSE,
  is_short_handed BOOLEAN NOT NULL DEFAULT FALSE,
  is_empty_net  BOOLEAN NOT NULL DEFAULT FALSE,
  is_penalty_shot BOOLEAN NOT NULL DEFAULT FALSE,
  assists       JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{name, player_id}]
  score_after_home INT,
  score_after_away INT,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fixture_id, period, time_in_period, team_abbrev, scorer_name)
);

CREATE INDEX IF NOT EXISTS play_by_play_fixture_idx
  ON public.play_by_play (fixture_id);
CREATE INDEX IF NOT EXISTS play_by_play_scorer_idx
  ON public.play_by_play (scorer_name);
CREATE INDEX IF NOT EXISTS play_by_play_player_idx
  ON public.play_by_play (scorer_player_id)
  WHERE scorer_player_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- game_shot_summary
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.game_shot_summary (
  id            BIGSERIAL PRIMARY KEY,
  fixture_id    UUID NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  league        TEXT NOT NULL,
  source        TEXT NOT NULL,
  period        INT NOT NULL,             -- 1, 2, 3
  home_shots    INT,
  away_shots    INT,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fixture_id, period)
);

CREATE INDEX IF NOT EXISTS game_shot_summary_fixture_idx
  ON public.game_shot_summary (fixture_id);

-- ----------------------------------------------------------------------------
-- game_goalie_stats
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.game_goalie_stats (
  id            BIGSERIAL PRIMARY KEY,
  fixture_id    UUID NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  league        TEXT NOT NULL,
  source        TEXT NOT NULL,
  team_id       UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  team_abbrev   TEXT NOT NULL,
  player_id     BIGINT,                   -- nhl.com numeric player id (NHL only)
  player_name   TEXT NOT NULL,
  shots_against INT,
  saves         INT,
  save_pct      NUMERIC(5,2),             -- 0.00 - 100.00
  goals_against INT,
  decision      TEXT,                     -- 'W' | 'L' | 'OTL' | null
  toi           TEXT,                     -- 'MM:SS'
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fixture_id, team_abbrev, player_name)
);

CREATE INDEX IF NOT EXISTS game_goalie_stats_fixture_idx
  ON public.game_goalie_stats (fixture_id);
CREATE INDEX IF NOT EXISTS game_goalie_stats_player_idx
  ON public.game_goalie_stats (player_id)
  WHERE player_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- game_stats_audit
-- Tracks which fixtures have been synced, when, and with what result.
-- Lets us cheaply find "all completed fixtures missing stats" without
-- re-fetching the fixture list every time.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.game_stats_audit (
  id            BIGSERIAL PRIMARY KEY,
  fixture_id    UUID NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  source        TEXT NOT NULL,
  status        TEXT NOT NULL,            -- 'ok' | 'no_data' | 'error'
  rows_written  INT NOT NULL DEFAULT 0,
  error_message TEXT,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fixture_id, source)
);

CREATE INDEX IF NOT EXISTS game_stats_audit_status_idx
  ON public.game_stats_audit (status, fetched_at DESC);

-- ----------------------------------------------------------------------------
-- RLS (read-public, write-service-role only)
-- ----------------------------------------------------------------------------

ALTER TABLE public.play_by_play ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_shot_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_goalie_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_stats_audit ENABLE ROW LEVEL SECURITY;

-- Public read (these will be used on team/player detail pages eventually)
DROP POLICY IF EXISTS "play_by_play read" ON public.play_by_play;
CREATE POLICY "play_by_play read" ON public.play_by_play
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "game_shot_summary read" ON public.game_shot_summary;
CREATE POLICY "game_shot_summary read" ON public.game_shot_summary
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "game_goalie_stats read" ON public.game_goalie_stats;
CREATE POLICY "game_goalie_stats read" ON public.game_goalie_stats
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "game_stats_audit read" ON public.game_stats_audit;
CREATE POLICY "game_stats_audit read" ON public.game_stats_audit
  FOR SELECT USING (true);

-- Service role writes only (the sync script uses the service role key)
DROP POLICY IF EXISTS "play_by_play service write" ON public.play_by_play;
CREATE POLICY "play_by_play service write" ON public.play_by_play
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "game_shot_summary service write" ON public.game_shot_summary;
CREATE POLICY "game_shot_summary service write" ON public.game_shot_summary
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "game_goalie_stats service write" ON public.game_goalie_stats;
CREATE POLICY "game_goalie_stats service write" ON public.game_goalie_stats
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "game_stats_audit service write" ON public.game_stats_audit;
CREATE POLICY "game_stats_audit service write" ON public.game_stats_audit
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
