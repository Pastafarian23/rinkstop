-- 2026-06-17_didit_identity.sql
-- Phase 1: Person ID verification via Didit.me
-- Owner: KiloClaw
-- Status: Locked design. Ship target: 2026-06-17.
--
-- Adds 4 columns to profiles, creates didit_sessions + webhook_events,
-- creates profile_identity_status view + helper index.
-- PII is scrubbed in code (src/lib/didit-scrubber.ts) before insert — we
-- do not store document_number, personal_number, full_name, email_address,
-- phone_number, birth_date, address, portrait_image URL, signature_image URL,
-- chip_data, authenticity, certificate_summary. Only non-PII audit fields
-- land in didit_sessions.decision JSONB.
--
-- Note: profiles.user_id is TEXT (Clerk user IDs are text), not UUID.
-- The didit_session_id on profiles is UUID because it's a reference to
-- didit_sessions.id (internal UUID). didit_sessions.user_id is TEXT to
-- match profiles.user_id.

-- ============================================================
-- 1. profiles columns
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS identity_verification_method TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS didit_session_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS identity_expires_at TIMESTAMPTZ;

-- CHECK constraints (added during 2026-06-17 audit)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_identity_verification_method_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_identity_verification_method_check
      CHECK (identity_verification_method IS NULL OR
             identity_verification_method IN ('didit_passport', 'didit_id_card', 'didit_selfie_only'));
  END IF;
END$$;

-- Helper index: find expired / soon-to-expire verifications fast
CREATE INDEX IF NOT EXISTS profiles_identity_expires_idx
  ON profiles (identity_expires_at)
  WHERE identity_verified_at IS NOT NULL;

-- ============================================================
-- 2. didit_sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS didit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  session_id UUID NOT NULL UNIQUE,             -- Didit's session_id
  session_kind TEXT NOT NULL,                  -- 'user' | 'business'
  workflow_id UUID NOT NULL,                   -- Didit's workflow_id
  status TEXT NOT NULL,                        -- 'not_started' | 'in_progress' | 'approved' | 'declined' | 'in_review' | 'abandoned' | 'resubmitted'
  decision JSONB,                              -- SCRUBBED non-PII fields only
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cost_cents INTEGER,
  event_ids TEXT[] DEFAULT '{}',               -- Didit reuses event_id on retries
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS didit_sessions_user_id_idx ON didit_sessions (user_id);
CREATE INDEX IF NOT EXISTS didit_sessions_status_idx ON didit_sessions (status);
CREATE INDEX IF NOT EXISTS didit_sessions_session_kind_idx ON didit_sessions (session_kind);

-- CHECK constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'didit_sessions' AND constraint_name = 'didit_sessions_session_kind_check'
  ) THEN
    ALTER TABLE didit_sessions ADD CONSTRAINT didit_sessions_session_kind_check
      CHECK (session_kind IN ('user', 'business'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'didit_sessions' AND constraint_name = 'didit_sessions_status_check'
  ) THEN
    ALTER TABLE didit_sessions ADD CONSTRAINT didit_sessions_status_check
      CHECK (status IN ('not_started', 'in_progress', 'approved', 'declined', 'in_review', 'abandoned', 'resubmitted'));
  END IF;
END$$;

-- ============================================================
-- 3. webhook_events (idempotency)
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,                        -- 'didit' | 'stripe' | 'clerk' | '...'
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_events_source_received_idx
  ON webhook_events (source, received_at DESC);

-- ============================================================
-- 4. profile_identity_status view (single source of truth for UI + cron)
-- ============================================================

CREATE OR REPLACE VIEW profile_identity_status AS
SELECT
  user_id,
  identity_verified_at,
  identity_expires_at,
  identity_verification_method,
  CASE
    WHEN identity_verified_at IS NULL THEN 'never_verified'
    WHEN identity_expires_at > now() THEN 'active'
    WHEN identity_verified_at IS NOT NULL AND identity_expires_at <= now() THEN 'expired'
    ELSE 'never_verified'
  END AS status,
  CASE
    WHEN identity_expires_at IS NOT NULL THEN
      EXTRACT(DAYS FROM (identity_expires_at - now()))::int
    ELSE NULL
  END AS days_until_expiry
FROM profiles;

-- ============================================================
-- 5. Comment annotations
-- ============================================================

COMMENT ON COLUMN profiles.identity_verified_at IS 'When the user passed Didit ID + liveness check. NULL = never verified.';
COMMENT ON COLUMN profiles.identity_verification_method IS 'How the user verified: didit_passport | didit_id_card | didit_selfie_only';
COMMENT ON COLUMN profiles.didit_session_id IS 'FK to didit_sessions.id. Most recent session used for verification.';
COMMENT ON COLUMN profiles.identity_expires_at IS '= identity_verified_at + 2 years. Cron flags expired rows.';
COMMENT ON TABLE didit_sessions IS 'Didit.me verification sessions. decision JSONB is PII-scrubbed in code before insert.';
COMMENT ON TABLE webhook_events IS 'Dedupe table for inbound webhooks (Didit, Stripe, Clerk, etc.). Insert before processing.';
COMMENT ON VIEW profile_identity_status IS 'Single source of truth for identity status: never_verified | active | expired. Used by UI + cron.';
