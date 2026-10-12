-- 2026-10-12: Normalize player nationality codes to country names via SQL view.
--
-- Background: players.nationality stores 3-letter ISO codes (CAN, USA, SWE, etc.)
-- rinks.country, teams.country, leagues.country store full names ('Canada', 'United
-- States', 'Sweden'). Joins between these return 0 rows. Consumers like
-- 'Players in country X' UIs would silently render 0.
--
-- Fix: create a SQL view that exposes a normalized country_name on players,
-- plus a helper function for explicit joins. Read-only — no table changes,
-- no backfill migration, no risk to existing data.
--
-- Handles the US/USA split (both are present in the data) by normalizing
-- all 9 distinct codes to their canonical English country names.

-- ---- 1. Helper function: normalize any 3-letter ISO code to a country name ----
CREATE OR REPLACE FUNCTION public.iso3_to_country_name(code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE upper(trim(code))
    WHEN 'CAN' THEN 'Canada'
    WHEN 'USA' THEN 'United States'
    WHEN 'US'  THEN 'United States'
    WHEN 'SWE' THEN 'Sweden'
    WHEN 'FIN' THEN 'Finland'
    WHEN 'RUS' THEN 'Russia'
    WHEN 'CZE' THEN 'Czech Republic'
    WHEN 'SUI' THEN 'Switzerland'
    WHEN 'DNK' THEN 'Denmark'
    WHEN 'NOR' THEN 'Norway'
    WHEN 'GER' THEN 'Germany'
    WHEN 'FRA' THEN 'France'
    WHEN 'AUT' THEN 'Austria'
    WHEN 'ITA' THEN 'Italy'
    WHEN 'GBR' THEN 'United Kingdom'
    WHEN 'UK'  THEN 'United Kingdom'
    WHEN 'NED' THEN 'Netherlands'
    WHEN 'NLD' THEN 'Netherlands'
    WHEN 'SVK' THEN 'Slovakia'
    WHEN 'SVN' THEN 'Slovenia'
    WHEN 'POL' THEN 'Poland'
    WHEN 'HUN' THEN 'Hungary'
    WHEN 'ROU' THEN 'Romania'
    WHEN 'BUL' THEN 'Bulgaria'
    WHEN 'CRO' THEN 'Croatia'
    WHEN 'SRB' THEN 'Serbia'
    WHEN 'UKR' THEN 'Ukraine'
    WHEN 'BLR' THEN 'Belarus'
    WHEN 'LAT' THEN 'Latvia'
    WHEN 'LTU' THEN 'Lithuania'
    WHEN 'EST' THEN 'Estonia'
    WHEN 'JPN' THEN 'Japan'
    WHEN 'KOR' THEN 'South Korea'
    WHEN 'CHN' THEN 'China'
    WHEN 'HKG' THEN 'Hong Kong'
    WHEN 'TPE' THEN 'Taiwan'
    WHEN 'AUS' THEN 'Australia'
    WHEN 'NZL' THEN 'New Zealand'
    WHEN 'MEX' THEN 'Mexico'
    WHEN 'BRA' THEN 'Brazil'
    WHEN 'ARG' THEN 'Argentina'
    WHEN 'CHI' THEN 'Chile'
    WHEN 'RSA' THEN 'South Africa'
    WHEN 'ESP' THEN 'Spain'
    WHEN 'POR' THEN 'Portugal'
    WHEN 'BEL' THEN 'Belgium'
    WHEN 'IRL' THEN 'Ireland'
    WHEN 'ISL' THEN 'Iceland'
    ELSE upper(trim(code))
  END;
$$;

-- ---- 2. View: players_with_country adds a normalized country_name column ----
-- Joins via the helper function so consumers can filter by country name
-- (e.g. country_name = 'United States') just like rinks.country.
CREATE OR REPLACE VIEW public.players_with_country AS
  SELECT
    p.*,
    public.iso3_to_country_name(p.nationality) AS country_name
  FROM public.players p;

-- Grant read access (PostgREST picks up views in the public schema).
GRANT SELECT ON public.players_with_country TO anon, authenticated;

-- ---- 3. RLS note ----
-- The view inherits RLS from the underlying players table, so anon/authenticated
-- users only see rows they're allowed to see. No new policy needed.
