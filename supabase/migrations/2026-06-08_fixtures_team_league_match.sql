-- 2026-06-08: Fixtures team-league match trigger
-- 
-- PROBLEM (recurring bug, 2026-06-08):
--   teams.league_id is being assigned wrong values. e.g., Newfoundland Regiment
--   was assigned to "Asia League Ice Hockey" instead of QMJHL; Stonehill to
--   "Friendly International" instead of NCAAH. When fixtures are inserted with
--   these team_ids, the data is silently wrong.
--
--   The existing fixtures_reject_null_teams_trigger only catches NULL team_ids.
--   It does NOT verify the team's league_id matches the fixture's league_id.
--
-- FIX: New trigger that verifies (home_team_id and away_team_id).league_id
-- matches the fixtures.league_id. Raises an exception if not.
--
-- This is a HARD constraint at the database level. Even if a script inserts
-- a fixture with a wrong-league team, the DB will reject it.

CREATE OR REPLACE FUNCTION public.fixtures_check_team_league_match()
RETURNS TRIGGER AS $$
DECLARE
  home_league UUID;
  away_league UUID;
BEGIN
  -- Look up the home team's league
  SELECT league_id INTO home_league FROM public.teams WHERE id = NEW.home_team_id;
  IF home_league IS NULL THEN
    RAISE EXCEPTION 'home_team_id % does not exist in teams table', NEW.home_team_id
      USING ERRCODE = '23503';
  END IF;
  
  -- Look up the away team's league
  SELECT league_id INTO away_league FROM public.teams WHERE id = NEW.away_team_id;
  IF away_league IS NULL THEN
    RAISE EXCEPTION 'away_team_id % does not exist in teams table', NEW.away_team_id
      USING ERRCODE = '23503';
  END IF;
  
  -- Check match
  IF home_league <> NEW.league_id THEN
    RAISE EXCEPTION 'home_team_id % is in league % but fixture league_id is %', 
      NEW.home_team_id, home_league, NEW.league_id
      USING ERRCODE = '23514';
  END IF;
  
  IF away_league <> NEW.league_id THEN
    RAISE EXCEPTION 'away_team_id % is in league % but fixture league_id is %', 
      NEW.away_team_id, away_league, NEW.league_id
      USING ERRCODE = '23514';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists (for re-running)
DROP TRIGGER IF EXISTS fixtures_check_team_league_match_trigger ON public.fixtures;

CREATE TRIGGER fixtures_check_team_league_match_trigger
  BEFORE INSERT OR UPDATE OF home_team_id, away_team_id, league_id
  ON public.fixtures
  FOR EACH ROW
  EXECUTE FUNCTION public.fixtures_check_team_league_match();

-- Add documentation comment
COMMENT ON TRIGGER fixtures_check_team_league_match_trigger ON public.fixtures IS
  'Verifies that both team_ids belong to the same league as the fixture. '
  'Added 2026-06-08 to prevent wrong-league team assignments from causing '
  'silent data corruption.';
