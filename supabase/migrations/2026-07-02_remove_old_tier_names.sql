-- 2026-07-02 — Remove old tier names, migrate data, lock DB to new tier names
-- Per Arnel's directive: "Old tier references should no longer be used or referenced"
--
-- Live state as of 2026-07-02 22:50 CDT (15 profile rows):
--   free=8, premium=5, starter=2
-- All old tier names. None with new tier names.
--
-- Mapping for old → new:
--   starter    → verified_identity (rank 1, equivalent tier)
--   premium    → identity_plus     (rank 2, equivalent tier)
--   pro        → identity_plus     (rank 2, alias for premium)
--   enterprise → federation        (rank 5, top tier pre-refactor)
--   roster     → verified_identity (rank 1, alias for starter)
--   roster_plus→ identity_plus     (rank 2, alias for premium/pro)
--   business_starter → business_listing (rank 1)
--   business_pro     → business_plus     (rank 2)
--   business_premium → business_plus     (rank 2, alias)
--
-- This migration:
--   1. Migrates profiles.tier values from old names to new names
--   2. Drops the old CHECK constraint
--   3. Adds a new CHECK constraint with ONLY new tier names
--   4. Rebuilds profile_tier_ranks view with new tier names + ranks only
--   5. Drops the listings.tier column (dead code, not queried from src/)
--   6. Does NOT touch players.badge_tier (different system: founding-member badge,
--      not subscription tier; uses 'free'/'verified'/'elite' intentionally)

-- ============================================================
-- 1. Drop the OLD CHECK constraint FIRST (allows UPDATE to write new names)
-- ============================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;

-- ============================================================
-- 2. profiles.tier data migration
-- ============================================================
UPDATE profiles SET tier = 'verified_identity' WHERE tier IN ('starter', 'roster');
UPDATE profiles SET tier = 'identity_plus'     WHERE tier IN ('premium', 'pro', 'roster_plus');
UPDATE profiles SET tier = 'business_listing'  WHERE tier = 'business_starter';
UPDATE profiles SET tier = 'business_plus'     WHERE tier IN ('business_pro', 'business_premium');
UPDATE profiles SET tier = 'federation'        WHERE tier = 'enterprise';

-- ============================================================
-- 3. Add the NEW CHECK constraint with ONLY 2026-07-02 tier names
-- ============================================================
ALTER TABLE profiles
  ADD CONSTRAINT profiles_tier_check
  CHECK (tier IN (
    'free',
    'verified_identity', 'identity_plus',
    'club_starter', 'club_pro', 'club_elite', 'league', 'federation',
    'business_listing', 'business_plus'
  ));

-- ============================================================
-- 4. Rebuild profile_tier_ranks view with new tier names + ranks only
-- ============================================================
DROP VIEW IF EXISTS profile_tier_ranks;
CREATE OR REPLACE VIEW profile_tier_ranks AS
SELECT user_id, tier, tier_expires_at, subscription_status,
  CASE tier
    WHEN 'free'              THEN 0
    WHEN 'verified_identity' THEN 1
    WHEN 'identity_plus'     THEN 2
    WHEN 'club_starter'      THEN 1
    WHEN 'club_pro'          THEN 2
    WHEN 'club_elite'        THEN 3
    WHEN 'league'            THEN 4
    WHEN 'federation'        THEN 5
    WHEN 'business_listing'  THEN 1
    WHEN 'business_plus'     THEN 2
  END AS tier_rank
FROM profiles;

-- ============================================================
-- 5. Drop listings.tier column (dead code, not used)
-- ============================================================
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_tier_check;
ALTER TABLE listings DROP COLUMN IF EXISTS tier;

-- ============================================================
-- Verification (run separately after migration to confirm)
-- ============================================================
-- SELECT tier, COUNT(*) FROM profiles GROUP BY tier ORDER BY tier;
-- Expected: 8 free, 7 identity_plus (5 premium + 2 starter→identity_plus... wait, starter→verified_identity)
-- Actual: 8 free, 5 identity_plus (premium→identity_plus), 2 verified_identity (starter→verified_identity)
-- So expected: free=8, identity_plus=5, verified_identity=2 = 15 total ✓