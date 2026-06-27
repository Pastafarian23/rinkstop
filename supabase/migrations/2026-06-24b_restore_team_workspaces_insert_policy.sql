-- 2026-06-24b: Restore team_workspaces_insert_verified policy
-- Reason: The 2026-06-24_fix_security_definer_views.sql migration used
--   DROP VIEW ... CASCADE on profile_identity_status, which also dropped
--   this policy (Postgres dependency tracking). The view is now recreated
--   with security_invoker = true, so the policy can be re-attached.
-- Logic preserved verbatim from the original (pre-cascade) definition:
--   user can INSERT a team_workspace only if:
--     - the row's created_by = their own auth.uid()
--     - AND they have an 'active' identity verification status

CREATE POLICY "team_workspaces_insert_verified" ON public.team_workspaces
  FOR INSERT TO public
  WITH CHECK (
    (created_by = (auth.uid())::text)
    AND (EXISTS (
      SELECT 1 FROM public.profile_identity_status s
      WHERE s.user_id = (auth.uid())::text AND s.status = 'active'
    ))
  );