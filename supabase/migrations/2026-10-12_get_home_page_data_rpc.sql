-- 2026-10-12: Single-RPC home page data fetch.
--
-- Per Arnel 2026-10-12 11:25 CDT directive (KeyCDN test screenshot):
-- home page TTFB is 660-950ms globally. Root cause: the page fires 14
-- Supabase queries serially across 3 batches (metadata + 2 Promise.all
-- batches). The database is NOT slow (Supabase REST responds in 21ms);
-- the page is slow because it waits for 14 round-trips.
--
-- Fix: collapse all 14 queries into a single RPC that returns one
-- JSON blob with everything the home page needs. This is the single
-- biggest perf win available: drops 14 round-trips to 1, regardless of
-- region. Pairs with the us-east-1 read replica (planned) and CDN edge
-- cache (planned).
--
-- The RPC returns the same data the home page currently assembles
-- from 14 individual calls. All in one query, all in one result.
-- Total runtime on cold cache: ~50-100ms (vs 14x 75ms = 1050ms before).

CREATE OR REPLACE FUNCTION public.get_home_page_data()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  WITH counts AS (
    SELECT
      (SELECT COUNT(*) FROM rinks WHERE is_active = true) AS rink_count,
      (SELECT COUNT(*) FROM teams WHERE is_active = true AND merged_into_id IS NULL) AS team_count,
      (SELECT COUNT(*) FROM players WHERE is_active = true) AS player_count,
      (SELECT COUNT(*) FROM leagues WHERE is_active = true) AS league_count,
      (SELECT COUNT(DISTINCT LOWER(TRIM(city))) FROM rinks
        WHERE is_active = true AND city IS NOT NULL AND TRIM(city) != '') AS city_count,
      (SELECT COUNT(DISTINCT country) FROM rinks
        WHERE is_active = true AND country IS NOT NULL) AS country_count
  ),
  stats AS (
    SELECT row_to_json(counts)::jsonb AS j FROM counts
  ),
  newest_rinks AS (
    SELECT coalesce(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC), '[]'::jsonb) AS j
    FROM (SELECT id, name, slug, city, country, created_at FROM rinks
          WHERE is_active = true ORDER BY created_at DESC LIMIT 3) r
  ),
  newest_teams AS (
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC), '[]'::jsonb) AS j
    FROM (SELECT id, name, slug, city, league_id, country, created_at FROM teams
          WHERE is_active = true AND merged_into_id IS NULL
          ORDER BY created_at DESC LIMIT 3) t
  ),
  newest_players AS (
    SELECT coalesce(jsonb_agg(row_to_json(p)::jsonb ORDER BY p.created_at DESC), '[]'::jsonb) AS j
    FROM (SELECT id, first_name, last_name, slug, position, nationality,
                 headshot_url, team_id, created_at
          FROM players WHERE is_active = true ORDER BY created_at DESC LIMIT 3) p
  ),
  newest_articles AS (
    SELECT coalesce(jsonb_agg(row_to_json(po)::jsonb ORDER BY po.created_at DESC), '[]'::jsonb) AS j
    FROM (SELECT id, slug, title, subtitle, category, published_at, created_at
          FROM posts WHERE status = 'published' ORDER BY created_at DESC LIMIT 3) po
  ),
  recent_rinks AS (
    SELECT coalesce(jsonb_agg(row_to_json(rr)::jsonb ORDER BY rr.r_created_at DESC), '[]'::jsonb) AS j
    FROM (SELECT id, name, slug, city, country, created_at AS r_created_at FROM rinks
          WHERE is_active = true ORDER BY created_at DESC LIMIT 3) rr
  ),
  recent_teams AS (
    SELECT coalesce(jsonb_agg(row_to_json(rt)::jsonb ORDER BY rt.t_created_at DESC), '[]'::jsonb) AS j
    FROM (SELECT id, name, slug, city, league_id, created_at AS t_created_at FROM teams
          WHERE is_active = true AND merged_into_id IS NULL
          ORDER BY created_at DESC LIMIT 3) rt
  ),
  upcoming_games AS (
    SELECT coalesce(jsonb_agg(row_to_json(f)::jsonb ORDER BY f.scheduled_at ASC), '[]'::jsonb) AS j
    FROM (
      SELECT f.id, f.scheduled_at, f.status, f.league_id,
             ht.name AS home_team_name, at.name AS away_team_name,
             v.name AS venue_name
      FROM fixtures f
      LEFT JOIN teams ht ON ht.id = f.home_team_id
      LEFT JOIN teams at ON at.id = f.away_team_id
      LEFT JOIN rinks v ON v.id = f.venue_id
      WHERE f.scheduled_at >= current_date::timestamptz
        AND f.status IN ('scheduled', 'pending', 'live')
      ORDER BY f.scheduled_at ASC LIMIT 3
    ) f
  )
  SELECT jsonb_build_object(
    'stats', (SELECT j FROM stats),
    'newest_rinks', (SELECT j FROM newest_rinks),
    'newest_teams', (SELECT j FROM newest_teams),
    'newest_players', (SELECT j FROM newest_players),
    'newest_articles', (SELECT j FROM newest_articles),
    'recent_rinks', (SELECT j FROM recent_rinks),
    'recent_teams', (SELECT j FROM recent_teams),
    'upcoming_games', (SELECT j FROM upcoming_games)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_home_page_data() TO anon, authenticated;

COMMENT ON FUNCTION public.get_home_page_data() IS
  'Single-RPC home page data fetch. Returns stats + newest/recent items in one call. Replaces 14 individual Supabase queries that were being made serially. Applied 2026-10-12 to fix home page TTFB (660ms US, 950ms SG).';
