-- 2026-08-26_rink_owners_onboarding_completed_at.sql
--
-- Security audit 2026-08-26 fix #4: add stripe_onboarding_completed_at
-- timestamp column so we can record when a rink's Stripe Connect
-- onboarding was first verified as complete.
--
-- Idempotent. Safe to re-run.

ALTER TABLE rink_owners
  ADD COLUMN IF NOT EXISTS stripe_onboarding_completed_at TIMESTAMPTZ;
