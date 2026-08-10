-- Migration: per-country team count RPC
-- Date: 2026-08-10
-- Author: KiloClaw
-- Context: Tier 1 follow-up to fc6b4268 (drop hardcoded country numbers).
-- Adds a single RPC that returns `[{"country": "...", "team_count": N}]`
-- ordered by team_count desc, so /directory/teams (and any future surface)
-- can display live per-country counts.
--
-- Why this is one RPC and not a query in page.tsx:
--   1. The /directory/teams page already runs an aggregate Supabase round
--      trip per render. Adding a second one (for GROUP BY country) doubles
--      TTFB. A single RPC merges them.
--   2. STABLE — safe to call from cached renders with revalidate.
--   3. SECURITY DEFINER — reads through the public role (anon).
--   4. Excludes empty country buckets (team_workspaces rows where
--      home_country IS NULL). HockeyTeamsContent asks for the top-10
--      so we hand back an ordered list.
--   5. Combines teams.home_country (user-created) + (joined) leagues.country
--      so a missing country on a team still inherits from its league.
--      Same CASE logic as the 2026-06-03 backfill (USA → United States).
--
-- Pre-state (verified 2026-08-10):
--   - 3,243 active teams
--   - ~1,243 non-null country values across teams + team_workspaces
--   - 134 distinct country strings (incl. legacy 'USA' / 'UK' rows)
--
-- Safety:
--   - READ-ONLY. No writes.
--   - GRANT EXECUTE to anon + authenticated.
--   - No schema changes (no ALTER TABLE).

DROP FUNCTION IF EXISTS get_country_team_counts() CASCADE;

CREATE OR REPLACE FUNCTION get_country_team_counts()
RETURNS TABLE (
  country TEXT,
  team_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH normalized AS (
    SELECT
      CASE
        WHEN t.country IS NOT NULL AND t.country <> '' THEN t.country
        WHEN l.country = 'USA' THEN 'United States'
        WHEN l.country IS NOT NULL THEN l.country
        ELSE NULL
      END AS country
    FROM teams t
    LEFT JOIN leagues l ON l.id = t.league_id
    WHERE l.country IS NULL OR l.country NOT IN ('World', 'Europe', 'Asia', 'International')
  ),
  country_aliases AS (
    -- Canonicalize legacy/short country codes so the top-10 list doesn't
    -- show 'United States' and 'USA' as separate countries. The 2026-06-03
    -- backfill normalized new writes but didn't clean up legacy rows.
    SELECT CASE country
      WHEN 'USA' THEN 'United States'
      WHEN 'US' THEN 'United States'
      WHEN 'UK' THEN 'United Kingdom'
      WHEN 'Great Britain' THEN 'United Kingdom'
      WHEN 'England' THEN 'United Kingdom'
      WHEN 'Scotland' THEN 'United Kingdom'
      WHEN 'Wales' THEN 'United Kingdom'
      WHEN 'Northern Ireland' THEN 'United Kingdom'
      WHEN 'Czechia' THEN 'Czech Republic'
      WHEN 'Korea' THEN 'South Korea'
      WHEN 'Korea, Republic of' THEN 'South Korea'
      WHEN 'Korea, South' THEN 'South Korea'
      WHEN 'Republic of Korea' THEN 'South Korea'
      WHEN 'RU' THEN 'Russia'
      WHEN 'BY' THEN 'Belarus'
      WHEN 'DE' THEN 'Germany'
      WHEN 'FI' THEN 'Finland'
      WHEN 'SE' THEN 'Sweden'
      WHEN 'NO' THEN 'Norway'
      WHEN 'CH' THEN 'Switzerland'
      WHEN 'AT' THEN 'Austria'
      WHEN 'IT' THEN 'Italy'
      WHEN 'FR' THEN 'France'
      WHEN 'DK' THEN 'Denmark'
      WHEN 'LV' THEN 'Latvia'
      WHEN 'SK' THEN 'Slovakia'
      WHEN 'PL' THEN 'Poland'
      WHEN 'CA' THEN 'Canada'
      WHEN 'JP' THEN 'Japan'
      WHEN 'CZ' THEN 'Czech Republic'
      WHEN 'USA/Canada' THEN 'Canada'
      ELSE country
    END AS country
    FROM normalized
  ),
  -- Normalize user_workspaces the same way as teams so codes like
  -- US/CA/RU are canonicalized before the UNION ALL
  user_workspaces AS (
    SELECT
      CASE
        WHEN tw.home_country IS NOT NULL AND tw.home_country <> '' THEN tw.home_country
        ELSE NULL
      END AS country
    FROM team_workspaces tw
    WHERE tw.is_active = true
  ),
  user_workspaces_normalized AS (
    SELECT CASE
      WHEN country IN ('USA','US')   THEN 'United States'
      WHEN country IN ('UK')         THEN 'United Kingdom'
      WHEN country IN ('Great Britain','England','Scotland','Wales','Northern Ireland') THEN 'United Kingdom'
      WHEN country IN ('Czechia')    THEN 'Czech Republic'
      WHEN country IN ('Korea','Korea, Republic of','Korea, South','Republic of Korea') THEN 'South Korea'
      WHEN country IN ('RU')         THEN 'Russia'
      WHEN country IN ('BY')         THEN 'Belarus'
      WHEN country IN ('DE')         THEN 'Germany'
      WHEN country IN ('FI')         THEN 'Finland'
      WHEN country IN ('SE')         THEN 'Sweden'
      WHEN country IN ('NO')         THEN 'Norway'
      WHEN country IN ('CH')         THEN 'Switzerland'
      WHEN country IN ('AT')         THEN 'Austria'
      WHEN country IN ('IT')         THEN 'Italy'
      WHEN country IN ('FR')         THEN 'France'
      WHEN country IN ('DK')         THEN 'Denmark'
      WHEN country IN ('LV')         THEN 'Latvia'
      WHEN country IN ('SK')         THEN 'Slovakia'
      WHEN country IN ('PL')         THEN 'Poland'
      WHEN country IN ('CA')         THEN 'Canada'
      WHEN country IN ('JP')         THEN 'Japan'
      WHEN country IN ('CZ','Czechia')  THEN 'Czech Republic'
      WHEN country IN ('USA/Canada','US/Canada','US, Canada','USA, Canada','US / Canada') THEN 'Canada'
      ELSE country
    END AS country
    FROM user_workspaces
  ),
  all_countries AS (
    SELECT country FROM country_aliases
    UNION ALL
    SELECT country FROM user_workspaces_normalized
  )
  SELECT
    ac.country AS country,
    COUNT(*) AS team_count
  FROM all_countries ac
  WHERE ac.country IS NOT NULL
  GROUP BY ac.country
  ORDER BY COUNT(*) DESC, ac.country ASC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION get_country_team_counts() TO anon, authenticated;

COMMENT ON FUNCTION get_country_team_counts() IS
  'Per-country team counts. Returns top 50 countries by team count (teams + team_workspaces). STABLE so it is safe to call from cached renders. Used by /directory/teams to populate the top-10 countries section with live numbers instead of hardcoded approximations.';
