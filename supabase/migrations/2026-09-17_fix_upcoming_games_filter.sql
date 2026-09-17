-- 2026-09-17: Fix upcoming_games filter in get_directory_stats RPC.
--
-- Bug: Home page "UPCOMING GAMES" section was showing Dynamo Moscow @
-- Vladivostok (Sep 17) which has a final score 2-0 but status='scheduled'.
-- The status was wrong because the daily scores ingest only fetches 2
-- days of lookback — past games never get re-fetched to update their
-- status field. Result: home page shows completed games under
-- "UPCOMING GAMES" label.
--
-- Fix: Filter upcoming_games by score IS NULL in addition to status.
-- A game with any score is by definition not upcoming, regardless of
-- what the status field says. This is a defensive filter that protects
-- against stale status data.
--
-- Long-term: the daily scores ingest should update status for past games
-- too. Tracking that as a separate workstream.

DROP FUNCTION IF EXISTS get_directory_stats();
CREATE FUNCTION get_directory_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'rink_count',     (SELECT COUNT(*) FROM rinks WHERE is_active = true),
    'team_count',     (SELECT COUNT(*) FROM teams WHERE is_active = true AND merged_into_id IS NULL),
    'player_count',   (SELECT COUNT(*) FROM players WHERE is_active = true),
    'league_count',   (SELECT COUNT(*) FROM leagues WHERE is_active = true),
    'city_count',     (SELECT COUNT(DISTINCT city) FROM teams WHERE is_active = true AND city IS NOT NULL),
    'country_count',  (SELECT COUNT(DISTINCT country) FROM teams WHERE is_active = true AND country IS NOT NULL),
    'newest_rinks', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT id, name, slug, city, country, created_at
        FROM rinks WHERE is_active = true
        ORDER BY created_at DESC LIMIT 3
      ) t
    ),
    'newest_teams', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT id, name, slug, city, league_id, country, created_at
        FROM teams WHERE is_active = true AND merged_into_id IS NULL
        ORDER BY created_at DESC LIMIT 3
      ) t
    ),
    'newest_players', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT id, first_name, last_name, slug, position, nationality, created_at
        FROM players WHERE is_active = true
        ORDER BY created_at DESC LIMIT 3
      ) t
    ),
    'newest_articles', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT id, slug, title, category, published_at, created_at
        FROM posts WHERE status = 'published'
        ORDER BY COALESCE(published_at, created_at) DESC LIMIT 3
      ) t
    ),
    'recent_rinks', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT id, name, slug, city, country
        FROM rinks WHERE is_active = true
        ORDER BY created_at DESC LIMIT 3
      ) t
    ),
    'recent_teams', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT
          t.id, t.name, t.slug, t.city, t.league_id, l.name AS league_name
        FROM teams t
        LEFT JOIN leagues l ON l.id = t.league_id
        WHERE t.is_active = true AND t.merged_into_id IS NULL
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
          AND f.home_score IS NULL
          AND f.away_score IS NULL
        ORDER BY f.scheduled_at ASC LIMIT 3
      ) g
    )
  );
$$;

GRANT EXECUTE ON FUNCTION get_directory_stats() TO anon, authenticated;

COMMENT ON FUNCTION get_directory_stats() IS
  'Home page directory stats. Single RPC replaces 9 round-trips from src/app/page.tsx. STABLE so it''s safe to call from cached renders.';
