-- 2026-06-24: Harden 3 tables that had RLS enabled but NO policies
-- Supabase advisor finding: rls_enabled_no_policy (INFO)
-- Risk: RLS-with-no-policy defaults to deny-all in Postgres, but it's a
--       fragile state — a future permissive migration on the same table
--       could accidentally expose data. Better to make the deny explicit.
--
-- Tables affected:
--   1. bad_words (311 rows) — moderation word list
--   2. pending_username_review (2 rows) — contains user_id + requested_slug
--   3. rink_contact_discovery (900 rows) — contains email + source_url
--
-- Strategy: same deny-all pattern as 2026-06-23 migration
-- All app code uses supabaseAdmin (service role) which bypasses RLS.

-- bad_words
CREATE POLICY "deny_anon_bad_words" ON public.bad_words
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_bad_words" ON public.bad_words
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- pending_username_review
CREATE POLICY "deny_anon_pending_username_review" ON public.pending_username_review
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_pending_username_review" ON public.pending_username_review
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- rink_contact_discovery
CREATE POLICY "deny_anon_rink_contact_discovery" ON public.rink_contact_discovery
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_rink_contact_discovery" ON public.rink_contact_discovery
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Defense in depth: FORCE RLS even for table owner
ALTER TABLE public.bad_words                FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pending_username_review  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rink_contact_discovery   FORCE ROW LEVEL SECURITY;