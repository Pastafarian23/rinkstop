-- 2026-10-03: RinkStop Scoresheet foundation
-- Adds 4 tables for the standalone scorekeeping app.
-- Lives at scoresheet.rinkstop.com as a separate Vercel project, but shares
-- this Supabase project with rinkstop.com. Phase B (RinkStop integration)
-- will add cross-table queries + a sync layer to push results back to
-- rinkstop fixtures/posts.

-- ============================================================================
-- games
-- ============================================================================
-- One row per game being scored. The primary user (owner_user_id) creates
-- the game and is the default scorekeeper. Other users can be added as
-- co_scorekeepers or viewers via game_collaborators.
--
-- 'mode' distinguishes the two distinct UX flows:
--   - 'live':  full scorekeeper at a real game. Roster required.
--   - 'watch': passive fan tracking. Roster optional, minimal events.
--
-- 'rinkstop_integration' is an explicit state machine (off/pending/linked/
-- submitted/posted) so we can ship the standalone app first, then add
-- RinkStop integration as a separate phase without schema changes.
CREATE TABLE IF NOT EXISTS public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id text NOT NULL,         -- Clerk user id; no FK to users table since users is empty in rinkstop
  mode text NOT NULL CHECK (mode IN ('live', 'watch')) DEFAULT 'live',
  status text NOT NULL CHECK (status IN ('draft', 'scheduled', 'in_progress', 'final')) DEFAULT 'draft',

  -- Home team
  home_team_name text NOT NULL,
  home_team_color text,
  home_team_source text NOT NULL CHECK (home_team_source IN ('manual', 'rinkstop', 'favorite')) DEFAULT 'manual',
  home_team_rinkstop_id uuid,         -- references team_workspaces.id (no FK to allow soft-deletes)
  home_roster jsonb,                  -- [{jersey_number, name, position, shoots, catches, is_goalie, is_captain}]

  -- Away team
  away_team_name text NOT NULL,
  away_team_color text,
  away_team_source text NOT NULL CHECK (away_team_source IN ('manual', 'rinkstop', 'favorite')) DEFAULT 'manual',
  away_team_rinkstop_id uuid,
  away_roster jsonb,

  -- Game meta
  venue_name text,
  scheduled_at timestamptz,
  game_type text NOT NULL CHECK (game_type IN ('regular', 'playoff', 'exhibition', 'tournament', 'friendly')) DEFAULT 'regular',

  -- Hockey rules (per-game overrides on standard rules)
  period_length_seconds int NOT NULL DEFAULT 1200,   -- 20 min
  periods_total int NOT NULL DEFAULT 3,
  overtime_length_seconds int NOT NULL DEFAULT 300,  -- 5 min
  shootout_enabled boolean NOT NULL DEFAULT true,

  -- Live state
  started_at timestamptz,
  ended_at timestamptz,
  current_period int NOT NULL DEFAULT 0,  -- 0 = not started, 1-3 = regulation, 4 = OT, 5 = SO
  clock_running boolean NOT NULL DEFAULT false,
  clock_seconds int NOT NULL DEFAULT 0,    -- within current period
  home_score int NOT NULL DEFAULT 0,
  away_score int NOT NULL DEFAULT 0,

  -- RinkStop integration (Phase B)
  rinkstop_integration text NOT NULL CHECK (rinkstop_integration IN ('off', 'pending', 'linked', 'submitted', 'posted')) DEFAULT 'off',
  rinkstop_fixture_id uuid,              -- references fixtures.id (no FK)

  -- Sharing
  qr_identifier uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  public_share_enabled boolean NOT NULL DEFAULT false,
  public_share_token text UNIQUE,        -- nullable until first share; populated on demand

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_owner ON public.games(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);
CREATE INDEX IF NOT EXISTS idx_games_scheduled ON public.games(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_games_qr ON public.games(qr_identifier);
CREATE INDEX IF NOT EXISTS idx_games_share_token ON public.games(public_share_token) WHERE public_share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_games_rinkstop_fixture ON public.games(rinkstop_fixture_id) WHERE rinkstop_fixture_id IS NOT NULL;

COMMENT ON TABLE public.games IS 'RinkStop Scoresheet — hockey games being scored. Live mode = real game scorekeeper; watch mode = passive fan tracking.';

-- ============================================================================
-- game_events
-- ============================================================================
-- Play-by-play event log. One row per action.
-- 'sequence_number' is a tiebreaker for events at the same (period, clock_seconds).
-- Typed columns (scorer_jersey, penalty_type, etc.) instead of a JSONB blob
-- because the data model is hockey-specific and we want strong types + fast
-- stat aggregation queries.
CREATE TABLE IF NOT EXISTS public.game_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,                -- references games.id; no FK for now
  period int NOT NULL CHECK (period >= 0 AND period <= 5),
  clock_seconds int NOT NULL DEFAULT 0,
  sequence_number int NOT NULL DEFAULT 0,
  team_side text NOT NULL CHECK (team_side IN ('home', 'away')),
  event_type text NOT NULL CHECK (event_type IN (
    'goal', 'assist_primary', 'assist_secondary',
    'penalty', 'penalty_killed',
    'save', 'shot_on_goal', 'shot_missed',
    'period_start', 'period_end',
    'overtime_start', 'overtime_end',
    'shootout_goal', 'shootout_miss', 'shootout_end',
    'game_end', 'goalie_change'
  )),

  -- Goal-specific
  scorer_jersey int,
  primary_assist_jersey int,
  secondary_assist_jersey int,
  goalie_jersey int,
  strength text CHECK (strength IN ('even', 'pp', 'sh', 'penalty_shot', 'shootout')),
  shot_quality text,                    -- wrist, slap, backhand, tip-in, etc.

  -- Penalty-specific
  penalty_jersey int,
  penalty_type text,                    -- tripping, hooking, slashing, etc.
  penalty_minutes int,

  -- Shot-specific
  shooter_jersey int,
  save_quality text,

  -- General
  description text,

  -- RinkStop player FKs (set when game is linked to a rinkstop fixture)
  scorer_player_id uuid,
  primary_assist_player_id uuid,
  secondary_assist_player_id uuid,
  goalie_player_id uuid,
  penalized_player_id uuid,

  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_game ON public.game_events(game_id);
CREATE INDEX IF NOT EXISTS idx_events_game_period ON public.game_events(game_id, period, clock_seconds, sequence_number);
CREATE INDEX IF NOT EXISTS idx_events_scorer ON public.game_events(scorer_player_id) WHERE scorer_player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_penalty ON public.game_events(penalized_player_id) WHERE penalized_player_id IS NOT NULL;

COMMENT ON TABLE public.game_events IS 'Play-by-play event log for scoresheet games. Hockey-specific event types; not generic.';

-- ============================================================================
-- game_collaborators
-- ============================================================================
-- Multi-user access to a single game. Owner creates the game; can invite
-- co_scorekeepers (write access) or viewers (read-only live broadcast link).
CREATE TABLE IF NOT EXISTS public.game_collaborators (
  game_id uuid NOT NULL,
  user_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'co_scorekeeper', 'viewer')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  PRIMARY KEY (game_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collab_user ON public.game_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_game ON public.game_collaborators(game_id);

COMMENT ON TABLE public.game_collaborators IS 'Multi-user access to a scoresheet game. Owner = creator; co_scorekeeper = write access; viewer = read-only.';

-- ============================================================================
-- user_favorite_teams
-- ============================================================================
-- A user's saved list of teams they track. Used in the game creation
-- wizard as a quick-select. Optional rinkstop_team_id for sync to
-- rinkstop.com (Phase B).
CREATE TABLE IF NOT EXISTS public.user_favorite_teams (
  user_id text NOT NULL,
  team_name text NOT NULL,
  rinkstop_team_id uuid,
  team_color text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, team_name)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.user_favorite_teams(user_id);

COMMENT ON TABLE public.user_favorite_teams IS 'User-saved list of teams they track. Used in scoresheet game creation as a quick-select.';

-- ============================================================================
-- RLS Policies
-- ============================================================================
-- The scoresheet app needs:
--   - Users can read/write games they own or collaborate on
--   - Public share links (by token) can read game state without auth
--   - QR-resolved games (by qr_identifier) can be read for stamp/redirect
--   - Users can read/write their own favorites
--
-- Note: these policies use Clerk user_id (text), not auth.uid(). We enforce
-- ownership by checking owner_user_id directly. The Supabase JWT is
-- configured separately via Clerk's "supabase" JWT template; the policies
-- use auth.jwt()->>'sub' for the Clerk user id.

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorite_teams ENABLE ROW LEVEL SECURITY;

-- Helper: extract Clerk user id from JWT
CREATE OR REPLACE FUNCTION public.clerk_user_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT auth.jwt() ->> 'sub'
$$;

-- games: owner can do anything; collaborators can read; public share can read
DROP POLICY IF EXISTS games_owner_all ON public.games;
CREATE POLICY games_owner_all ON public.games
  FOR ALL TO authenticated
  USING (owner_user_id = public.clerk_user_id())
  WITH CHECK (owner_user_id = public.clerk_user_id());

DROP POLICY IF EXISTS games_collab_read ON public.games;
CREATE POLICY games_collab_read ON public.games
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.game_collaborators gc
      WHERE gc.game_id = games.id
      AND gc.user_id = public.clerk_user_id()
    )
  );

