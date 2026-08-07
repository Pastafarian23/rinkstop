-- 2026-07-31 — Consumer Onboarding Notifications (WS14 PR1)
-- Prep doc: workstreams/ws14-pr1-onboarding-notifications.md
-- Approved by Arnel 2026-07-31 00:23 CDT
--
-- Adds five new consumer_notification kinds for the onboarding + post-purchase flows:
--   signup_welcome            — first-time signed-in visit, app-only, one-shot
--   identity_verify_recommended — when a free user hits a paid-tier benefit (gated
--                                  by tier-only gating, not a hard wall — these are
--                                  recommendations, not block messages)
--   wizard_incomplete         — emitted by the nightly wizard-nudge cron
--   claim_paid_tier_unlocked  — emitted the first time a user becomes a paid tier
--   profile_first_visitor     — first non-owner view of the user's public profile
--
-- Plus two structural columns:
--   snooze_until TIMESTAMPTZ — suppresses re-derivation of dismissal-state rows
--   action_url / action_label are stored in the existing metadata JSONB (no
--   top-level columns — matches v1 pattern; inbox UI reads metadata).
--
-- All five kinds are APP-ONLY in PR1 (no email channel). Email channel for
-- signup_welcome + identity_verify_recommended is PR2 — same Resend templates
-- we use for teams today.
--
-- Idempotency is intentionally two-layer:
--   1. UNIQUE (user_id, source_key, kind) — prevents duplicate inserts from a
--      single emit call when the same trigger fires twice (e.g., race between
--      two requests that both compute "user just hit the gate").
--   2. snooze_until — when a user dismisses / reads a one-shot, the POST
--      handler in /api/consumer-notifications skips re-derivation until the
--      snooze expires. Default snooze for one-shot kinds is 365 days, which
--      effectively makes them fire once.

BEGIN;

-- =============================================================================
-- Extend kind CHECK with 5 onboarding kinds
-- =============================================================================

ALTER TABLE public.consumer_notifications
  DROP CONSTRAINT IF EXISTS consumer_notifications_kind_check;

ALTER TABLE public.consumer_notifications
  ADD CONSTRAINT consumer_notifications_kind_check CHECK (kind IN (
    -- Existing (Phase 1b-4 + WS3.5 PR4)
    'document_expiring_30d',
    'document_expiring_7d',
    'document_expiring_1d',
    'document_expired',
    'identity_renewal_due',
    'achievement_added',
    -- Added in 2026-07-22_stamps_dispute_schema.sql (WS3.5 PR1)
    'stamp_disputed',
    'dispute_upheld',
    'dispute_overturned',
    -- Added in this migration (WS14 PR1)
    'signup_welcome',
    'identity_verify_recommended',
    'wizard_incomplete',
    'claim_paid_tier_unlocked',
    'profile_first_visitor'
  ));

-- =============================================================================
-- Add snooze_until column (default NULL = no snooze)
-- =============================================================================

ALTER TABLE public.consumer_notifications
  ADD COLUMN IF NOT EXISTS snooze_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS consumer_notifications_snooze_idx
  ON public.consumer_notifications (user_id, snooze_until)
  WHERE snooze_until IS NOT NULL;

COMMENT ON COLUMN public.consumer_notifications.snooze_until IS
  'Re-derivation skip-until timestamp. When set, deriveNotifications skips rows where snooze_until > now(). Used for one-shot welcome/verify recommendations so dismissing them does not re-surface on next dashboard load. Cleared only by explicit POST {clear_snooze: true} action or by an admin trigger.';

-- =============================================================================
-- Idempotency footer
-- =============================================================================

COMMIT;

-- Re-running notes:
--   - DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT is idempotent.
--   - ADD COLUMN IF NOT EXISTS is idempotent.
--   - CREATE INDEX IF NOT EXISTS is idempotent.
--   - Original 9 kinds preserved. 5 new kinds added.
