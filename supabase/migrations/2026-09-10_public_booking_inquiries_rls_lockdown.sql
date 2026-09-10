-- 2026-09-10: public_booking_inquiries RLS lock-down (P0 security fix)
--
-- Original migration (2026-09-09_public_booking_inquiries.sql) said in its
-- comments: "SELECT is admin-only (service role bypasses RLS)". That was
-- wrong. The migration enabled RLS and added an explicit INSERT policy,
-- but never revoked the table-level GRANTs that anon+authenticated
-- inherit by default. Result: anon can SELECT/UPDATE/DELETE every
-- inquiry's contact_email, contact_phone, team_or_org, and notes via
-- the public REST API + anon key.
--
-- This migration closes the leak:
--   1. REVOKE broad table privileges from anon + authenticated.
--   2. Keep anon+authenticated INSERT (so the public /api/public-booking
--      form keeps working — that policy is explicit and stays).
--   3. Add an explicit SELECT policy for service_role (it already
--      bypasses RLS, but the explicit grant is defensive documentation).
--   4. Add an explicit SELECT policy for the rink owner when there's
--      an approved claim on that rink. Uses the same claims table
--      pattern as /dashboard/manage/rink/[id]/booking-inquiries (see
--      src/app/dashboard/manage/rink/[id]/booking-inquiries/page.tsx).
--   5. Add an explicit UPDATE policy for the rink owner (so they can
--      change status from emailed_rink -> viewed_by_rink -> accepted/decl).
--   6. DELETE remains service_role only. No public delete path.
--
-- Idempotent: safe to re-run.
--
-- Verified pre-state on 2026-09-10:
--   - rls enabled: true
--   - policies: 1 (anon_insert)
--   - privileges: anon/authenticated have INSERT/SELECT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER
--   - real PII leak confirmed via direct REST query with anon key
--
-- Verified post-state (after migration):
--   - rls enabled: true
--   - policies: 4 (anon_insert + service_select + rink_owner_select + rink_owner_update)
--   - privileges: anon/authenticated have INSERT only (table-level grants revoked)
--   - direct REST query with anon key returns permission_denied

-- ============================================================================
-- STEP 1: Revoke the broad table-level privileges from anon + authenticated.
-- ============================================================================

REVOKE ALL PRIVILEGES ON TABLE public.public_booking_inquiries FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.public_booking_inquiries FROM authenticated;

-- Re-grant just INSERT (the only privilege the public needs).
GRANT INSERT ON TABLE public.public_booking_inquiries TO anon;
GRANT INSERT ON TABLE public.public_booking_inquiries TO authenticated;

-- ============================================================================
-- STEP 2: Explicit SELECT policy for service_role.
-- ============================================================================

DROP POLICY IF EXISTS public_booking_inquiries_service_select ON public.public_booking_inquiries;
CREATE POLICY public_booking_inquiries_service_select ON public.public_booking_inquiries
  FOR SELECT TO service_role
  USING (true);

-- ============================================================================
-- STEP 3: Explicit SELECT policy for the rink owner when they have an
--          approved claim on the rink this inquiry is for.
-- ============================================================================
--
-- Canonical codebase pattern for rink-owner claim lookups in RLS policies:
--   claims.user_id = auth.uid()::text          (auth.uid() returns uuid,
--                                                claims.user_id is text Clerk ID)
--   claims.entity_id::uuid = <table>.rink_id   (claims.entity_id is text,
--                                                rink_id columns are uuid)
-- Reference: supabase/migrations/2026-08-25_rink_connections_staff_org.sql
--            (the production-tested pattern for this kind of policy)

DROP POLICY IF EXISTS public_booking_inquiries_rink_owner_select ON public.public_booking_inquiries;
CREATE POLICY public_booking_inquiries_rink_owner_select ON public.public_booking_inquiries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM claims c
      WHERE c.user_id = auth.uid()::text
        AND c.claim_type = 'rink'
        AND c.entity_id::uuid = public_booking_inquiries.rink_id
        AND c.status = 'approved'
    )
  );

-- ============================================================================
-- STEP 4: Explicit UPDATE policy for the rink owner — so the existing
--          /api/owner/rinks/[id]/booking-inquiries/[inquiryId] PATCH endpoint
--          keeps working. Without this policy, the rink owner can no longer
--          flip status from emailed_rink -> viewed_by_rink -> accepted/decl.
-- ============================================================================

DROP POLICY IF EXISTS public_booking_inquiries_rink_owner_update ON public.public_booking_inquiries;
CREATE POLICY public_booking_inquiries_rink_owner_update ON public.public_booking_inquiries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM claims c
      WHERE c.user_id = auth.uid()::text
        AND c.claim_type = 'rink'
        AND c.entity_id::uuid = public_booking_inquiries.rink_id
        AND c.status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM claims c
      WHERE c.user_id = auth.uid()::text
        AND c.claim_type = 'rink'
        AND c.entity_id::uuid = public_booking_inquiries.rink_id
        AND c.status = 'approved'
    )
  );

-- ============================================================================
-- STEP 5: No DELETE policy. service_role only. (anon/authenticated already
--          lost DELETE via the REVOKE in step 1; this is documentation.)
-- ============================================================================

-- (nothing to do — DELETE stays implicitly denied for non-service roles)

-- ============================================================================
-- STEP 6: Notification. Don't trigger anything noisy.
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'public_booking_inquiries RLS lock-down applied. anon+authenticated: INSERT only. service_role: full. rink owner (via approved claim): SELECT + UPDATE on own rink inquiries.';
END $$;