-- 2026-08-28_get_directory_stats_add_activity.sql
-- Fold the home page "What's new on RinkStop" activity feed (4 separate
-- Supabase queries) into the get_directory_stats() RPC. One round-trip
-- instead of five.
--
-- Source: src/app/page.tsx lines ~177-191 (4 newest-X queries).
-- These ran in parallel via Promise.all but each one is still a network
-- round-trip from Vercel → Supabase (~50-150ms each on slow days).
-- Adding them to the existing RPC: 1 round-trip instead of 5.
--
-- Adds 4 new keys to the returned JSONB:
--   newest_rinks    jsonb (top 6 by created_at)
--   newest_teams    jsonb (top 6)
--   newest_players  jsonb (top 6)
--   newest_articles jsonb (top 6 published posts)

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
    ),
    -- Activity feed (the "What's new on RinkStop" section). Folded in
    -- 2026-08-28 from 4 parallel queries in src/app/page.tsx into this RPC.
    'newest_rinks', (
      SELECT COALESCE(jsonb_agg(r), '[]'::jsonb)
      FROM (
        SELECT id, name, slug, city, country, created_at
        FROM rinks
        WHERE is_active = true
        ORDER BY created_at DESC LIMIT 6
      ) r
    ),
    'newest_teams', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT id, name, slug, home_city, country_code, created_at
        FROM team_workspaces
        WHERE is_active = true
        ORDER BY created_at DESC LIMIT 6
      ) t
    ),
    'newest_players', (
      SELECT COALESCE(jsonb_agg(p), '[]'::jsonb)
      FROM (
        SELECT id, first_name, last_name, slug, position, nationality, created_at
        FROM players
        WHERE is_active = true
        ORDER BY created_at DESC LIMIT 6
      ) p
    ),
    'newest_articles', (
      SELECT COALESCE(jsonb_agg(a), '[]'::jsonb)
      FROM (
        SELECT id, slug, title, category, published_at, created_at
        FROM posts
        WHERE status = 'published'
        ORDER BY published_at DESC LIMIT 6
      ) a
    )
  );
$$;

GRANT EXECUTE ON FUNCTION get_directory_stats() TO anon, authenticated;

COMMENT ON FUNCTION get_directory_stats() IS
  'Home page directory stats + activity feed. Single RPC replaces 5 round-trips from src/app/page.tsx. STABLE so it''s safe to call from cached renders.';
