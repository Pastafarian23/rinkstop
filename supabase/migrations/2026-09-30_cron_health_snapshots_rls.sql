-- ============================================================
-- SECURITY FIX: Enable RLS + lock down cron_health_snapshots table
--
-- Issue date: 2026-09-30 (audit after email_subscribers fix)
-- Discovered via anon INSERT test: 1 table besides email_subscribers
-- was reachable for write with anon key.
--
-- VERIFIED LIVE 2026-09-30 00:55 CDT before this migration:
--   curl POST /rest/v1/cron_health_snapshots {} with anon key
--     → HTTP 400 'null value in column "captured_at"' — meaning RLS allowed
--       the INSERT and only the NOT NULL constraint blocked it. Anyone with
--       the anon key could insert cron health rows (denial of service /
--       admin confusion attack vector).
--
-- TABLE STATE BEFORE FIX:
--   - RLS NOT enabled
--   - 207 rows of legitimate data (cron health snapshots from 2026-06 onward)
--   - Used by: scripts/collect-cron-health.js (service_role) + admin route
--     src/app/api/admin/cron-health/route.ts
--
-- APP USAGE:
--   - Writes via service_role only (scripts/collect-cron-health.js)
--   - Reads via service_role only (admin route uses service_role key)
--   - No public read or write needed
--
-- FIX STRATEGY: same as email_subscribers migration (RLS + REVOKE + service_role grant)
-- ============================================================

BEGIN;

ALTER TABLE public.cron_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_health_snapshots FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.cron_health_snapshots FROM anon;
REVOKE ALL ON public.cron_health_snapshots FROM authenticated;
REVOKE ALL ON public.cron_health_snapshots FROM PUBLIC;

GRANT ALL ON public.cron_health_snapshots TO service_role;

-- Drop any existing policies (none expected, defensive)
DROP POLICY IF EXISTS "cron_health_snapshots: deny all to public" ON public.cron_health_snapshots;

CREATE POLICY "cron_health_snapshots: deny all to public"
  ON public.cron_health_snapshots
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

COMMIT;
