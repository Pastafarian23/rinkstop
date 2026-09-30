-- ============================================================
-- SECURITY FIX: Enable RLS + lock down email_subscribers table
--
-- Issue date: 2026-09-30 (Supabase advisor email — CRITICAL)
-- Ref: https://supabase.com/dashboard/project/yszheonqyyskkjoxoexk/database/linter
-- Linter finding: rls_disabled_in_public (ERROR level)
-- Email subject: 'These issues require your immediate attention —
--                  Table publicly accessible'
--
-- VERIFIED LIVE 2026-09-30 00:36 CDT before this migration:
--   curl POST /rest/v1/email_subscribers {email:'attacker@evil.com'} with anon key
--     → HTTP 201 (INSERT SUCCESS — anyone with anon key can add subscribers)
--   curl PATCH /rest/v1/email_subscribers?id=eq.47d8b438...  {source:'hacked'}
--     → HTTP 204, source column changed to 'hacked' (UPDATE SUCCESS — anyone can modify)
--   curl DELETE /rest/v1/email_subscribers?id=eq.47d8b438... with anon key
--     → HTTP 204 (returns success but RLS USING clause silently blocks actual delete)
--
-- TABLE STATE BEFORE FIX:
--   - RLS NOT enabled (relrowsecurity = false)
--   - Grant-level permissions: anon + authenticated had INSERT/UPDATE/DELETE per default GRANT
--   - Existing explicit policy: "email_subscribers: no public delete"
--     → this policy is meaningless because RLS itself wasn't enabled
--
-- APP USAGE:
--   - No code in src/ or scripts/ references email_subscribers (verified 2026-09-30)
--   - Table appears to be orphaned/legacy. 2 rows in DB (1 legit test row from 2026-05-15).
--   - Active newsletter capture uses different table (newsletter_subscribers, which is RLS-secured).
--
-- FIX STRATEGY (per the 2026-09-23 migration pattern):
--   1. ENABLE ROW LEVEL SECURITY on the table
--   2. REVOKE all privileges from anon + authenticated at the GRANT level
--      (RLS only blocks ROW visibility; without REVOKE, anon still has INSERT/UPDATE/DELETE
--       privileges that the GRANT checker enforces before RLS even runs)
--   3. GRANT ALL to service_role (operational scripts still work)
--   4. Drop the existing dangling "no public delete" policy (it was a no-op without RLS)
--   5. Add explicit FOR ALL USING (false) policy on public role for unambiguous deny
--
-- POST-FIX VERIFICATION (to run after migration):
--   anon INSERT  → expect HTTP 401 'new row violates row-level security policy'
--   anon UPDATE  → expect HTTP 401 (no UPDATE policy exists)
--   anon DELETE  → expect HTTP 401 (FOR ALL USING false)
--   anon SELECT  → expect HTTP 401 (no SELECT policy exists)
--   service_role → all four operations succeed
--
-- ============================================================

BEGIN;

-- 1. Enable RLS (the actual fix the Supabase linter wants)
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_subscribers FORCE ROW LEVEL SECURITY;

-- 2. Revoke default privileges from anon + authenticated
--    Without this, the GRANT level lets anon INSERT/UPDATE/DELETE before RLS even runs.
REVOKE ALL ON public.email_subscribers FROM anon;
REVOKE ALL ON public.email_subscribers FROM authenticated;
REVOKE ALL ON public.email_subscribers FROM PUBLIC;

-- 3. Grant full access back to service_role (operational scripts use this key)
GRANT ALL ON public.email_subscribers TO service_role;

-- 4. Drop the dangling "no public delete" policy — it was a no-op since RLS wasn't enabled.
--    Re-create it under RLS-active so it's actually enforced.
DROP POLICY IF EXISTS "email_subscribers: no public delete" ON public.email_subscribers;

-- 5. Single FOR ALL policy using (false) — denies all ops to anon + authenticated.
--    service_role bypasses RLS entirely so it can still read/write.
CREATE POLICY "email_subscribers: deny all to public"
  ON public.email_subscribers
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

COMMIT;
