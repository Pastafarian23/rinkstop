-- 2026-11-06: Fix team count canonical source (Arnel data-integrity audit).
--
-- The `get_directory_stats` RPC counted the legacy `teams` table
-- (2,613 active, non-merged). The public directory, the /api/counts endpoint,
-- and the $499 dataset export all serve `team_workspaces` (2,633 active +
-- public). Result: marketing pages advertised 2,613 teams while a buyer
-- downloading teams.csv got 2,640 rows — and 16 of the advertised teams
-- 404 on the site.
--
-- Fix: count `team_workspaces` (active + public) so every number on every
-- page equals the number of teams a visitor can actually browse and a
-- buyer can actually download.
--
-- Also switched newest_teams / recent_teams to team_workspaces so the
-- homepage "recent teams" widget links to pages that actually resolve.
--
-- Verification (live, before/after):
--   before: team_count = 2,613 (teams table)
--   after:  team_count = 2,633 (team_workspaces active + public)
--   matches /api/counts teams = 2,633 and the public /directory/teams list.

CREATE OR REPLACE FUNCTION public.get_directory_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'rink_count',     (SELECT COUNT(*) FROM public.rinks WHERE is_active = true),
    'team_count',     (SELECT COUNT(*) FROM public.team_workspaces WHERE is_active = true AND visibility = 'public'),
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
        SELECT id, name, slug, home_city, league_id, country_code, created_at
        FROM public.team_workspaces WHERE is_active = true AND visibility = 'public'
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
          t.id, t.name, t.slug, t.home_city, t.league_id, l.name AS league_name
        FROM public.team_workspaces t
        LEFT JOIN public.leagues l ON l.id = t.league_id
        WHERE t.is_active = true AND t.visibility = 'public'
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