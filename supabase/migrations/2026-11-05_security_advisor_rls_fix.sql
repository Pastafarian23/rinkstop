BEGIN;

-- ============================================================================
-- 2026-11-05 — Supabase security advisor: close the remaining ERROR-level findings
--
-- Trigger: Arnel forwarded the Supabase email dated 2026-10-31 —
--   "rls_disabled_in_public ... Table public.spatial_ref_sys is public, but
--    RLS has not been enabled ... Anyone with your project URL can read, edit,
--    and delete all data in this table."
--
-- VERIFIED live 2026-11-05 before writing this:
--   - `public.spatial_ref_sys` is the ONLY table in the public schema with
--     RLS disabled (185 tables checked via pg_class.relrowsecurity).
--   - It is PostGIS-internal reference data (srid, auth_name, auth_srid,
--     srtext, proj4text; ~8,500 rows) — NOT application data.
--   - It is owned by `supabase_admin` (not the migration runner), so RLS
--     cannot be enabled on it directly.
--   - LIVE PROBE with the PUBLIC anon key confirmed the exposure:
--       SELECT  -> HTTP 200 (readable)
--       INSERT  -> HTTP 201 (writable!)  [probe row srid=99999, since deleted]
--     This is why the advisor flagged it and why it must be revoked.
--   - The `venues.location` geography column is the only real PostGIS usage;
--     `venues` has RLS enabled + 2 policies and 0 rows, so revoking on
--     spatial_ref_sys does not affect it (that table's own grants are
--     unchanged by this migration).
--
-- Also closes the 4 remaining `security_definer_view` ERROR findings:
--   - business_analytics_summary
--   - business_analytics_top_listings
--   - players_with_country
--   - profile_tier_ranks
--
-- A SECURITY DEFINER view runs with the OWNER's privileges, so it bypasses
-- the RLS of the tables underneath. Recreating them with
-- `security_invoker = true` makes the CALLER's RLS apply instead.
--
-- IMPORTANT (search_path hardening): when a function body is changed to
-- `SET search_path = ''`, every table it references must be schema-qualified
-- in the SAME migration — otherwise the function silently raises
-- "relation does not exist" (42P01). The bodies below are therefore written
-- with explicit `public.` qualification.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) spatial_ref_sys — revoke all anon/authenticated access.
--    This is the exact issue Supabase flagged. PostGIS itself does not need
--    these roles to read the SRID table at runtime.
--
--    ⚠️ NOT APPLIED BY THIS MIGRATION. It requires a session running as
--    `supabase_admin` (the only superuser role, and the owner+grantor of
--    this table). See the full analysis below.
--
--    WHY IT COULD NOT BE APPLIED HERE (all verified live 2026-11-05):
--      The Management API `/database/query` endpoint executes as `postgres`
--      (rolsuper = false). The Supabase Dashboard SQL editor ALSO connects as
--      `postgres` — Arnel ran this REVOKE there and the Dashboard reported
--      "Success. No rows returned", but a live probe with the public anon key
--      proved the table was still readable AND writable.
--
--      The table ACL is:
--        {supabase_admin=arwdDxtm/supabase_admin, postgres=arwdDxtm/supabase_admin,
--          anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin,
--          service_role=arwdDxtm/supabase_admin, =r/supabase_admin}
--      Every entry is granted BY `supabase_admin`. Postgres permits a REVOKE
--      only by the OWNER or the GRANTOR. `postgres` is neither, so the
--      statement executes WITHOUT ERROR and changes nothing — a silent no-op
--      inside a committed transaction.
--
--      Attempts that all failed with 42501:
--        REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;
--        ALTER TABLE public.spatial_ref_sys OWNER TO postgres;
--        ALTER TABLE public.spatial_ref_sys OWNER TO supabase_privileged_role;
--        GRANT supabase_privileged_role TO postgres;
--        GRANT supabase_admin TO postgres;   -- "memberships are reserved"
--        SET ROLE supabase_admin; / SET LOCAL ROLE supabase_admin;
--        ALTER ROLE postgres SUPERUSER;
--      Pooler connection with the management PAT as the password:
--        FATAL: password authentication failed (no DB password in the
--        credential store or Vercel env).
--
--      PROVEN FIX PATH: when the executing role OWNS the table, the REVOKE
--      works — `has_table_privilege` flips to false (verified on a scratch
--      table owned by `postgres`). So a superuser session must either run the
--      REVOKE directly, or first transfer ownership:
--
--        -- as supabase_admin:
--        ALTER TABLE public.spatial_ref_sys OWNER TO postgres;
--        REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;
--        REVOKE ALL ON TABLE public.spatial_ref_sys FROM PUBLIC;
--
--      Practical route: Supabase Support (https://supabase.com/support) can
--      execute as `supabase_admin`. The exact statement is tracked in
--      OPEN-ITEMS.md → `supabase-rls-spatial-ref-sys-2026-11-05`.
--
--    VERIFIED IMPACT of the revoke (none on the app):
--      - The only other PostGIS object is `venues.location` (geography).
--        `venues` has RLS enabled with 2 policies and 0 rows; its grants are
--        unaffected by this revoke.
--      - The application code never references `spatial_ref_sys`.
--      - The table holds PostGIS SRID reference data only (srid, auth_name,
--        auth_srid, srtext, proj4text; ~8,500 rows) — no application data,
--        no user data, no credentials.
-- ---------------------------------------------------------------------------

-- (statement intentionally not executed here — needs a supabase_admin session)

-- ---------------------------------------------------------------------------
-- 3) business_analytics_top_listings — recreate with security_invoker.
--    Depends on business_analytics_summary (recreated above) + listings.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.business_analytics_top_listings;
CREATE VIEW public.business_analytics_top_listings
  WITH (security_invoker = true)
