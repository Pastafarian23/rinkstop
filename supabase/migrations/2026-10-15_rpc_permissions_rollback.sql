-- 2026-10-15: rollback for 2026-10-15_rpc_permissions.sql
--
-- Only run this if 2026-10-15_rpc_permissions.sql caused a
-- problem (e.g. the sitemap stopped working, or a downstream
-- caller is anon/authenticated and we missed it).
--
-- Reverses:
--   1. REVOKE on is_game_indexable_batch from PUBLIC/anon/authenticated
--   2. GRANT on is_game_indexable_batch to service_role
--   3. DROP of is_game_indexable
--
-- After running this, the database is back to the
-- pre-2026-10-15_rpc_permissions.sql state.

-- 1. Re-grant to anon, authenticated, and PUBLIC.
GRANT EXECUTE ON FUNCTION public.is_game_indexable_batch(uuid[]) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_game_indexable_batch(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.is_game_indexable_batch(uuid[]) TO authenticated;

-- 2. Revoke from service_role (it's the default for superuser; revoke
--    to be explicit and match the pre-migration state).
REVOKE EXECUTE ON FUNCTION public.is_game_indexable_batch(uuid[]) FROM service_role;

-- 3. Re-create is_game_indexable (it was dropped in the forward
--    migration).  Same definition as in 2026-10-14_game_indexable_rpc.sql.
CREATE OR REPLACE FUNCTION public.is_game_indexable(p_fixture_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_home_id uuid;
  v_away_id uuid;
  v_scheduled_at timestamptz;
  v_home_form_count int;
  v_away_form_count int;
  v_h2h_count int;
  v_home_next_count int;
  v_away_next_count int;
  v_same_day_count int;
BEGIN
  SELECT status, home_team_id, away_team_id, scheduled_at
    INTO v_status, v_home_id, v_away_id, v_scheduled_at
    FROM fixtures WHERE id = p_fixture_id;
  IF NOT FOUND THEN RETURN 'noindex'; END IF;
  IF v_status IN ('cancelled', 'postponed') THEN RETURN 'noindex'; END IF;
  IF v_status = 'in_progress' THEN RETURN 'index'; END IF;

  -- Form: count completed games for each team in the same league
  -- (any time window).
  SELECT count(*) INTO v_home_form_count FROM fixtures
    WHERE league_id = (SELECT league_id FROM fixtures WHERE id = p_fixture_id)
      AND (home_team_id = v_home_id OR away_team_id = v_home_id)
      AND status = 'completed';
  SELECT count(*) INTO v_away_form_count FROM fixtures
    WHERE league_id = (SELECT league_id FROM fixtures WHERE id = p_fixture_id)
      AND (home_team_id = v_away_id OR away_team_id = v_away_id)
      AND status = 'completed';
  IF v_home_form_count = 0 OR v_away_form_count = 0 THEN
    RETURN 'noindex';
  END IF;

  IF v_status = 'scheduled' THEN
    IF v_scheduled_at < now() THEN RETURN 'noindex'; END IF;
    -- Upcoming within 7 days: countdown-able
    IF v_scheduled_at < now() + interval '7 days' THEN
      RETURN 'index';
    END IF;
    -- Further out: need 3 of {H2H, home next, away next, same-day}
    SELECT count(*) INTO v_h2h_count FROM fixtures
      WHERE league_id = (SELECT league_id FROM fixtures WHERE id = p_fixture_id)
        AND ((home_team_id = v_home_id AND away_team_id = v_away_id)
          OR (home_team_id = v_away_id AND away_team_id = v_home_id))
        AND status = 'completed' AND id != p_fixture_id;
    SELECT count(*) INTO v_home_next_count FROM fixtures
      WHERE home_team_id = v_home_id AND scheduled_at > v_scheduled_at
        AND status IN ('scheduled', 'in_progress') LIMIT 1;
    SELECT count(*) INTO v_away_next_count FROM fixtures
      WHERE away_team_id = v_away_id AND scheduled_at > v_scheduled_at
        AND status IN ('scheduled', 'in_progress') LIMIT 1;
    SELECT count(*) INTO v_same_day_count FROM fixtures
      WHERE league_id = (SELECT league_id FROM fixtures WHERE id = p_fixture_id)
        AND scheduled_at::date = v_scheduled_at::date
        AND id != p_fixture_id;
    IF (CASE WHEN v_h2h_count > 0 THEN 1 ELSE 0 END)
      + (CASE WHEN v_home_next_count > 0 THEN 1 ELSE 0 END)
      + (CASE WHEN v_away_next_count > 0 THEN 1 ELSE 0 END)
      + (CASE WHEN v_same_day_count > 0 THEN 1 ELSE 0 END) >= 3 THEN
      RETURN 'index';
    END IF;
    RETURN 'noindex';
  END IF;

  IF v_status = 'completed' THEN
    -- Completed with score: always index (recap + boxscore render)
    RETURN 'index';
  END IF;

  RETURN 'noindex';
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_game_indexable(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_game_indexable(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_game_indexable(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_game_indexable(uuid) TO service_role;
