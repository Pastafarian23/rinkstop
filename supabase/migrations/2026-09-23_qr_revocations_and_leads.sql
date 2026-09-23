-- ============================================================
-- SECURITY: Fix qr_revocations (no policies) + leads (misleading grants)
--
-- Date: 2026-09-23
-- Per comprehensive security audit.
--
-- Issues:
--   1. qr_revocations has RLS enabled but ZERO policies
--      Supabase advisor flag: 'rls_enabled_no_policy' (INFO level)
--      Behavior: RLS denies everything by default → safe but undocumented
--      Fix: Add explicit service_role-only policy
--
--   2. leads has anon/authenticated grants but only service_role policies
--      Issue: Misleading GRANT state. Anon is blocked by policy absence
--      but the GRANT creates confusion and trip-up risk.
--      Fix: REVOKE anon grants + add explicit service_role policy
--
-- ============================================================

BEGIN;

-- ============================================================
-- 1. qr_revocations — add explicit service_role policy
-- ============================================================

CREATE POLICY "qr_revocations: service_role full access"
  ON public.qr_revocations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.qr_revocations FROM anon, authenticated;
GRANT ALL ON public.qr_revocations TO service_role;

COMMENT ON TABLE public.qr_revocations IS
  'Records QR identifier revocations on passports. service_role only (writes happen via the SECURITY DEFINER regenerate_passport_qr_identifier function which has its own auth checks). Read-only from any non-service_role role.';

-- ============================================================
-- 2. leads — REVOKE anon + add explicit service_role policy
-- ============================================================

REVOKE ALL ON public.leads FROM anon;
GRANT ALL ON public.leads TO service_role;

-- Verify a service_role policy exists; if not, add one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'leads' AND schemaname = 'public'
      AND roles::text LIKE '%service_role%'
  ) THEN
    EXECUTE 'CREATE POLICY "leads: service_role full access"
      ON public.leads FOR ALL TO service_role
      USING (true) WITH CHECK (true)';
  END IF;
END $$;

COMMENT ON TABLE public.leads IS
  'Sales/marketing leads captured from landing pages. service_role only. Anon users cannot read or write.';

COMMIT;
