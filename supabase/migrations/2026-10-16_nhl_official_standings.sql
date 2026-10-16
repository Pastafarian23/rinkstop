-- 2026-10-16: NHL official standings feed (replaces computed-from-fixtures).
--
-- Why this table exists (Arnel 2026-10-15): compute-standings.ts showed
-- wrong data because the current 2026-27 season has 0 completed games
-- in our DB (the season just started on 2026-10-01). The NHL.com
-- Stats API has authoritative, real-time standings — we mirror it here
-- and the UI reads from this table instead of computing from fixtures.
--
-- Source: NHL.com Stats API
--   GET https://api-web.nhle.com/v1/standings/{YYYY-MM-DD}
--   Free, no auth, no rate limit on the public read path.
--   Returns 32 teams. seasonId is a number like 20262027.
--   OTL field (`otLosses`) is the combined OT+SO loss count, NOT split.
--
-- Per Arnel (2026-10-15 11:34): "Keep the computed standings for AHL
-- and leagues without official feeds — those stay in compute-standings.ts."
-- So this table is NHL-only. AHL/ECHL/NCAA continue to use
-- compute-standings.ts. The UI route should pick based on league.
--
-- Idempotency: unique index on (team_id, season) so the ingest can
-- upsert without accumulating rows.

CREATE TABLE IF NOT EXISTS public.nhl_official_standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FK to our teams table. ON DELETE CASCADE so if a team row is
  -- removed, its standings row goes with it. We do NOT use SET NULL
  -- because a standings row without a team is meaningless.
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Season key. We use the same string format as highlightly_standings:
  -- '2024-25', '2025-26', '2026-27' (academic-year style, not the
  -- API's numeric seasonId 20242025). Derived at ingest time by
  -- `String(seasonId).slice(0,4) + '-' + String(seasonId+1).slice(2,4)`.
  season text NOT NULL CHECK (season ~ '^\d{4}-\d{2}$'),

  -- Core record. All non-negative ints. The API can return otLosses
  -- as null on a few edge snapshots (we coerce to 0 in the script).
  gp int NOT NULL CHECK (gp >= 0 AND gp <= 82),
  wins int NOT NULL CHECK (wins >= 0),
  losses int NOT NULL CHECK (losses >= 0),
  ot_losses int NOT NULL DEFAULT 0 CHECK (ot_losses >= 0),

  -- NHL points formula: 2*W + OTL. We don't CHECK this because the
  -- formula can drift across seasons (e.g. pre-2005 was different),
  -- and we're storing the source value verbatim.
  points int NOT NULL,

  -- Goals. Goals_against is a reserved word in some SQL dialects;
  -- we use snake_case and let Supabase quote it as needed. The API
  -- returns these as `goalFor` / `goalAgainst` and can be null on
  -- empty-season snapshots — the script coerces to 0.
  goals_for int NOT NULL DEFAULT 0,
  goals_against int NOT NULL DEFAULT 0,

  -- Streak code: 'W', 'L', or 'O' (OT loss). Length is the count.
  -- We store as a single text field per Arnel's column spec
  -- ("streak (text)"). Format: e.g. "W3", "L1", "O2".
  streak text,

  -- Last 10 games. The API returns W/L/OTL splits. The column spec
  -- asks for l10 as text. We store the same format as streak:
  -- e.g. "7-2-1" (W-L-OTL).
  l10 text,

  -- Audit
  last_updated timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'nhl.com'
    CHECK (source IN ('nhl.com', 'nhl.com-backfill')),

  -- Idempotency / dedup constraint. One row per (team, season).
  -- Re-running the ingest for the same team+season updates in place.
  CONSTRAINT nhl_official_standings_team_season_unique
    UNIQUE (team_id, season)
);

-- Query patterns:
--   1. Get current season standings for a team (UI): WHERE team_id = ? AND season = ?
--   2. Get all teams' current standings for league overview: WHERE season = ?
--   3. Get a team's history: WHERE team_id = ? ORDER BY season DESC
--   4. Find rows that haven't been refreshed today: last_updated < now() - interval '1 day'
CREATE INDEX IF NOT EXISTS nhl_official_standings_season_idx
  ON public.nhl_official_standings (season);

CREATE INDEX IF NOT EXISTS nhl_official_standings_team_season_idx
  ON public.nhl_official_standings (team_id, season DESC);

CREATE INDEX IF NOT EXISTS nhl_official_standings_last_updated_idx
  ON public.nhl_official_standings (last_updated DESC);

-- RLS: enable RLS but allow read to anon (the public standings page
-- reads via the standard Supabase client). Writes are only via the
-- service_role (ingest script), which bypasses RLS. This matches
-- the highlightly_standings pattern.
ALTER TABLE public.nhl_official_standings ENABLE ROW LEVEL SECURITY;

-- Anyone can read the public NHL standings.
DROP POLICY IF EXISTS "nhl_official_standings: public read" ON public.nhl_official_standings;
CREATE POLICY "nhl_official_standings: public read"
  ON public.nhl_official_standings
  FOR SELECT
  TO public
  USING (true);

-- No public insert/update/delete. Service role bypasses RLS, so the
-- ingest script can write. (Arnel-flagged 2026-10-15: same pattern
-- as highlightly_standings — explicit no-delete policy.)
DROP POLICY IF EXISTS "nhl_official_standings: no public insert" ON public.nhl_official_standings;
CREATE POLICY "nhl_official_standings: no public insert"
  ON public.nhl_official_standings
  FOR INSERT
  TO public
  WITH CHECK (false);

DROP POLICY IF EXISTS "nhl_official_standings: no public update" ON public.nhl_official_standings;
CREATE POLICY "nhl_official_standings: no public update"
  ON public.nhl_official_standings
  FOR UPDATE
  TO public
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "nhl_official_standings: no public delete" ON public.nhl_official_standings;
CREATE POLICY "nhl_official_standings: no public delete"
  ON public.nhl_official_standings
  FOR DELETE
  TO public
  USING (false);

COMMENT ON TABLE public.nhl_official_standings IS
  'Official NHL standings mirrored from api-web.nhle.com/v1/standings. '
  'Replaces computed-from-fixtures for the NHL UI. AHL/ECHL/NCAA still '
  'use compute-standings.ts. Idempotent: unique on (team_id, season).';
COMMENT ON COLUMN public.nhl_official_standings.ot_losses IS
  'Combined OT+SO loss count from the NHL.com API. The API does not '
  'split these. If a per-league split is ever needed, add columns.';
COMMENT ON COLUMN public.nhl_official_standings.streak IS
  'Format: <code><count>. code is W (wins) | L (regulation loss) | O (OT/SO loss).';
COMMENT ON COLUMN public.nhl_official_standings.l10 IS
  'Format: W-L-OTL over the last 10 games. Example: 7-2-1.';