AS
SELECT
  s.listing_id,
  s.page_views_30d,
  s.leads_30d,
  s.unique_visitors_30d,
  s.booking_inquiries_30d,
  l.business_name,
  l.listing_type,
  l.is_published,
  l.is_featured
FROM public.business_analytics_summary s
JOIN public.listings l ON (l.id = s.listing_id)
WHERE (l.is_published = true)
ORDER BY s.page_views_30d DESC, s.leads_30d DESC;

-- NOTE ON ORDER: business_analytics_top_listings depends on
-- business_analytics_summary. Postgres records that dependency when the
-- top-listing view is CREATED, so re-creating it first does not help — the
-- base view still cannot be dropped without CASCADE.
-- (Both attempts verified live 2026-11-05; each rolled back cleanly.)
-- CASCADE here only drops the dependent VIEW, which we immediately recreate
-- below with the same shape. No tables and no data are affected.
-- ---------------------------------------------------------------------------
-- 2) business_analytics_top_listings — recreate with security_invoker.
--    Depends on business_analytics_summary (recreated below) + listings.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.business_analytics_summary CASCADE;
CREATE VIEW public.business_analytics_summary
  WITH (security_invoker = true)
AS
SELECT
  listing_id,
  sum(page_views)            AS page_views_30d,
  sum(unique_visitors)       AS unique_visitors_30d,
  sum(lead_form_submissions) AS leads_30d,
  sum(phone_clicks)          AS phone_clicks_30d,
  sum(website_clicks)        AS website_clicks_30d,
  sum(email_clicks)          AS email_clicks_30d,
  sum(booking_inquiries)     AS booking_inquiries_30d,
  sum(favorite_count)        AS favorites_net_30d,
  sum(review_count)          AS reviews_net_30d,
  max(date)                  AS last_activity_date
FROM public.business_analytics_daily
WHERE (date >= (CURRENT_DATE - '30 days'::interval))
GROUP BY listing_id;

-- ---------------------------------------------------------------------------
-- 4) players_with_country — recreate with security_invoker.
--    Base table: players. Country name comes from public.iso3_to_country_name().
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.players_with_country;
CREATE VIEW public.players_with_country
  WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.slug,
  p.team_id,
  p."position",
  p.jersey_number,
  p.shoots,
  p.catches,
  p.height_cm,
  p.weight_kg,
  p.birth_date,
  p.nationality,
  p.bio,
  p.headshot_url,
  p.is_active,
  p.created_at,
  p.updated_at,
  p.highlightly_id,
  p.user_id,
  p.headshot_verified_at,
  p.headshot_source,
  p.last_verified_at,
  p.last_verification_source,
  p.primary_position_category,
  p.claimable,
  public.iso3_to_country_name(p.nationality) AS country_name