DROP POLICY IF EXISTS games_public_share_read ON public.games;
CREATE POLICY games_public_share_read ON public.games
  FOR SELECT TO anon, authenticated
  USING (public_share_enabled = true AND public_share_token IS NOT NULL);

-- game_events: same as games
DROP POLICY IF EXISTS events_owner_all ON public.game_events;
CREATE POLICY events_owner_all ON public.game_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_events.game_id
      AND g.owner_user_id = public.clerk_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_events.game_id
      AND g.owner_user_id = public.clerk_user_id()
    )
  );

DROP POLICY IF EXISTS events_collab_read ON public.game_events;
CREATE POLICY events_collab_read ON public.game_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.game_collaborators gc
      WHERE gc.game_id = game_events.game_id
      AND gc.user_id = public.clerk_user_id()
    )
  );

DROP POLICY IF EXISTS events_public_share_read ON public.game_events;
CREATE POLICY events_public_share_read ON public.game_events
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_events.game_id
      AND g.public_share_enabled = true
      AND g.public_share_token IS NOT NULL
    )
  );

-- game_collaborators: only the game owner can manage; collaborators can read their own
DROP POLICY IF EXISTS collab_owner_all ON public.game_collaborators;
CREATE POLICY collab_owner_all ON public.game_collaborators
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_collaborators.game_id
      AND g.owner_user_id = public.clerk_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_collaborators.game_id
      AND g.owner_user_id = public.clerk_user_id()
    )
  );

DROP POLICY IF EXISTS collab_self_read ON public.game_collaborators;
CREATE POLICY collab_self_read ON public.game_collaborators
  FOR SELECT TO authenticated
  USING (user_id = public.clerk_user_id());

-- user_favorite_teams: each user owns their own list
DROP POLICY IF EXISTS favorites_owner_all ON public.user_favorite_teams;
CREATE POLICY favorites_owner_all ON public.user_favorite_teams
  FOR ALL TO authenticated
  USING (user_id = public.clerk_user_id())
  WITH CHECK (user_id = public.clerk_user_id());

-- Service role bypass: the server-side actions use SUPABASE_SERVICE_ROLE_KEY
-- which bypasses RLS entirely. The policies above are for the anon/authenticated
-- clients (browser PWA).

-- ============================================================================
-- Updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS games_updated_at ON public.games;
CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
