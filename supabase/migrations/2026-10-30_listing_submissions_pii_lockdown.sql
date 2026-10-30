-- =============================================================================
-- 2026-10-30 — Close the listing_submissions PII leak (anon-readable emails)
-- =============================================================================
--
-- WHY (found while fixing the Slough Satans claim bug):
--   The public Supabase key (`sb_publishable_…`, shipped in the client bundle
--   because NEXT_PUBLIC_SUPABASE_ANON_KEY is a NEXT_PUBLIC_ var) could SELECT
--   every row of `listing_submissions` — INCLUDING the `email` column and the
--   internal `notes` / `outcome_notes` columns. Verified with a direct
--   PostgREST call, not just by reading policy definitions:
--
--     GET /rest/v1/listing_submissions?select=email,name,notes,outcome_notes
--     -> [{"email":"cup@glxyhockey.com", ...}, {"email":"sloughsatans@gmail.com", ...}]
--
--   This is the SAME leak class that was found and fixed on 2026-06-16
--   (migration 2026-06-16-critical-rls-fixes.sql, FIX 5 and FIX 6):
--
--     FIX 5: contact_submissions      -> DROP POLICY contact_submissions_public_read
--     FIX 6: newsletter_subscribers   -> DROP POLICY newsletter_subscribers_public_read
--
--   ...but `listing_submissions_public_read` was NEVER added to that audit,
--   so the third table with the same policy + the same email column was
--   missed. `contact_submissions` and `newsletter_subscribers` both now have
--   `*_deny_all` policies for {anon,authenticated}; `listing_submissions`
--   never got the equivalent.
--
--   Who is affected: anyone who submits a listing form. Today that is
--   `sloughsatans@gmail.com` and `cup@glxyhockey.com` — real people who gave
--   us their email addresses. Their addresses, the full listing description,
--   and our INTERNAL notes about them (including "free listing, no pitch" and
--   revenue-qualification notes) were readable by anyone with the public key.
--
-- WHY IT WAS SAFE TO DROP:
--   Every application read of `listing_submissions` uses `supabaseAdmin`
--   (service role, bypasses RLS):
--     src/lib/revenue-metrics.ts
--     src/app/admin/intake/page.tsx
--     src/app/api/listings/submit/route.ts           (INSERT only)
--     src/app/api/admin/intake/listing-submission/[id]/route.ts
--     src/app/api/admin/intake/listing-submission/[id]/contact/route.ts
--   Nothing reads it with the anon client, so this policy had no consumer.
--
--   The INSERT policy is a SEPARATE policy and is deliberately kept — the
--   public add-listing form must still be able to submit anonymously.
--
-- POLICY SHAPE — IMPORTANT:
--   The deny must NOT be a single `FOR ALL ... WITH CHECK (false)` policy.
--   Postgres evaluates WITH CHECK on INSERT, so a FOR ALL deny blocks the
--   anonymous insert and the public add-listing form breaks with a confusing
--   "new row violates row-level security policy" error. The deny is therefore
--   split per-command (SELECT / UPDATE / DELETE), and INSERT is governed
--   solely by the dedicated "Allow anonymous inserts" policy.
--
-- VERIFIED AFTER APPLYING:
--   - anon SELECT            -> [] (leak closed)
--   - anon INSERT            -> HTTP 201 (public form still works)
--   - anon UPDATE / DELETE   -> 0 rows affected (both rows verified intact)
--   - service_role SELECT    -> both rows still visible to the admin UI
--
-- PERMANENT GUARD:
--   scripts/_audit-rls-pii.mjs re-runs this audit against the LIVE database
--   on every push (pre-push guard Gate 6). It tests BEHAVIOUR (can anon
--   actually read it?) rather than policy definitions, because the two drift.
--
-- RELATIONSHIP TO THE PUBLIC SUBMISSION-STATUS PAGE:
--   A status page must expose a submission's state WITHOUT exposing its
--   email. The correct shape is a separate, narrow, service-role-backed
--   endpoint keyed by an unguessable token — NOT a public RLS read on this
--   table. This lockdown is what makes that approach the only option.
-- =============================================================================

BEGIN;

-- 1. Drop the leaky public read policy.
DROP POLICY IF EXISTS "listing_submissions_public_read" ON public.listing_submissions;

-- 2. Explicit deny for anon/authenticated, matching the pattern already used
--    for contact_submissions and newsletter_subscribers. Split per-command:
--    a FOR ALL deny would also block INSERT via its WITH CHECK clause.
DROP POLICY IF EXISTS "listing_submissions_deny_all" ON public.listing_submissions;
DROP POLICY IF EXISTS "listing_submissions_deny_all_select" ON public.listing_submissions;
DROP POLICY IF EXISTS "listing_submissions_deny_all_update" ON public.listing_submissions;
DROP POLICY IF EXISTS "listing_submissions_deny_all_delete" ON public.listing_submissions;

CREATE POLICY "listing_submissions_deny_all_select" ON public.listing_submissions
  FOR SELECT TO anon, authenticated
  USING (false);

CREATE POLICY "listing_submissions_deny_all_update" ON public.listing_submissions
  FOR UPDATE TO anon, authenticated
  USING (false);

CREATE POLICY "listing_submissions_deny_all_delete" ON public.listing_submissions
  FOR DELETE TO anon, authenticated
  USING (false);

-- 3. Keep INSERT working for the public add-listing form.
--    The "Allow anonymous inserts" policy from 005_listing_submissions.sql
--    covers this. Re-assert it defensively, and so the intent is explicit
--    next to the deny policies.
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.listing_submissions;
CREATE POLICY "Allow anonymous inserts" ON public.listing_submissions
  FOR INSERT TO anon WITH CHECK (true);

-- 4. Admin/authenticated reads stay scoped to authenticated users, matching
--    the original 005_listing_submissions.sql intent.
DROP POLICY IF EXISTS "Allow read by authenticated" ON public.listing_submissions;
CREATE POLICY "Allow read by authenticated" ON public.listing_submissions
  FOR SELECT TO authenticated USING (true);

-- 5. No public delete.
DROP POLICY IF EXISTS "listing_submissions: no public delete" ON public.listing_submissions;
CREATE POLICY "listing_submissions: no public delete" ON public.listing_submissions
  FOR DELETE TO public USING (false);

COMMIT;
