-- Migration: directory aggregation RPCs
-- Date: 2026-08-13
-- Author: KiloClaw
-- Context: third round of perf work on /directory/teams. After PR #139
-- (parallelize + cache) the page is at ~600ms; the next 200ms comes from
-- the two remaining JS-aggregation queries:
--   - getTopLeagues      pulls 200 leagues with inner-join to ALL teams
--   - getCountryLeaguesMap paginates all 2,600+ active teams to build
--     a country→leagues map (the cascading dropdown data)
-- Push both aggregations into a single SQL roundtrip each.
--
-- Why:
--   1. Avoid pulling thousands of rows over the wire just to count them in JS.
--   2. The view can be STABLE so caching wrapping is safe.
--   3. SECURITY DEFINER so the anon surface can call it without an admin key.
--
-- Backwards-compatible: nothing else changes. The JS functions still exist
-- and are used as a fallback if these RPCs fail.
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
    -- Map well-known leagues to one of the 5 levels. NULL = adult (long
    -- tail). Kept as a SQL CASE so the JS layer can compose it without
    -- pulling every league_name from the API.
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

DROP FUNCTION IF EXISTS get_country_leagues_map() CASCADE;

CREATE OR REPLACE FUNCTION get_country_leagues_map()
RETURNS TABLE (
  country TEXT,
  league_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN tw.country_code = 'US' THEN 'United States'
      WHEN tw.country_code = 'CA' THEN 'Canada'
      WHEN tw.country_code IS NOT NULL AND tw.country_code <> ''
        THEN tw.home_country  -- fallback to text name
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
    AND l.name IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION get_country_leagues_map() TO anon, authenticated;

COMMENT ON FUNCTION get_country_leagues_map() IS
  'Country→league map for the cascading dropdown on /directory/teams. Returns flat (country, league_name) rows; the JS layer groups by country. STABLE — safe to call from cached renders. Replaces the paginated 2600-row team_workspaces scan in src/lib/directory-counts.ts getCountryLeaguesMap.';
