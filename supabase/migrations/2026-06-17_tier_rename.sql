-- 2026-06-17 — Tier rename
-- Per Arnel's directive: free / starter / pro / premium / enterprise
-- Old: free / supporter / verified / pro / enterprise
-- Stripe Price IDs unchanged — only the user-facing tier identifiers and
-- database CHECK constraint move. The Stripe products still have IDs like
-- price_1ThcqgCJiUbEZVbnyHLCogTF, only their product display names
-- (which Arnel will rename in the Stripe Dashboard separately) change.

-- 1. Drop the old constraint and tier_rank view (depends on old names)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;
DROP VIEW IF EXISTS profile_tier_ranks;

-- 2. Rename any existing rows from old tier names to new tier names.
--    As of 2026-06-17 there are 13 profiles (all test + Arnel), so this is safe.
UPDATE profiles SET tier = 'starter' WHERE tier = 'supporter';
UPDATE profiles SET tier = 'pro'      WHERE tier = 'verified';
UPDATE profiles SET tier = 'premium'  WHERE tier = 'pro';

-- 3. Add the new CHECK constraint
ALTER TABLE profiles
  ADD CONSTRAINT profiles_tier_check
  CHECK (tier IN ('free', 'starter', 'pro', 'premium', 'enterprise'));

-- 4. Recreate the tier_rank view with the new names
CREATE OR REPLACE VIEW profile_tier_ranks AS
SELECT user_id, tier, tier_expires_at, subscription_status,
  CASE tier
    WHEN 'free'       THEN 0
    WHEN 'starter'    THEN 1
    WHEN 'pro'        THEN 2
    WHEN 'premium'    THEN 3
    WHEN 'enterprise' THEN 4
  END AS tier_rank
FROM profiles;

-- 5. Index stays (column name unchanged)
-- profiles_tier_idx already exists from 2026-06-08 migration.
