-- 2026-10-14: SQL function is_game_indexable for the sitemap to
-- compute the same indexability decision as the page-side
-- isGameIndexable in src/lib/game-indexable.ts.
--
-- The function takes a fixture id and returns 'index' or 'noindex'.
-- Logic mirrors the JS predicate: cancelled/postponed always
-- noindex; in_progress always index; scheduled and completed
-- require both teams' form (each team must have at least one
-- completed game in this league) AND at least 3 of the
-- {H2H, home next game, away next game, same-day games,
-- completed result, upcoming-within-week} signals.
--
-- Used by the sitemap's RPC query path (Phase 3 follow-up).

CREATE OR REPLACE FUNCTION public.is_game_indexable(fixture_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  f record;
  home_form_count int;
  away_form_count int;
  h2h_count int;
  home_next_count int;
  away_next_count int;
  same_day_count int;
  module_count int;
  result text;
BEGIN
  SELECT id, status, scheduled_at, league_id, home_team_id, away_team_id, home_score, away_score
    INTO f
    FROM fixtures WHERE id = fixture_id;

  IF NOT FOUND THEN
    RETURN 'noindex';
  END IF;

  IF f.status = 'cancelled' OR f.status = 'postponed' THEN
    RETURN 'noindex';
  END IF;

  IF f.status = 'in_progress' THEN
    RETURN 'index';
  END IF;

  IF f.home_team_id IS NULL OR f.away_team_id IS NULL THEN
    RETURN 'noindex';
  END IF;

  -- Both teams' form = each team has at least 1 completed game in
  -- this league.
  SELECT COUNT(*) INTO home_form_count
    FROM fixtures
    WHERE league_id = f.league_id
      AND status = 'completed'
      AND (home_team_id = f.home_team_id OR away_team_id = f.home_team_id)
      AND id <> f.id;
  SELECT COUNT(*) INTO away_form_count
    FROM fixtures
    WHERE league_id = f.league_id
      AND status = 'completed'
      AND (home_team_id = f.away_team_id OR away_team_id = f.away_team_id)
      AND id <> f.id;
  IF home_form_count = 0 OR away_form_count = 0 THEN
    RETURN 'noindex';
  END IF;

  -- H2H count (completed same matchup, exclude self)
  SELECT COUNT(*) INTO h2h_count
    FROM fixtures
    WHERE league_id = f.league_id
      AND status = 'completed'
      AND ((home_team_id = f.home_team_id AND away_team_id = f.away_team_id)
        OR (home_team_id = f.away_team_id AND away_team_id = f.home_team_id))
      AND id <> f.id;

  -- Each team's next game
  SELECT COUNT(*) INTO home_next_count
    FROM fixtures
    WHERE league_id = f.league_id
      AND status IN ('scheduled', 'in_progress')
      AND (home_team_id = f.home_team_id OR away_team_id = f.home_team_id)
      AND scheduled_at > f.scheduled_at;
  SELECT COUNT(*) INTO away_next_count
    FROM fixtures
    WHERE league_id = f.league_id
      AND status IN ('scheduled', 'in_progress')
      AND (home_team_id = f.home_team_id OR away_team_id = f.away_team_id)
      AND scheduled_at > f.scheduled_at;

  -- Same-day games in this league (other matches, same UTC day)
  SELECT COUNT(*) INTO same_day_count
    FROM fixtures
    WHERE league_id = f.league_id
      AND id <> f.id
      AND scheduled_at >= date_trunc('day', f.scheduled_at)
      AND scheduled_at < date_trunc('day', f.scheduled_at) + interval '1 day';

  -- Compute module count for the threshold check
  module_count := 0;
  IF h2h_count > 0 THEN module_count := module_count + 1; END IF;
  IF home_next_count > 0 THEN module_count := module_count + 1; END IF;
  IF away_next_count > 0 THEN module_count := module_count + 1; END IF;
  IF same_day_count > 0 THEN module_count := module_count + 1; END IF;
  IF f.status = 'completed' AND f.home_score IS NOT NULL AND f.away_score IS NOT NULL THEN
    module_count := module_count + 1; -- completed result
  END IF;
  IF f.status = 'scheduled' AND f.scheduled_at < (now() + interval '7 days') THEN
    module_count := module_count + 1; -- countdown-able upcoming
  END IF;

  IF module_count >= 3 THEN
    result := 'index';
  ELSE
    result := 'noindex';
  END IF;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.is_game_indexable(uuid) IS
  '2026-10-14: page-side isGameIndexable in SQL form, used by the sitemap';
