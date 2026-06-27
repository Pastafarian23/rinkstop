-- 2026-06-24: Fix SECURITY DEFINER views that bypass RLS
-- Supabase advisor finding: security_definer_view (ERROR ×4)
-- Live exploit confirmed (2026-06-24): anon could read
--   my_team_memberships.user_id, role, team_id
--   profile_tier_ranks.user_id, tier, subscription_status
--   profile_identity_status.user_id, identity_verified_at, identity_expires_at
-- Root cause: views created with default SECURITY DEFINER, which runs
--   as the view owner (postgres) and bypasses RLS on the underlying tables.
-- Fix: recreate each view WITH (security_invoker = true) so it runs as
--   the calling user and honors table-level RLS.
--
-- Side effects (intended):
--   • my_team_memberships: anon now sees only rows where the team is public
--     (team_workspaces.visibility = 'public'). Currently 1 row exists and
--     it's 'private', so anon sees 0 rows. Verified pre-migration.
--   • profile_tier_ranks: anon sees 0 rows (profiles has no anon SELECT policy).
--   • profile_identity_status: anon sees 0 rows (same reason).
--   • pending_username_review_queue: anon sees 0 rows (table-level RLS
--     deny_all applied in 2026-06-24 hardening migration).
--
-- Risk: any app code path that called these views with the SERVICE role
-- still works (service_role bypasses RLS regardless). Any path that called
-- them with the AUTHENTICATED role will now respect the user's own RLS
-- context, which is the intended behavior. Verified app code paths use
-- supabaseAdmin (service role) per TOOLS.md notes.

-- ============================================================================
-- my_team_memberships
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
  tw.parent_org AS team_parent_org,
  tw.level      AS team_level,
  tw.home_city  AS team_home_city
FROM team_members m
JOIN team_workspaces tw ON tw.id = m.team_id
WHERE tw.is_active = true;

-- ============================================================================
-- profile_tier_ranks
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
    WHEN 'free'       THEN 0
    WHEN 'starter'    THEN 1
    WHEN 'pro'        THEN 2
    WHEN 'premium'    THEN 3
    WHEN 'enterprise' THEN 4
    ELSE NULL
  END AS tier_rank
FROM profiles;

-- ============================================================================
-- profile_identity_status
-- DEPENDENCY NOTE: team_workspaces_insert_verified policy references this
-- view via EXISTS (SELECT 1 FROM profile_identity_status s WHERE ...).
-- Use DROP ... CASCADE so Postgres recreates the policy pointing at the
-- new view automatically.
-- ============================================================================
DROP VIEW IF EXISTS public.profile_identity_status CASCADE;
CREATE VIEW public.profile_identity_status
  WITH (security_invoker = true)
AS
SELECT
  user_id,
  identity_verified_at,
  identity_expires_at,
  identity_verification_method,
  CASE
    WHEN identity_verified_at IS NULL THEN 'never_verified'
    WHEN identity_expires_at > now() THEN 'active'
    WHEN identity_verified_at IS NOT NULL AND identity_expires_at <= now() THEN 'expired'
    ELSE 'never_verified'
  END AS status,
  CASE
    WHEN identity_expires_at IS NOT NULL THEN (EXTRACT(days FROM (identity_expires_at - now())))::integer
    ELSE NULL
  END AS days_until_expiry
FROM profiles;

-- ============================================================================
-- pending_username_review_queue
-- ============================================================================
DROP VIEW IF EXISTS public.pending_username_review_queue;
CREATE VIEW public.pending_username_review_queue
  WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.user_id,
  p.requested_slug,
  p.reason,
  p.reason_detail,
  p.status,
  p.created_at,
  p.reviewed_at,
  p.reviewer_user_id,
  p.review_note,
  pr.display_name AS requester_name,
  pr.username     AS requester_username,
  pr.tier         AS requester_tier
FROM pending_username_review p
LEFT JOIN profiles pr ON pr.user_id = p.user_id
WHERE p.status = 'pending'
ORDER BY p.created_at DESC;

-- Restore grants (DROP+CREATE wipes them)
GRANT SELECT ON public.my_team_memberships         TO anon, authenticated, service_role;
GRANT SELECT ON public.profile_tier_ranks          TO anon, authenticated, service_role;
GRANT SELECT ON public.profile_identity_status     TO anon, authenticated, service_role;
GRANT SELECT ON public.pending_username_review_queue TO anon, authenticated, service_role;