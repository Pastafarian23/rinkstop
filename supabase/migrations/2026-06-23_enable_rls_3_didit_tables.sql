-- 2026-06-23: Enable RLS on 3 tables created in 2026-06-17_didit_identity.sql
-- Supabase advisor finding: rls_disabled_in_public (ERROR)
-- Supabase advisor finding: sensitive_columns_exposed (WARNING)
-- Verified via api.supabase.com/v1/projects/.../advisors/security on 2026-06-23
-- Verified via direct anon-key exploit (full read+write on webhook_events,
--   schema exposure on didit_sessions.decision + identity_reminders)
--
-- Scope: 3 tables
--   1. webhook_events — dedupe table for inbound webhooks (Didit, Stripe,
--      Clerk, etc.). Currently 0 rows after security cleanup, but anon can
--      INSERT (poison the dedupe namespace → real Didit webhooks get
--      rejected as duplicates → DoS on identity verification).
--   2. didit_sessions — Didit.me verification sessions. decision JSONB
--      contains scrubbed KYC data + cost_cents + user_id. Currently 0 rows
--      (no users have started verification yet) but the schema is fully
--      readable via anon key and the moment any user runs /identity/verify/start,
--      their PII becomes public.
--   3. identity_reminders — cron-generated reminders for upcoming identity
--      expiry. Contains user_id + identity_expires_at (when a user needs
--      to re-verify). Reveals which accounts are about to lapse.
--
-- Strategy: ENABLE RLS + DENY all access to anon and authenticated
-- All app code uses supabaseAdmin (service role) which bypasses RLS, so
-- the migration does not change any application behavior.

-- Step 1: Enable RLS
ALTER TABLE public.webhook_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.didit_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_reminders ENABLE ROW LEVEL SECURITY;

-- Step 2: Deny all access to anon and authenticated roles
-- (Service role bypasses RLS automatically.)

-- webhook_events
CREATE POLICY "deny_anon_webhook_events" ON public.webhook_events
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_webhook_events" ON public.webhook_events
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- didit_sessions
CREATE POLICY "deny_anon_didit_sessions" ON public.didit_sessions
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_didit_sessions" ON public.didit_sessions
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- identity_reminders
CREATE POLICY "deny_anon_identity_reminders" ON public.identity_reminders
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_identity_reminders" ON public.identity_reminders
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Step 3: Force RLS even for the table owner (defense in depth)
-- This is optional but ensures the table owner can't accidentally bypass
-- RLS by running a query directly. The application uses supabaseAdmin
-- (service role) which always bypasses RLS, so FORCE has no impact on
-- application code paths.
ALTER TABLE public.webhook_events   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.didit_sessions  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.identity_reminders FORCE ROW LEVEL SECURITY;