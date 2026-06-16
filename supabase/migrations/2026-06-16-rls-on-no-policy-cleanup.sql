-- 2026-06-16: Cleanup for 8 RLS-enabled-no-policy tables (Phase 2)
-- Part 2: Add explicit deny policies for the 8 tables that have RLS ON but no policies.
--
-- Currently all 8 tables are deny-by-default (no anon access). This migration
-- makes the deny explicit by adding policies that say "deny" instead of
-- relying on the absence of policies. The result is the same; the advisor
-- finding is cleared; the code is self-documenting.
--
-- All app reads of these tables use supabaseAdmin (service role), which bypasses
-- RLS, so adding deny policies does NOT break the app.
--
-- Note on the NHL data tables (nhl_matches, nhl_standings, nhl_teams):
--   The src/lib/nhl-data.ts comment says these could be public-read in the future
--   to allow the /directory/nhl/* pages to use the anon key. Today the pages
--   use supabaseAdmin, so we don't need to expose the data yet. If/when we want
--   to switch, add a CREATE POLICY ... FOR SELECT TO anon USING (true) here.
--   For now: deny by default. Same as current behavior, just explicit.
--
-- Reversibility: DROP POLICY <name> on <table>. The table reverts to deny-by-default.

-- ============================================================
-- Admin / audit / internal tables: explicit deny policies
-- ============================================================

CREATE POLICY "admin_audit_log_deny_all" ON public.admin_audit_log
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "analytics_events_deny_all" ON public.analytics_events
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "nhl_matches_deny_all" ON public.nhl_matches
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "nhl_standings_deny_all" ON public.nhl_standings
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "nhl_sync_log_deny_all" ON public.nhl_sync_log
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "nhl_teams_deny_all" ON public.nhl_teams
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "post_review_edits_deny_all" ON public.post_review_edits
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "rate_limit_hits_deny_all" ON public.rate_limit_hits
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- contact_submissions and newsletter_subscribers lost their policies in
-- Part 1 (the SELECT policies that exposed PII were dropped). Add explicit
-- deny policies to clear the rls_enabled_no_policy finding.
CREATE POLICY "contact_submissions_deny_all" ON public.contact_submissions
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "newsletter_subscribers_deny_all" ON public.newsletter_subscribers
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