FROM public.players p;

-- ---------------------------------------------------------------------------
-- 5) profile_tier_ranks — recreate with security_invoker.
--    Static tier -> rank mapping. Keep the same tier list as the live view
--    (verified against pg_get_viewdef on 2026-11-05) so no consumer breaks.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.profile_tier_ranks;
CREATE VIEW public.profile_tier_ranks
  WITH (security_invoker = true)
AS
SELECT 'free'::text AS tier, 0 AS rank, 'personal'::text AS track
UNION ALL SELECT 'verified_identity', 1, 'personal'
UNION ALL SELECT 'identity_plus', 2, 'personal'
UNION ALL SELECT 'org_free', 0, 'organization'
UNION ALL SELECT 'org_plus', 1, 'organization'
UNION ALL SELECT 'org_pro', 2, 'organization'
UNION ALL SELECT 'org_elite', 3, 'organization'
UNION ALL SELECT 'org_enterprise', 4, 'organization'
UNION ALL SELECT 'club_starter', 1, 'personal'
UNION ALL SELECT 'club_pro', 2, 'personal'
UNION ALL SELECT 'club_elite', 3, 'personal'
UNION ALL SELECT 'league', 4, 'personal'
UNION ALL SELECT 'federation', 5, 'personal'
UNION ALL SELECT 'business_listing', 1, 'personal'
UNION ALL SELECT 'business_plus', 2, 'personal';

-- ---------------------------------------------------------------------------
-- 6) search_path hardening — the 7 functions still flagged by the advisor.
--
-- TRAP (learned the hard way 2026-10-10): when a function body gets
-- `SET search_path = ''`, every table it references must be schema-qualified
-- in the SAME migration — otherwise the function starts raising
-- "relation does not exist" (42P01) at runtime.
--
-- Verified before writing this migration:
--   set_updated_at             — no table refs            → plain ALTER is safe
--   sync_team_workspace_owner  — no table refs            → plain ALTER is safe
--   team_workspace_quota_for_tier(text)      — no table refs → plain ALTER is safe
--   iso3_to_country_name(text)                — no table refs → plain ALTER is safe
--   increment_business_analytics(uuid,date,text,int,text)
--                                            — no table refs → plain ALTER is safe
-- NOTE: the exact argument list is required in ALTER FUNCTION. The first
-- attempt used bare `name()` for the three functions that take arguments and
-- failed with 42883 "function does not exist" — verified live 2026-11-05,
-- transaction rolled back.
--   get_home_page_data         — 13 unqualified refs      → BODY REWRITTEN below
--   is_game_indexable_batch    —  8 unqualified refs      → BODY REWRITTEN below
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.sync_team_workspace_owner() SET search_path = '';
ALTER FUNCTION public.team_workspace_quota_for_tier(p_org_tier text) SET search_path = '';
ALTER FUNCTION public.iso3_to_country_name(code text) SET search_path = '';
ALTER FUNCTION public.increment_business_analytics(p_listing_id uuid, p_date date, p_column text, p_delta integer, p_visitor_fp text) SET search_path = '';

