-- 2026-06-08 — Founding Member + Location
-- Adds is_founding_member (sparsity lever for the first 500 paying members)
-- and location (city/state for hockey relevance) to the profiles table.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_founding_member BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS location TEXT;

CREATE INDEX IF NOT EXISTS profiles_founding_idx
  ON profiles (is_founding_member) WHERE is_founding_member = TRUE;

COMMENT ON COLUMN profiles.is_founding_member IS 'True for the first 500 paying members (Supporter+). One-time scarcity lever — never awarded again once the cap is hit.';

-- The webhooks/stripe handler awards this on checkout.session.completed when:
--   tier IN ('supporter', 'verified', 'pro') AND (SELECT COUNT(*) FROM profiles WHERE is_founding_member = TRUE) < 500
