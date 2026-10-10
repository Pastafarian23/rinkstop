-- 2026-10-10: Supabase security advisor fix (linter findings 2026-10-10)
--
-- Context: Ran `GET /v1/projects/{ref}/advisors/security` and got 5 errors + 54 warnings.
-- This migration fixes the 5 errors and the 5 search_path warnings. Performance
-- lints (978 of them) are out of scope and not addressed here.
--
-- The 2026-06-24 migration `2026-06-24_fix_security_definer_views.sql` had the
-- same intent in source but the schema has changed since then (new tier names,
-- new team_workspaces columns, user_certifications -> user_credentials).
-- Re-applying here with the CURRENT schema, not the 2026-06-24 snapshot.
--
-- Fixes:
--   ERROR 1:  spatial_ref_sys RLS — revoke from anon/authenticated (table is
--             PostGIS-internal and owned by `postgres` superuser; can't
--             enable RLS as the migration runner)
--   ERROR 2-5: 4 SECURITY DEFINER views recreated WITH (security_invoker = true)
--   WARN 1-5:  5 functions with mutable search_path — set SET search_path = ''
--   INFO 1-2:  b2b_prospects, conversion_daily_snapshots — add explicit
--              "deny all" policy for non-service roles

BEGIN;

-- ============================================================================
-- 1) spatial_ref_sys — PostGIS internal. Revoke from anon/authenticated.
-- ============================================================================
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;

-- ============================================================================
-- 2) my_team_memberships — recreate with current schema + security_invoker
-- ============================================================================
DROP VIEW IF EXISTS public.my_team_memberships;
CREATE VIEW public.my_team_memberships
  WITH (security_invoker = true)
AS
SELECT
  m.id          AS membership_id,
  m.user_id,
  m.role,
  m.jersey_number,
  m.joined_at,
  m.left_at,
  tw.id         AS team_id,
  tw.slug       AS team_slug,
  tw.name       AS team_name,
  tw.short_name AS team_short_name,
  tw.country_code AS team_country_code,
  tw.age_label  AS team_age_label,
  tw.age_min    AS team_age_min,
  tw.age_max    AS team_age_max,
  tw.federation_id,
  tw.organization_id,
  tw.league_id,
  tw.level      AS team_level,
  tw.home_city  AS team_home_city
FROM team_members m
JOIN team_workspaces tw ON tw.id = m.team_id
WHERE tw.is_active = true;

-- ============================================================================
-- 3) profile_tier_ranks — recreate with current schema + security_invoker
-- ============================================================================
DROP VIEW IF EXISTS public.profile_tier_ranks;
CREATE VIEW public.profile_tier_ranks
  WITH (security_invoker = true)
AS
SELECT
  user_id,
  tier,
  tier_expires_at,
  subscription_status,
  CASE tier
    WHEN 'free'              THEN 0
    WHEN 'verified_identity' THEN 1
    WHEN 'identity_plus'     THEN 2
    WHEN 'club_starter'      THEN 1
    WHEN 'club_pro'          THEN 2
    WHEN 'club_elite'        THEN 3
    WHEN 'league'            THEN 4
    WHEN 'federation'        THEN 5
    WHEN 'business_listing'  THEN 1
    WHEN 'business_plus'     THEN 2
    ELSE NULL
  END AS tier_rank
FROM profiles;

-- ============================================================================
-- 4) v_user_visible_certifications — recreate + security_invoker
-- ============================================================================
DROP VIEW IF EXISTS public.v_user_visible_certifications;
CREATE VIEW public.v_user_visible_certifications
  WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.slug,
  c.name,
  c.description,
  c.category,
  c.is_international,
  c.issuer_id,
  f.name AS issuer_name,
  f.slug AS issuer_slug,
  f.country_code AS issuer_country_code,
  f.kind AS issuer_kind,
  CASE
    WHEN c.is_international THEN true
    WHEN pcc.user_id IS NULL THEN true
    WHEN f.country_code = pcc.primary_country THEN true
    WHEN f.country_code = ANY(pcc.additional_countries) THEN true
    ELSE false
  END AS visible_to_user
FROM certifications c
JOIN federations f ON c.issuer_id = f.id
LEFT JOIN profile_country_context pcc ON true
WHERE c.is_active = true AND f.is_active = true;

GRANT SELECT ON public.v_user_visible_certifications TO authenticated, anon;

-- ============================================================================
-- 5) v_user_credentials_summary — recreate + security_invoker
-- ============================================================================
DROP VIEW IF EXISTS public.v_user_credentials_summary;
CREATE VIEW public.v_user_credentials_summary
  WITH (security_invoker = true)
AS
SELECT
  uc.id,
  uc.user_id,
  uc.status,
  uc.credential_number,
  uc.issued_at,
  uc.expires_at,
  uc.display_label,
  uc.registration_id,
  c.id AS certification_id,
  c.slug AS certification_slug,
  c.name AS certification_name,
  c.category,
  c.is_international,
  f.id AS issuer_id,
  f.slug AS issuer_slug,
  f.name AS issuer_name,
  f.country_code AS issuer_country_code,
  f.kind AS issuer_kind
FROM user_credentials uc
JOIN certifications c ON uc.certification_id = c.id
JOIN federations f ON uc.federation_id = f.id
WHERE c.is_active = true AND f.is_active = true;

-- ============================================================================
-- 6-10) Set search_path on the 5 functions flagged by the advisor.
-- ============================================================================

ALTER FUNCTION public.crockford_encode(bytea) SET search_path = '';
ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.set_b2b_prospects_updated_at() SET search_path = '';
ALTER FUNCTION public.clerk_user_id() SET search_path = '';
ALTER FUNCTION public.get_directory_stats() SET search_path = '';

-- ============================================================================
-- 11-12) Add explicit "deny all for non-service" policy to the 2 RLS-no-policy
--       tables. service_role bypasses RLS so admin APIs continue to work.
-- ============================================================================

-- b2b_prospects: admin-only via service_role
DROP POLICY IF EXISTS "b2b_prospects_deny_all" ON public.b2b_prospects;
CREATE POLICY "b2b_prospects_deny_all" ON public.b2b_prospects
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- conversion_daily_snapshots: cron-only via service_role
DROP POLICY IF EXISTS "conversion_daily_snapshots_deny_all" ON public.conversion_daily_snapshots;
CREATE POLICY "conversion_daily_snapshots_deny_all" ON public.conversion_daily_snapshots
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMIT;
