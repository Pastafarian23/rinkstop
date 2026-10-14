-- 2026-10-14: batch version of is_game_indexable for the sitemap.
-- Returns a table of (id, indexable) for the given input IDs in
-- one round trip. The sitemap fetches candidate rows in pages of
-- 1000, then calls this function with the array of 1000 ids, then
-- filters the result by indexable = 'index' before emitting URLs.
--
-- This avoids the N+1 of calling is_game_indexable(id) per row.
--
-- Logic mirrors is_game_indexable:
--   cancelled/postponed     → noindex
--   in_progress              → index
--   missing team_ids         → noindex
--   either team has no form  → noindex
--   < 3 of {H2H, home next, away next, same-day, completed result,
--   upcoming-within-week}    → noindex
--   otherwise                → index

CREATE OR REPLACE FUNCTION public.is_game_indexable_batch(ids uuid[])
RETURNS TABLE (out_id uuid, indexable text)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  r record;
  h2h_n int;
  home_next_n int;
  away_next_n int;
  same_day_n int;
  module_count int;
BEGIN
  FOR r IN
    SELECT f.id, f.status, f.scheduled_at, f.league_id, f.home_team_id, f.away_team_id, f.home_score, f.away_score
    FROM unnest(ids) AS input_id
    JOIN fixtures f ON f.id = input_id
  LOOP
    out_id := r.id;
    module_count := 0;

    IF r.status = 'cancelled' OR r.status = 'postponed' THEN
      indexable := 'noindex'; RETURN NEXT; CONTINUE;
    END IF;
    IF r.status = 'in_progress' THEN
      indexable := 'index'; RETURN NEXT; CONTINUE;
    END IF;
    IF r.home_team_id IS NULL OR r.away_team_id IS NULL THEN
      indexable := 'noindex'; RETURN NEXT; CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM fixtures
      WHERE league_id = r.league_id AND status = 'completed'
        AND (home_team_id = r.home_team_id OR away_team_id = r.home_team_id)
        AND id <> r.id
    ) THEN indexable := 'noindex'; RETURN NEXT; CONTINUE; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM fixtures
      WHERE league_id = r.league_id AND status = 'completed'
        AND (home_team_id = r.away_team_id OR away_team_id = r.away_team_id)
        AND id <> r.id
    ) THEN indexable := 'noindex'; RETURN NEXT; CONTINUE; END IF;

    SELECT COUNT(*) INTO h2h_n FROM fixtures
      WHERE league_id = r.league_id AND status = 'completed'
        AND ((home_team_id = r.home_team_id AND away_team_id = r.away_team_id)
          OR (home_team_id = r.away_team_id AND away_team_id = r.home_team_id))
        AND id <> r.id;
    SELECT COUNT(*) INTO home_next_n FROM fixtures
      WHERE league_id = r.league_id AND status IN ('scheduled', 'in_progress')
        AND (home_team_id = r.home_team_id OR away_team_id = r.home_team_id)
        AND scheduled_at > r.scheduled_at;
    SELECT COUNT(*) INTO away_next_n FROM fixtures
      WHERE league_id = r.league_id AND status IN ('scheduled', 'in_progress')
        AND (home_team_id = r.away_team_id OR away_team_id = r.away_team_id)
        AND scheduled_at > r.scheduled_at;
    SELECT COUNT(*) INTO same_day_n FROM fixtures
      WHERE league_id = r.league_id AND id <> r.id
        AND scheduled_at >= date_trunc('day', r.scheduled_at)
        AND scheduled_at < date_trunc('day', r.scheduled_at) + interval '1 day';

    IF h2h_n > 0 THEN module_count := module_count + 1; END IF;
    IF home_next_n > 0 THEN module_count := module_count + 1; END IF;
    IF away_next_n > 0 THEN module_count := module_count + 1; END IF;
    IF same_day_n > 0 THEN module_count := module_count + 1; END IF;
    IF r.status = 'completed' AND r.home_score IS NOT NULL AND r.away_score IS NOT NULL THEN
      module_count := module_count + 1;
    END IF;
    IF r.status = 'scheduled' AND r.scheduled_at < (now() + interval '7 days') THEN
      module_count := module_count + 1;
    END IF;

    IF module_count >= 3 THEN
      indexable := 'index';
    ELSE
      indexable := 'noindex';
    END IF;

    RETURN NEXT;
  END LOOP;
END;
$$;
