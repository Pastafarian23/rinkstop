-- 2026-10-10: Fix get_directory_stats() broken by security advisor migration
--
-- The migration `2026-10-10_security_advisor_fix.sql` set
--   ALTER FUNCTION public.get_directory_stats() SET search_path = '';
-- to satisfy the Supabase security advisor's "mutable search_path" warning.
-- But the function body uses unqualified table references (rinks, teams,
-- players, leagues, posts, fixtures), which fail with 42P01 "relation
-- does not exist" when search_path is empty.
--
-- Fix: rewrite the function body with `public.` qualified table references.
-- The function signature, return type, and behavior are unchanged.
--
-- Verification:
--   before: GET /rpc/get_directory_stats -> 404 {"code":"42P01","message":"relation \"rinks\" does not exist"}
--   after:  GET /rpc/get_directory_stats -> 200, 1859 rinks / 2607 teams / 6352 players / 293 leagues / 85 countries
--
-- This is a re-application of the original function defined in
-- `2026-06-18_get_directory_stats.sql` and amended by
-- `2026-08-28_get_directory_stats_add_activity.sql`, with `public.` prefixes
-- on every table reference so it works under empty search_path.

CREATE OR REPLACE FUNCTION public.get_directory_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'rink_count',     (SELECT COUNT(*) FROM public.rinks WHERE is_active = true),
    'team_count',     (SELECT COUNT(*) FROM public.teams WHERE is_active = true AND merged_into_id IS NULL),
    'player_count',   (SELECT COUNT(*) FROM public.players WHERE is_active = true),
    'league_count',   (SELECT COUNT(*) FROM public.leagues WHERE is_active = true),
    'city_count',     (SELECT COUNT(DISTINCT city) FROM public.teams WHERE is_active = true AND city IS NOT NULL),
    'country_count',  (SELECT COUNT(DISTINCT country) FROM public.teams WHERE is_active = true AND country IS NOT NULL),
    'newest_rinks', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT id, name, slug, city, country, created_at
        FROM public.rinks WHERE is_active = true
        ORDER BY created_at DESC LIMIT 3
      ) t
    ),
    'newest_teams', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT id, name, slug, city, league_id, country, created_at
        FROM public.teams WHERE is_active = true AND merged_into_id IS NULL
        ORDER BY created_at DESC LIMIT 3
      ) t
    ),
    'newest_players', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT id, first_name, last_name, slug, position, nationality, created_at
        FROM public.players WHERE is_active = true
        ORDER BY created_at DESC LIMIT 3
      ) t
    ),
    'newest_articles', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT id, slug, title, category, published_at, created_at
        FROM public.posts WHERE status = 'published'
        ORDER BY COALESCE(published_at, created_at) DESC LIMIT 3
      ) t
    ),
    'recent_rinks', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT id, name, slug, city, country
        FROM public.rinks WHERE is_active = true
        ORDER BY created_at DESC LIMIT 3
      ) t
    ),
    'recent_teams', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT
          t.id, t.name, t.slug, t.city, t.league_id, l.name AS league_name
        FROM public.teams t
        LEFT JOIN public.leagues l ON l.id = t.league_id
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
        FROM public.fixtures f
        LEFT JOIN public.teams ht ON ht.id = f.home_team_id
        LEFT JOIN public.teams at ON at.id = f.away_team_id
        LEFT JOIN public.rinks r ON r.id = f.venue_id
        WHERE f.scheduled_at >= CURRENT_DATE
          AND f.status IN ('scheduled', 'pending', 'live')
          AND f.home_score IS NULL
          AND f.away_score IS NULL
        ORDER BY f.scheduled_at ASC LIMIT 3
      ) g
    )
  );
$function$;