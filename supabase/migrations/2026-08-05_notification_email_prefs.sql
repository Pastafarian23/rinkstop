-- 2026-08-05_notification_email_prefs.sql
--
-- WS14 PR2 — Per-kind email mute preference for onboarding notifications.
-- Additive + idempotent.
--
-- Default: muted = false. Email is ON by default (opt-out, not opt-in).
-- Rationale: people signed up for these notifications; flipping them all
-- to off would require every user to opt in to get the very thing
-- they signed up for. Default ON is the honest read.
--
-- RLS: user can read/write own prefs; admin can read all via service role.
--
-- The five kinds match OnboardingKind in src/lib/notifications/emit.ts:
--   signup_welcome                — first dashboard load
--   identity_verify_recommended    — gate trigger on /api/tier/upgrade
--   wizard_incomplete             — nightly cron
--   claim_paid_tier_unlocked      — admin approval
--   profile_first_visitor         — first non-owner profile view
--
-- email_muted skips profile_first_visitor regardless of the pref because
-- email-on-first-view is too aggressive (email lurker pings the user).
-- That's an emitter-side decision, not a row-level constraint.

CREATE TABLE IF NOT EXISTS public.notification_email_prefs (
  user_id     TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  muted       BOOLEAN NOT NULL DEFAULT false,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One pref row per (user, kind). Prefer-upsert via ON CONFLICT.
  UNIQUE (user_id, kind),

  -- The allowed kinds. Check is loose — we can add kinds without a
  -- migration by relaxing this check (and adding a comment).
  CHECK (kind IN (
    'signup_welcome',
    'identity_verify_recommended',
    'wizard_incomplete',
    'claim_paid_tier_unlocked',
    'profile_first_visitor'
  ))
);

CREATE INDEX IF NOT EXISTS idx_notification_email_prefs_user
  ON public.notification_email_prefs (user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.notification_email_prefs_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notification_email_prefs_updated_at ON public.notification_email_prefs;
CREATE TRIGGER trg_notification_email_prefs_updated_at
  BEFORE UPDATE ON public.notification_email_prefs
  FOR EACH ROW EXECUTE FUNCTION public.notification_email_prefs_set_updated_at();

-- RLS
ALTER TABLE public.notification_email_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User read own email prefs" ON public.notification_email_prefs;
CREATE POLICY "User read own email prefs"
  ON public.notification_email_prefs FOR SELECT
  USING (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "User upsert own email prefs" ON public.notification_email_prefs;
CREATE POLICY "User upsert own email prefs"
  ON public.notification_email_prefs FOR INSERT
  WITH CHECK (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "User update own email prefs" ON public.notification_email_prefs;
CREATE POLICY "User update own email prefs"
  ON public.notification_email_prefs FOR UPDATE
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "User delete own email prefs" ON public.notification_email_prefs;
CREATE POLICY "User delete own email prefs"
  ON public.notification_email_prefs FOR DELETE
  USING (user_id = (auth.uid())::text);

-- Admin override
DROP POLICY IF EXISTS "Admin read all email prefs" ON public.notification_email_prefs;
CREATE POLICY "Admin read all email prefs"
  ON public.notification_email_prefs FOR SELECT
  USING (auth.jwt() ->> 'role' = 'super_admin');

-- Migration verification
DO $$
DECLARE
  pref_count INT;
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO pref_count
    FROM public.notification_email_prefs;
  SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'notification_email_prefs' AND schemaname = 'public';

  RAISE NOTICE 'WS14 PR2 notification_email_prefs applied:';
  RAISE NOTICE '  rows: %', pref_count;
  RAISE NOTICE '  RLS policies: %', policy_count;
  RAISE NOTICE '  Expected: 0 rows (table created; populated on first upsert), 5 RLS policies';
END $$;
