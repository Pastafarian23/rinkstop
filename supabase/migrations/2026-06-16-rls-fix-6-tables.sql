-- 2026-06-16: Enable RLS on 6 tables that are missing it
-- Supabase advisor finding: rls_disabled_in_public (ERROR level)
-- Verified via api.supabase.com/v1/projects/.../advisors/security on 2026-06-16
-- Verified via direct anon-key exploit (DELETE from reserved_slugs and PATCH nhl_players both accepted)
-- All app code uses service_role, so adding RLS does not break the app
-- 
-- Scope: 6 tables
--   1. highlight_backups (37,498 rows) - read backup of highlight data
--   2. nhl_players (4,686 rows) - NHL player records
--   3. fixtures_audit (0 rows) - empty log table
--   4. reserved_slugs (46 rows) - reserved usernames
--   5. username_changes (0 rows) - empty
--   6. username_holds (0 rows) - empty
--
-- Strategy: ENABLE RLS + DENY all access to anon and authenticated
-- Service role bypasses RLS automatically, so all current app code keeps working

-- Step 1: Enable RLS
ALTER TABLE public.highlight_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nhl_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixtures_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserved_slugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.username_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.username_holds ENABLE ROW LEVEL SECURITY;

-- Step 2: Add deny-all policies for anon and authenticated roles
-- (Service role bypasses RLS, so it does not need policies)

-- highlight_backups
CREATE POLICY "deny_anon_highlight_backups" ON public.highlight_backups
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_highlight_backups" ON public.highlight_backups
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- nhl_players
CREATE POLICY "deny_anon_nhl_players" ON public.nhl_players
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_nhl_players" ON public.nhl_players
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- fixtures_audit
CREATE POLICY "deny_anon_fixtures_audit" ON public.fixtures_audit
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_fixtures_audit" ON public.fixtures_audit
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- reserved_slugs
CREATE POLICY "deny_anon_reserved_slugs" ON public.reserved_slugs
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_reserved_slugs" ON public.reserved_slugs
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- username_changes
CREATE POLICY "deny_anon_username_changes" ON public.username_changes
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_username_changes" ON public.username_changes
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- username_holds
CREATE POLICY "deny_anon_username_holds" ON public.username_holds
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_username_holds" ON public.username_holds
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
