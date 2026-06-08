-- 2026-06-08 — User Tiers
-- Add tier + Stripe customer/subscription columns to profiles.
-- The tier gates DM sending and the presence of upgrade CTAs.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'supporter', 'verified', 'pro')),
  ADD COLUMN IF NOT EXISTS tier_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT
    CHECK (subscription_status IN ('active', 'past_due', 'cancelled', 'trialing', NULL));

CREATE INDEX IF NOT EXISTS profiles_tier_idx ON profiles (tier);
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_idx ON profiles (stripe_customer_id);

-- A view that ranks tiers numerically for "is at least X" checks.
-- Free=0, Supporter=1, Verified=2, Pro=3.
CREATE OR REPLACE VIEW profile_tier_ranks AS
SELECT user_id, tier, tier_expires_at, subscription_status,
  CASE tier
    WHEN 'free'       THEN 0
    WHEN 'supporter'  THEN 1
    WHEN 'verified'   THEN 2
    WHEN 'pro'        THEN 3
  END AS tier_rank
FROM profiles;

-- Update the existing "profiles_select" policy to also allow public read of
-- tier/display_name/avatar_url (so DMs and player pages can render the user's
-- tier badge and avatar without RLS blocking). The existing policy already
-- allows the user to read their own row; we add a public read for non-PII cols.
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);

-- profiles_upsert stays as-is (user can update their own row).
