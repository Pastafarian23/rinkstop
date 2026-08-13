-- Migration: directory aggregation RPCs
-- Date: 2026-08-13
-- Author: KiloClaw
-- Context: third round of perf work on /directory/teams. Replaces JS-side
-- aggregations on top of large data pulls with single-roundtrip SQL
-- aggregates.
--
-- Why JSONB returns instead of TABLE:
--   PostgREST caps TABLE-returning RPCs at 1000 rows by default. The
--   country_leagues map has ~2600 rows. Returning JSONB aggregates lets
--   the full payload come back in one call.
--
-- Backwards-compatible: pre-existing JS functions (getTopLeagues,
-- getCountryLeaguesMap) still exist. We add new RPCs next to them.
--
-- Pre-state (verified 2026-08-13):
--   - 2,787 active teams in team_workspaces
--   - 173 active leagues
--   - getTopLeagues currently takes 666ms per call
--   - getCountryLeaguesMap currently takes 534ms per call (4 pages)

-- 1. Top leagues by team count (with per-level breakdown) --------------------

DROP FUNCTION IF EXISTS get_top_leagues_with_levels() CASCADE;

CREATE OR REPLACE FUNCTION get_top_leagues_with_levels()
RETURNS TABLE (
  name TEXT,
  slug TEXT,
  team_count BIGINT,
  level TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.name::text AS name,
    l.slug::text AS slug,
    COUNT(tw.id)::bigint AS team_count,
    CASE
      WHEN l.name IN (
        'National Hockey League','American Hockey League','Kontinental Hockey League',
        'Finnish Liiga','Liiga','Swedish Hockey League','PWHL Women',
        'Professional Women\u2019s Hockey League','Professional Women''s Hockey League',
        'ECHL','Asia League Ice Hockey','DEL','NLA','Czech Extraliga'
      ) THEN 'pro'
      WHEN l.name IN (
        'Ontario Hockey League','Western Hockey League','Quebec Major Junior Hockey League',
        'United States Hockey League'
      ) THEN 'junior'
      WHEN l.name IN (
        'NCAA','NCAA Division 1 Men''s Hockey','NCAA Division 3 Men''s Hockey',
        'U SPORTS'
      ) THEN 'college'
      WHEN l.name IN (
        'Friendly International','IIHF World Championships'
      ) THEN 'international'
      ELSE 'adult'
    END AS level
  FROM leagues l
  LEFT JOIN team_workspaces tw
    ON tw.league_id = l.id AND tw.is_active = true
  WHERE l.is_active = true
  GROUP BY l.name, l.slug
  ORDER BY COUNT(tw.id) DESC, l.name ASC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION get_top_leagues_with_levels() TO anon, authenticated;

COMMENT ON FUNCTION get_top_leagues_with_levels() IS
  'Top 100 active leagues with team counts and a coarse level classifier. STABLE — safe to call from cached renders. Replaces the JS-side leagues×team_workspaces inner-join aggregation in src/lib/directory-counts.ts getTopLeagues.';

-- 2. Country → leagues map (cascading dropdown data) ------------------------
-- Returns a JSONB array of {country, leagues[]} objects so the full
-- ~2,600-row payload comes back in one round-trip (PostgREST caps
-- TABLE-returning RPCs at 1000 rows).

DROP FUNCTION IF EXISTS get_country_leagues_map_json() CASCADE;

CREATE OR REPLACE FUNCTION get_country_leagues_map_json()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH parsed AS (
    SELECT
      CASE
        WHEN tw.country_code = 'US' THEN 'United States'
        WHEN tw.country_code = 'CA' THEN 'Canada'
        WHEN tw.country_code IS NOT NULL AND tw.country_code <> ''
          THEN tw.home_country
        WHEN tw.home_country IS NOT NULL AND tw.home_country <> ''
          THEN tw.home_country
        ELSE NULL
      END AS country,
      l.name::text AS league_name
    FROM team_workspaces tw
    LEFT JOIN leagues l ON l.id = tw.league_id
    WHERE tw.is_active = true
      AND l.is_active = true
      AND (tw.country_code IS NOT NULL OR tw.home_country IS NOT NULL)
      AND l.name IS NOT NULL
  ),
  grouped AS (
    SELECT country, league_name FROM parsed WHERE country IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(row_to_json(g)), '[]'::jsonb)::jsonb
  FROM (
    SELECT country, ARRAY_AGG(DISTINCT league_name ORDER BY league_name) AS leagues
    FROM grouped
    GROUP BY country
  ) g;
$$;

GRANT EXECUTE ON FUNCTION get_country_leagues_map_json() TO anon, authenticated;

COMMENT ON FUNCTION get_country_leagues_map_json() IS
  'Country→league map for the cascading dropdown. Returns JSONB array of {country, leagues[]} entries. STABLE — safe to call from cached renders. Replaces the paginated 2600-row team_workspaces scan in src/lib/directory-counts.ts getCountryLeaguesMap.';
