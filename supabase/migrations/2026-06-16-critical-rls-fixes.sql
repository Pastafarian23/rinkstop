-- 2026-06-16: Critical RLS policy + search_path fixes (Phase 2)
-- Part 1: Fix the live exploits discovered during security audit
--
-- Live exploits (verified before this migration):
--   1. anon can INSERT into posts (content spam vector)
--   2. anon can UPDATE any post (status change vector)
--   3. anon can SELECT/INSERT/UPDATE/DELETE on profile_account_types (privilege escalation)
--   4. anon + authenticated can call review_post_with_edits RPC (archive/republish any post)
--   5. anon can UPDATE any review
--   6. anon can SELECT all contact_submissions (PII leak: name, email, message)
--   7. anon can SELECT all newsletter_subscribers (PII leak: emails)
--   8. 4 SECURITY DEFINER views bypass RLS on underlying tables
--   9. 13 functions have mutable search_path (search_path injection vector)
--
-- Verified pre-flight:
--   - All app code that touches these tables uses supabaseAdmin (service role)
--     Service role bypasses RLS, so tightening these policies does NOT break the app.
--   - Scripts in scripts/article-from-highlight/ use SUPABASE_SERVICE_ROLE_KEY
--     (loaded via load-secrets.mjs), so they continue to work.
--   - 8 tables with RLS but no policies will be addressed in a separate migration
--     (Part 2: explicit deny policies for admin/audit tables).
--
-- Reversibility: each fix is one DROP POLICY + CREATE POLICY (or one ALTER
-- statement). To roll back, re-run the original (broken) policy from git history.

-- ============================================================
-- FIX 1: review_post_with_edits RPC — only service_role can call
-- ============================================================
-- Before: anon + authenticated could call this. Anon archived a real post during testing.
-- After: only service_role (which is what /api/admin/articles/[id] uses).
REVOKE EXECUTE ON FUNCTION public.review_post_with_edits(uuid, text, jsonb, text) FROM anon, authenticated;

-- ============================================================
-- FIX 2: posts table — only service_role can INSERT or UPDATE
-- ============================================================
-- Before: anon could INSERT (content spam) and UPDATE any post (status change).
-- After: anon/authenticated can only SELECT (with status='published' check).
DROP POLICY IF EXISTS "Anyone can insert with API key" ON public.posts;
DROP POLICY IF EXISTS "Anyone can update own posts" ON public.posts;