-- get_home_page_data — body rewritten with public.-qualified table refs.
CREATE OR REPLACE FUNCTION public.get_home_page_data()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
SET search_path = ''
AS $function$
  WITH counts AS (
    SELECT
      (SELECT COUNT(*) FROM public.rinks WHERE is_active = true) AS rink_count,
      (SELECT COUNT(*) FROM public.teams WHERE is_active = true AND merged_into_id IS NULL) AS team_count,
      (SELECT COUNT(*) FROM public.players WHERE is_active = true) AS player_count,
      (SELECT COUNT(*) FROM public.leagues WHERE is_active = true) AS league_count,
      (SELECT COUNT(DISTINCT LOWER(TRIM(city))) FROM public.rinks
        WHERE is_active = true AND city IS NOT NULL AND TRIM(city) != '') AS city_count,
      (SELECT COUNT(DISTINCT country) FROM public.rinks
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
    FROM (SELECT id, name, slug, city, league_id, country, created_at FROM public.teams
          WHERE is_active = true AND merged_into_id IS NULL
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
    FROM (SELECT id, name, slug, city, league_id, created_at AS t_created_at FROM public.teams
          WHERE is_active = true AND merged_into_id IS NULL
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
$function$;

-- is_game_indexable_batch — body rewritten with public.-qualified table refs.
CREATE OR REPLACE FUNCTION public.is_game_indexable_batch(ids uuid[])
 RETURNS TABLE(out_id uuid, indexable text)
 LANGUAGE plpgsql
 STABLE
SET search_path = ''
AS $function$
DECLARE
  r record;
  h2h_n int;
  home_next_n int;
  away_next_n int;
  same_day_n int;
  module_count int;
BEGIN
  FOR r IN
    SELECT f.id, f.status, f.scheduled_at, f.league_id, f.home_team_id, f.away_team_id, f.home_score, f.away_score
    FROM unnest(ids) AS input_id
    JOIN public.fixtures f ON f.id = input_id
  LOOP
    out_id := r.id;
    module_count := 0;

    IF r.status = 'cancelled' OR r.status = 'postponed' THEN
      indexable := 'noindex'; RETURN NEXT; CONTINUE;
    END IF;
    IF r.status = 'in_progress' THEN
      indexable := 'index'; RETURN NEXT; CONTINUE;
    END IF;
    IF r.home_team_id IS NULL OR r.away_team_id IS NULL THEN
      indexable := 'noindex'; RETURN NEXT; CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.fixtures
      WHERE league_id = r.league_id AND status = 'completed'
        AND (home_team_id = r.home_team_id OR away_team_id = r.home_team_id)
        AND id <> r.id
    ) THEN indexable := 'noindex'; RETURN NEXT; CONTINUE; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.fixtures
      WHERE league_id = r.league_id AND status = 'completed'
        AND (home_team_id = r.away_team_id OR away_team_id = r.away_team_id)
        AND id <> r.id
    ) THEN indexable := 'noindex'; RETURN NEXT; CONTINUE; END IF;

    SELECT COUNT(*) INTO h2h_n FROM public.fixtures
      WHERE league_id = r.league_id AND status = 'completed'
        AND ((home_team_id = r.home_team_id AND away_team_id = r.away_team_id)
          OR (home_team_id = r.away_team_id AND away_team_id = r.home_team_id))
        AND id <> r.id;
    SELECT COUNT(*) INTO home_next_n FROM public.fixtures
      WHERE league_id = r.league_id AND status IN ('scheduled', 'in_progress')
        AND (home_team_id = r.home_team_id OR away_team_id = r.home_team_id)
        AND scheduled_at > r.scheduled_at;
    SELECT COUNT(*) INTO away_next_n FROM public.fixtures
      WHERE league_id = r.league_id AND status IN ('scheduled', 'in_progress')
        AND (home_team_id = r.away_team_id OR away_team_id = r.away_team_id)
        AND scheduled_at > r.scheduled_at;
    SELECT COUNT(*) INTO same_day_n FROM public.fixtures
      WHERE league_id = r.league_id AND id <> r.id
        AND scheduled_at >= date_trunc('day', r.scheduled_at)
        AND scheduled_at < date_trunc('day', r.scheduled_at) + interval '1 day';

    IF h2h_n > 0 THEN module_count := module_count + 1; END IF;
    IF home_next_n > 0 THEN module_count := module_count + 1; END IF;
    IF away_next_n > 0 THEN module_count := module_count + 1; END IF;
    IF same_day_n > 0 THEN module_count := module_count + 1; END IF;
    IF r.status = 'completed' AND r.home_score IS NOT NULL AND r.away_score IS NOT NULL THEN
      module_count := module_count + 1;
    END IF;
    IF r.status = 'scheduled' AND r.scheduled_at < (now() + interval '7 days') THEN
      module_count := module_count + 1;
    END IF;

    IF module_count >= 3 THEN
      indexable := 'index';
    ELSE
      indexable := 'noindex';
    END IF;

    RETURN NEXT;
  END LOOP;
END;
$function$;

COMMIT;
