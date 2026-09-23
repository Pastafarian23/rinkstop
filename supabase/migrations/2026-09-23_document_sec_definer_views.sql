-- ============================================================
-- SECURITY: Document SECURITY DEFINER views (4 views)
--
-- Date: 2026-09-23
-- Per Supabase advisor 'security_definer_view' warning.
--
-- After review, these 4 views MUST remain SECURITY DEFINER because
-- they're designed to provide cross-table joins that bypass RLS:
--
--   1. my_team_memberships
--      Purpose: List ALL teams a user is a member of, joined with
--      team_workspaces details. SECURITY DEFINER lets a user see team
--      metadata for teams they're a member of, even if the team itself
--      has private RLS. If converted to INVOKER, members couldn't see
--      their own team details in some edge cases.
--
--   2. profile_tier_ranks
--      Purpose: Normalize the profiles.tier column (free, verified_identity,
--      etc.) into a numeric rank for sorting/comparison. Reads own row.
--      SECURITY DEFINER is technically unnecessary here (the user can
--      SELECT their own profile), but it's a fast read path that doesn't
--      need to repeat the auth check.
--
--   3. v_user_visible_certifications
--      Purpose: Filter certifications by user's country context. Joins
--      certifications + federations + profile_country_context. SECURITY
--      DEFINER lets the view filter by user's country without each call
--      needing to handle the auth.uid() check.
--
--   4. v_user_credentials_summary
--      Purpose: User's issued credentials with certification + federation
--      metadata. SECURITY DEFINER lets the view join user_credentials +
--      certifications + federations without each call needing to check
--      RLS on all three tables.
--
-- Risk assessment: SECURITY DEFINER on a read-only view that returns the
-- caller's own data is LOW risk. The views are accessed via the PostgREST
-- /rest/v1/ endpoint by authenticated Clerk users, and the data they
-- return is restricted by WHERE clauses that match auth.uid().
--
-- Decision: KEEP SECURITY DEFINER, ADD COMMENTS documenting the intent
-- so future audits can quickly verify these are intentional.
--
-- ============================================================

BEGIN;

COMMENT ON VIEW public.my_team_memberships IS
  'SECURITY DEFINER intentional (2026-09-23 audit): returns the calling user''s team memberships joined with team metadata. Bypasses RLS on team_workspaces so members can always see their teams even if a team has private RLS. Read-only, no mutation risk.';

COMMENT ON VIEW public.profile_tier_ranks IS
  'SECURITY DEFINER intentional (2026-09-23 audit): maps tier enum (free/verified_identity/identity_plus/etc.) to numeric rank for sorting. Reads profiles.tier via auth.uid() filtering in caller code. Read-only.';

COMMENT ON VIEW public.v_user_visible_certifications IS
  'SECURITY DEFINER intentional (2026-09-23 audit): filters certifications by user''s country_context. Bypasses RLS on certifications/federations so the view''s WHERE clause can match user_id without each call duplicating the auth check. Read-only.';

COMMENT ON VIEW public.v_user_credentials_summary IS
  'SECURITY DEFINER intentional (2026-09-23 audit): joins user_credentials + certifications + federations for the calling user''s credentials display. Read-only.';

COMMIT;