-- The "Public can read published posts" policy stays (it's correct: USING(status='published'))
-- We do NOT need to add INSERT/UPDATE policies for service_role — service_role bypasses RLS.

-- ============================================================
-- FIX 3: profile_account_types — restrict to own user_id
-- ============================================================
-- Before: 4 policies with USING(true) or WITH CHECK(true) — anon could read/modify any.
-- After: only the user themselves can read/insert/update/delete their own account_types.
DROP POLICY IF EXISTS "pat_select" ON public.profile_account_types;
DROP POLICY IF EXISTS "pat_insert_own" ON public.profile_account_types;
DROP POLICY IF EXISTS "pat_update_own" ON public.profile_account_types;
DROP POLICY IF EXISTS "pat_delete_own" ON public.profile_account_types;

CREATE POLICY "pat_select_own" ON public.profile_account_types
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "pat_insert_own" ON public.profile_account_types
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "pat_update_own" ON public.profile_account_types
  FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "pat_delete_own" ON public.profile_account_types
  FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- ============================================================
-- FIX 4: reviews table — restrict UPDATE to own user_id
-- ============================================================
-- Before: reviews_update_admin allowed ANY update (USING true + WITH CHECK true).
-- After: only the user who wrote the review can update it.
DROP POLICY IF EXISTS "reviews_update_admin" ON public.reviews;
CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- The "reviews_insert_public" policy stays (anon needs to submit reviews).

-- ============================================================
-- FIX 5: contact_submissions — service_role only
-- ============================================================
-- Before: anon could SELECT all contact form submissions (PII leak: name, email, message).
-- After: only service_role can read. INSERT can stay public (contact form needs to work).
DROP POLICY IF EXISTS "contact_submissions_public_read" ON public.contact_submissions;

-- ============================================================
-- FIX 6: newsletter_subscribers — service_role only
-- ============================================================
-- Before: anon could SELECT all subscriber emails (PII leak).
-- After: only service_role can read. INSERT can stay public.
DROP POLICY IF EXISTS "newsletter_subscribers_public_read" ON public.newsletter_subscribers;

-- ============================================================
-- FIX 7: profiles_select — clarify the policy
-- ============================================================
-- Before: profiles_select USING(true) — anon could read all profiles.
-- The GRANT actually blocks anon reads (PG requires GRANT + policy), but the
-- policy is misleading. Replace with a more explicit policy.
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
-- Authenticated users can read other users' profiles (for public-facing pages like /profile/[slug]).
-- Note: pages that read profiles use supabaseAdmin, so this is for completeness.
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- FIX 8: 4 SECURITY DEFINER views — switch to SECURITY INVOKER
-- ============================================================
-- Before: views ran with owner (postgres) permissions, bypassing RLS on underlying tables.
-- After: views run with caller's permissions, so RLS on underlying tables is honored.
-- PG 16+ syntax: ALTER VIEW ... SET (security_invoker = true). The options list
-- must be parenthesized. (CREATE VIEW ... WITH (security_invoker = true) is
-- also valid in PG 15+, but ALTER is non-destructive.)
-- APPLIED 2026-06-16 16:35 via direct SQL (parens form); kept here for migration
-- history. Re-running is a no-op.
-- ALTER VIEW public.fixtures_audit_daily SET (security_invoker = true);
-- ALTER VIEW public.profile_tier_ranks SET (security_invoker = true);
-- ALTER VIEW public.rink_reviews SET (security_invoker = true);
-- ALTER VIEW public.post_review_summary SET (security_invoker = true);

-- ============================================================
-- FIX 9: 13 functions with mutable search_path — pin search_path
-- ============================================================
-- Before: search_path was mutable, allowing a malicious user with CREATE
-- privilege to create a function or table that shadows a public symbol and
-- intercept the query.
-- After: each function has a fixed search_path = 'pg_catalog, public'.
--         'public' is needed because some functions reference unqualified
--         table names (e.g. is_username_unavailable → reserved_slugs).
--         'pg_catalog' is listed first so built-in functions like now(),
--         text, etc. resolve correctly.
ALTER FUNCTION public.is_username_unavailable(p_slug text) SET search_path = 'pg_catalog, public';
ALTER FUNCTION public.update_updated_at() SET search_path = 'pg_catalog, public';
ALTER FUNCTION public.set_published_at() SET search_path = 'pg_catalog, public';
ALTER FUNCTION public.generate_coach_slug() SET search_path = 'pg_catalog, public';
ALTER FUNCTION public.fixtures_reject_null_teams() SET search_path = 'pg_catalog, public';
ALTER FUNCTION public.fixtures_reject_zero_score_past() SET search_path = 'pg_catalog, public';
ALTER FUNCTION public.fixtures_reject_completed_downgrade() SET search_path = 'pg_catalog, public';
ALTER FUNCTION public.fixtures_check_team_league_match() SET search_path = 'pg_catalog, public';
ALTER FUNCTION public.get_connection_between(u_a text, u_b text) SET search_path = 'pg_catalog, public';
ALTER FUNCTION public.is_youth_player(player_uuid uuid) SET search_path = 'pg_catalog, public';
ALTER FUNCTION public.set_updated_at() SET search_path = 'pg_catalog, public';
ALTER FUNCTION public.update_thread_on_message_insert() SET search_path = 'pg_catalog, public';
ALTER FUNCTION public.trg_set_updated_at() SET search_path = 'pg_catalog, public';
