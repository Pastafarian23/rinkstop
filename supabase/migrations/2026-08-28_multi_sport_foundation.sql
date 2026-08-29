-- Multi-sport foundation migration
-- Adds `sport` to teams, leagues, fixtures, rinks, and posts.
-- Backfills existing rows to `hockey` so current behavior is unchanged.

-- 1. Core sport enum/check constraint (portable across tables)
-- We store as text with a check; if we later want a real enum, this is easy to migrate.

-- 2. team_workspaces
ALTER TABLE public.team_workspaces
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'hockey'
  CHECK (sport IN ('hockey','figure_skating','speed_skating','basketball','soccer','baseball','other'));

-- 3. leagues
ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'hockey'
  CHECK (sport IN ('hockey','figure_skating','speed_skating','basketball','soccer','baseball','other'));

-- 4. fixtures
ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'hockey'
  CHECK (sport IN ('hockey','figure_skating','speed_skating','basketball','soccer','baseball','other'));

-- 5. rinks
ALTER TABLE public.rinks
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'hockey'
  CHECK (sport IN ('hockey','figure_skating','speed_skating','basketball','soccer','baseball','other'));

-- 6. profile_posts
ALTER TABLE public.profile_posts
  ADD COLUMN IF NOT EXISTS sport text
  CHECK (sport IS NULL OR sport IN ('hockey','figure_skating','speed_skating','basketball','soccer','baseball','other'));

-- 7. Indexes for feed filtering
CREATE INDEX IF NOT EXISTS team_workspaces_sport_idx ON public.team_workspaces (sport);
CREATE INDEX IF NOT EXISTS leagues_sport_idx ON public.leagues (sport);
CREATE INDEX IF NOT EXISTS fixtures_sport_idx ON public.fixtures (sport);
CREATE INDEX IF NOT EXISTS rinks_sport_idx ON public.rinks (sport);
CREATE INDEX IF NOT EXISTS profile_posts_sport_idx ON public.profile_posts (sport) WHERE sport IS NOT NULL;

-- 8. Comments
COMMENT ON COLUMN public.team_workspaces.sport IS 'Primary sport for this team.';
COMMENT ON COLUMN public.leagues.sport IS 'Primary sport for this league.';
COMMENT ON COLUMN public.fixtures.sport IS 'Sport for this fixture. Denormalized for feed filtering.';
COMMENT ON COLUMN public.rinks.sport IS 'Primary sport for this facility. Many rinks serve multiple sports; this is the dominant one.';
COMMENT ON COLUMN public.profile_posts.sport IS 'Optional sport tag for sport-specific feeds.';
