-- WS25 (2026-08-23): claimable flag for pro-only claim gating.
--
-- Per Arnel (2026-08-23): only the four unambiguously professional leagues
-- (NHL, AHL, KHL, PWHL) and their directly-related entities should have
-- claimable=false. Everything else stays claimable — including CHL
-- (major junior), NCAA, USHL, NAHL, ECHL, IIHF World Championship, and
-- every amateur/youth/community league. Default for every new row is
-- claimable=true.
--
-- Backfill marks the explicit blocklist only:
--   - leagues with name IN ('National Hockey League', 'American Hockey League',
--     'KHL', 'PWHL')
--   - teams whose league_id is in that league set
--   - players whose team_id is in that team set
--
-- IIHF was originally in this list but removed (per Arnel 2026-08-23 17:04):
-- most national-team players are amateurs in their day jobs, and locking
-- them out of their own profile would be wrong.
--
-- Rinks intentionally NOT marked today: rinks.league is a free-text
-- column that doesn't reliably match leagues.name. A rink-flagging pass
-- can be added later if pro-team-arena mapping becomes reliable.
--
-- Future sync jobs (NHL/AHL/KHL/PWHL imports) MUST set claimable=false on
-- the rows they insert. The backfill covers the historical data.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS claimable BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS claimable BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS claimable BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.rinks
  ADD COLUMN IF NOT EXISTS claimable BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.players.claimable IS 'WS25: when false, the public profile is curated by the league and not user-claimable. Reserved for the four professional leagues (NHL/AHL/KHL/PWHL) and their players. Defaults true.';
COMMENT ON COLUMN public.teams.claimable IS 'WS25: see players.claimable. Defaults true.';
COMMENT ON COLUMN public.leagues.claimable IS 'WS25: see players.claimable. Defaults true.';
COMMENT ON COLUMN public.rinks.claimable IS 'WS25: see players.claimable. Defaults true. Not yet backfilled (rinks.league is free-text); future schema tightening can populate.';

-- Index for fast lookups by claimable flag in /api/claims.
CREATE INDEX IF NOT EXISTS idx_players_claimable_false
  ON public.players (id) WHERE claimable = FALSE;
CREATE INDEX IF NOT EXISTS idx_teams_claimable_false
  ON public.teams (id) WHERE claimable = FALSE;
CREATE INDEX IF NOT EXISTS idx_leagues_claimable_false
  ON public.leagues (id) WHERE claimable = FALSE;
CREATE INDEX IF NOT EXISTS idx_rinks_claimable_false
  ON public.rinks (id) WHERE claimable = FALSE;

-- Backfill: mark the four pro leagues + their teams + their players as
-- claimable=false. Idempotent — re-runs are no-ops once claimable is set.
-- We whitelist by league.name because leagues.level='professional' is too
-- broad (192 leagues tagged that way, only 4 of which are unambiguous pro).
UPDATE public.leagues
  SET claimable = FALSE
  WHERE name IN ('National Hockey League', 'American Hockey League', 'KHL', 'PWHL')
    AND claimable = TRUE;

WITH pro_team_ids AS (
  SELECT t.id
  FROM public.teams t
  INNER JOIN public.leagues l ON l.id = t.league_id
  WHERE l.name IN ('National Hockey League', 'American Hockey League', 'KHL', 'PWHL')
)
UPDATE public.teams
  SET claimable = FALSE
  WHERE id IN (SELECT id FROM pro_team_ids)
    AND claimable = TRUE;

WITH pro_player_ids AS (
  SELECT p.id
  FROM public.players p
  INNER JOIN public.teams t ON t.id = p.team_id
  INNER JOIN public.leagues l ON l.id = t.league_id
  WHERE l.name IN ('National Hockey League', 'American Hockey League', 'KHL', 'PWHL')
)
UPDATE public.players
  SET claimable = FALSE
  WHERE id IN (SELECT id FROM pro_player_ids)
    AND claimable = TRUE;
