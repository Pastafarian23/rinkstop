-- Migration: make get_home_page_data use the canonical tables (2026-11-11)
--
-- WHY:
--   The Nov 6 migration canonicalized `get_directory_stats()` to count
--   `team_workspaces` (active + public). The HOMEPAGE does not use that
--   RPC -- it uses a separate one, `get_home_page_data()`, which was
--   never updated.
--
--   Live before this fix:
--     get_home_page_data() -> stats.team_count = 2613  (legacy `teams`)
--     get_directory_stats() -> team_count       = 2656  (canonical)
--
--   So the homepage advertised 2,613 teams while every other page on the
--   site said 2,656 -- the same `teams` vs `team_workspaces` two-table
--   trap that produced three different counts on the $499 dataset pages.
--
--   This function also produced city_count 1419 / country_count 78 from
--   `rinks`, while the canonical RPC reports 687 / 85 from `teams`. The
--   hero said "1400+ cities in 78 countries" -- both numbers wrong.
--
-- SCOPE:
--   ONLY the three count/teams blocks change. upcoming_games, highlights,
--   newest_players, newest_articles, newest_rinks and recent_rinks are
--   byte-identical to the original, because they were not broken.
--
-- This file is applied by hand; it is recorded in _HAND_APPLIED.md.

CREATE OR REPLACE FUNCTION public.get_home_page_data()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  WITH counts AS (
    SELECT
      (SELECT COUNT(*) FROM public.rinks WHERE is_active = true) AS rink_count,
      -- CANONICAL (2026-11-11): the public directory reads team_workspaces.
      -- The legacy `teams` table is a different population (see commit
      -- 282c8bcf). This RPC was missed by the Nov 6 canonicalization of
      -- get_directory_stats(), so the homepage advertised 2,613 teams
      -- while every other page said 2,656.
      (SELECT COUNT(*) FROM public.team_workspaces
        WHERE is_active = true AND visibility = 'public') AS team_count,
      (SELECT COUNT(*) FROM public.players WHERE is_active = true) AS player_count,
      (SELECT COUNT(*) FROM public.leagues WHERE is_active = true) AS league_count,
      -- Match get_directory_stats EXACTLY (2026-11-11). These came from
      -- `rinks`, the canonical RPC counts `teams`, so the two RPCs
      -- disagreed: 1419 cities / 78 countries here vs 687 / 85 there.
      -- The homepage hero said "1400+ cities in 78 countries" — both wrong.
      (SELECT COUNT(DISTINCT city) FROM public.teams
        WHERE is_active = true AND city IS NOT NULL) AS city_count,
      (SELECT COUNT(DISTINCT country) FROM public.teams
        WHERE is_active = true AND country IS NOT NULL) AS country_count
  ),
  stats AS (
    SELECT row_to_json(counts)::jsonb AS j FROM counts
  ),
  newest_rinks AS (
    SELECT coalesce(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC), '[]'::jsonb) AS j
    FROM (SELECT id, name, slug, city, country, created_at FROM public.rinks
          WHERE is_active = true ORDER BY created_at DESC LIMIT 3) r
  ),
  newest_teams AS (
    SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC), '[]'::jsonb) AS j
    FROM (SELECT id, name, slug, home_city, league_id, country_code, created_at
          FROM public.team_workspaces
          WHERE is_active = true AND visibility = 'public'
          ORDER BY created_at DESC LIMIT 3) t
  ),
  newest_players AS (
    SELECT coalesce(jsonb_agg(row_to_json(p)::jsonb ORDER BY p.created_at DESC), '[]'::jsonb) AS j
    FROM (SELECT id, first_name, last_name, slug, position, nationality,
                 headshot_url, team_id, created_at
          FROM public.players WHERE is_active = true ORDER BY created_at DESC LIMIT 3) p
  ),
  newest_articles AS (
    SELECT coalesce(jsonb_agg(row_to_json(po)::jsonb ORDER BY po.created_at DESC), '[]'::jsonb) AS j
    FROM (SELECT id, slug, title, subtitle, category, published_at, created_at
          FROM public.posts WHERE status = 'published' ORDER BY created_at DESC LIMIT 3) po
  ),
  recent_rinks AS (
    SELECT coalesce(jsonb_agg(row_to_json(rr)::jsonb ORDER BY rr.r_created_at DESC), '[]'::jsonb) AS j
    FROM (SELECT id, name, slug, city, country, created_at AS r_created_at FROM public.rinks
          WHERE is_active = true ORDER BY created_at DESC LIMIT 3) rr
  ),
  recent_teams AS (
    SELECT coalesce(jsonb_agg(row_to_json(rt)::jsonb ORDER BY rt.t_created_at DESC), '[]'::jsonb) AS j
    FROM (SELECT id, name, slug, home_city, league_id, created_at AS t_created_at
          FROM public.team_workspaces
          WHERE is_active = true AND visibility = 'public'
          ORDER BY created_at DESC LIMIT 3) rt
  ),
  upcoming_games AS (
    SELECT coalesce(jsonb_agg(row_to_json(f)::jsonb ORDER BY f.scheduled_at ASC), '[]'::jsonb) AS j
    FROM (
      SELECT f.id, f.scheduled_at, f.status, f.league_id,
             ht.name AS home_team_name, at.name AS away_team_name,
             v.name AS venue_name
      FROM public.fixtures f
      LEFT JOIN public.teams ht ON ht.id = f.home_team_id
      LEFT JOIN public.teams at ON at.id = f.away_team_id
      LEFT JOIN public.rinks v ON v.id = f.venue_id
      WHERE f.scheduled_at >= current_date::timestamptz
        AND f.status IN ('scheduled', 'pending', 'live')
      ORDER BY f.scheduled_at ASC LIMIT 3
    ) f
  ),
  highlights AS (
    SELECT coalesce(jsonb_agg(row_to_json(hl)::jsonb ORDER BY hl.match_date DESC), '[]'::jsonb) AS j
    FROM (
      SELECT id, title, description, highlight_type, video_url, embed_url,
             image_url, source, channel, post_id, match_id, match_date,
             match_season, match_round, league_id, league_name,
             home_team_id, home_team_name, home_team_logo,
             away_team_id, away_team_name, away_team_logo
      FROM public.highlight_backups
      WHERE video_url IS NOT NULL
        AND video_url ILIKE '%youtube.com%'
      ORDER BY match_date DESC
      LIMIT 5
    ) hl
  )
  SELECT jsonb_build_object(
    'stats', (SELECT j FROM stats),
    'newest_rinks', (SELECT j FROM newest_rinks),
    'newest_teams', (SELECT j FROM newest_teams),
    'newest_players', (SELECT j FROM newest_players),
    'newest_articles', (SELECT j FROM newest_articles),
    'recent_rinks', (SELECT j FROM recent_rinks),
    'recent_teams', (SELECT j FROM recent_teams),
    'upcoming_games', (SELECT j FROM upcoming_games),
    'highlights', (SELECT j FROM highlights)
  );
$function$
