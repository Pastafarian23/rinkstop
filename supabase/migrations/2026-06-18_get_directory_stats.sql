-- Migration: home page directory stats RPC
-- Replaces 9 separate Supabase queries in src/app/page.tsx with one.
-- Each query was running on every render (force-dynamic), causing 1+ second
-- TTFB. The RPC does the dedupe and joins in PostgreSQL, returning one
-- JSONB document.
--
-- Combined with `revalidate = 300` (ISR every 5 min) on the home page,
-- this brings home page TTFB from ~1s to ~50-100ms after the first render.

DROP FUNCTION IF EXISTS get_directory_stats() CASCADE;

CREATE OR REPLACE FUNCTION get_directory_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'rinks', (SELECT COUNT(*) FROM rinks WHERE is_active = true),
    'teams', (SELECT COUNT(*) FROM teams),
    'players', (SELECT COUNT(*) FROM players),
    'leagues', (SELECT COUNT(*) FROM leagues),
    'cities', (SELECT COUNT(DISTINCT lower(trim(city))) FROM rinks WHERE is_active = true AND city IS NOT NULL),
    'countries', (SELECT COUNT(DISTINCT country) FROM rinks WHERE is_active = true AND country IS NOT NULL),
    'recent_rinks', (
      SELECT COALESCE(jsonb_agg(r), '[]'::jsonb)
      FROM (
        SELECT id, name, slug, city, country
        FROM rinks
        WHERE is_active = true
        ORDER BY created_at DESC LIMIT 3
      ) r
    ),
    'recent_teams', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT t.id, t.name, t.slug, t.city, t.league_id, l.name AS league_name
        FROM teams t
        LEFT JOIN leagues l ON l.id = t.league_id
        ORDER BY t.created_at DESC LIMIT 3
      ) t
    ),
    'upcoming_games', (
      SELECT COALESCE(jsonb_agg(g), '[]'::jsonb)
      FROM (
        SELECT
          f.id,
          f.scheduled_at AS date,
          ht.name AS home_team_name,
          at.name AS away_team_name,
          r.name AS venue_name
        FROM fixtures f
        LEFT JOIN teams ht ON ht.id = f.home_team_id
        LEFT JOIN teams at ON at.id = f.away_team_id
        LEFT JOIN rinks r ON r.id = f.venue_id
        WHERE f.scheduled_at >= CURRENT_DATE
          AND f.status IN ('scheduled', 'pending', 'live')
        ORDER BY f.scheduled_at ASC LIMIT 3
      ) g
    )
  );
$$;

GRANT EXECUTE ON FUNCTION get_directory_stats() TO anon, authenticated;

COMMENT ON FUNCTION get_directory_stats() IS
  'Home page directory stats. Single RPC replaces 9 round-trips from src/app/page.tsx. STABLE so it''s safe to call from cached renders.';