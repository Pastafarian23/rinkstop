-- ============================================================
-- SECURITY FIX (Batch 2): Lock down 4 more tables without RLS
--
-- Issue date: 2026-09-30 (follow-up to email_subscribers + cron_health fix)
-- Discovered via scripts/_live-rls-audit.cjs which sweeps ALL public tables.
--
-- VERIFIED VULNERABLE TABLES:
--
-- 1. email_captures (1 row)
--    - Used by src/components/EmailCaptureInline.tsx via POST /api/email-capture
--    - /api/email-capture uses supabaseAdmin (service role) for writes
--    - Reads via admin/intake/export route also service role
--    - → service_role only is correct; anon must be locked out
--
-- 2. playoff_updates (87 rows)
--    - Used by GET /api/nhl/playoffs/updates (anon-readable, intentional)
--    - POST was unauthenticated + anon key → CRITICAL content injection
--      (fixed by route change to return 410 Gone on POST)
--    - Writes should only come from service_role (admin script)
--    - RLS pattern: PUBLIC read-only access + service_role full
--
-- 3. profile_tier_ranks (19 rows, no app refs)
--    - Orphaned/legacy table. Lock down entirely.
--
-- 4. rink_reviews_legacy (0 rows, no app refs)
--    - Legacy table (renamed to rink_reviews). Lock down entirely.
--
-- EXCLUDED:
--    spatial_ref_sys (PostGIS internal — already documented as exempt
--      in supabase/migrations/2026-09-23_enable_rls_5_op_tables.sql:126)
--
-- Pattern: ENABLE + FORCE RLS, REVOKE from anon/authenticated/PUBLIC,
-- GRANT to service_role. For tables that need PUBLIC read (playoff_updates),
-- add a SELECT policy that allows anon SELECT but no INSERT/UPDATE/DELETE.
--
-- ============================================================

BEGIN;

-- ============================================================
-- 1. email_captures — service_role only
-- ============================================================
ALTER TABLE public.email_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_captures FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_captures FROM anon;
REVOKE ALL ON public.email_captures FROM authenticated;
REVOKE ALL ON public.email_captures FROM PUBLIC;
GRANT ALL ON public.email_captures TO service_role;

DROP POLICY IF EXISTS "email_captures: deny all to public" ON public.email_captures;
CREATE POLICY "email_captures: deny all to public"
  ON public.email_captures FOR ALL TO public USING (false) WITH CHECK (false);

-- ============================================================
-- 2. playoff_updates — PUBLIC read, service_role write
-- ============================================================
ALTER TABLE public.playoff_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playoff_updates FORCE ROW LEVEL SECURITY;

-- Read for everyone (anon can GET this for the playoffs page)
CREATE POLICY "playoff_updates: public read"
  ON public.playoff_updates FOR SELECT TO anon, authenticated
  USING (true);

-- Write only via service_role (RLS bypassed)
-- No INSERT/UPDATE/DELETE policy for anon/authenticated → denied by default

-- Belt-and-suspenders: revoke explicit write privileges from anon
REVOKE INSERT, UPDATE, DELETE ON public.playoff_updates FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.playoff_updates FROM authenticated;

GRANT ALL ON public.playoff_updates TO service_role;

-- ============================================================
-- 3. profile_tier_ranks — VIEW (not table), skip RLS, revoke GRANTs instead
-- ============================================================
-- profile_tier_ranks is a VIEW (verified 2026-09-30 via ALTER TABLE failure).
-- Views cannot have RLS enabled. Instead, revoke GRANT-level permissions from
-- anon/authenticated. The view will still be SELECT-able to anon IF they have
-- SELECT privilege, but they'll get an empty/error result because the base
-- table (profiles) is RLS-restricted. Verify the view's base table is locked
-- down by checking profiles in the same audit.
REVOKE INSERT, UPDATE, DELETE ON public.profile_tier_ranks FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.profile_tier_ranks FROM authenticated;

-- ============================================================
-- 4. rink_reviews_legacy — VIEW (not table), skip RLS, revoke GRANTs instead
-- ============================================================
-- rink_reviews_legacy is also a VIEW. Same treatment as profile_tier_ranks.
REVOKE INSERT, UPDATE, DELETE ON public.rink_reviews_legacy FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.rink_reviews_legacy FROM authenticated;

COMMIT;
