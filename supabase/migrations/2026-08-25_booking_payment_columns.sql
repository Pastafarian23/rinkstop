-- ============================================================
-- WS17 PR4 Phase 2B: Booking Payment Columns
-- Adds payment columns to booking_requests to support Stripe Connect.
-- ============================================================

ALTER TABLE booking_requests
  ADD COLUMN quoted_price_cents       INTEGER,
  ADD COLUMN payment_intent_id        TEXT,
  ADD COLUMN payment_session_url      TEXT,
  ADD COLUMN payment_session_id       TEXT,
  ADD COLUMN payment_expires_at       TIMESTAMPTZ,
  ADD COLUMN payment_status           TEXT NOT NULL DEFAULT 'pending'
                                          CHECK (payment_status IN ('pending','paid','refunded','disputed')),
  ADD COLUMN paid_at                  TIMESTAMPTZ;

-- ============================================================
-- rink_owners: add Stripe Connect columns
-- ============================================================

ALTER TABLE rink_owners
  ADD COLUMN stripe_account_id         TEXT,
  ADD COLUMN stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN stripe_onboarding_started_at TIMESTAMPTZ;
