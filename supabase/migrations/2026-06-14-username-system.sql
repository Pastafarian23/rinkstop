-- Username System Migration
-- Date: 2026-06-14
-- Author: KiloClaw
-- Reference: docs/USERNAME_DESIGN.md
--
-- Adds username system to profiles table:
-- 1. New `username` column on profiles (case-insensitive unique)
-- 2. Reserved slugs table (admin, login, brand, account types, future use)
-- 3. Username change history (for 14-day cooldown)
-- 4. Username holds (released slugs held for 14 days before re-registration)
--
-- All operations are additive — no data is destroyed. Existing rows
-- have username = NULL until users claim one via the dashboard prompt.

BEGIN;

-- =====================================================
-- 1. Add username column to profiles
-- =====================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Case-insensitive unique index
-- WHERE clause: only enforce uniqueness for non-null usernames
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique 
  ON profiles (LOWER(username)) 
  WHERE username IS NOT NULL;

-- Lookup index for slug-based queries
CREATE INDEX IF NOT EXISTS profiles_username_lower_idx 
  ON profiles (LOWER(username)) 
  WHERE username IS NOT NULL;

-- =====================================================
-- 2. Reserved slugs table
-- =====================================================
CREATE TABLE IF NOT EXISTS reserved_slugs (
  slug TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed reserved slugs (idempotent: ON CONFLICT DO NOTHING)
INSERT INTO reserved_slugs (slug, reason) VALUES
  -- System routes
  ('admin', 'system'),
  ('api', 'system'),
  ('login', 'system'),
  ('signup', 'system'),
  ('logout', 'system'),
  ('register', 'system'),
  ('dashboard', 'system'),
  ('profile', 'system'),
  ('profiles', 'system'),
  ('settings', 'system'),
  ('account', 'system'),
  ('support', 'system'),
  ('help', 'system'),
  ('about', 'system'),
  ('terms', 'system'),
  ('privacy', 'system'),
  ('legal', 'system'),
  ('directory', 'system'),
  ('search', 'system'),
  ('explore', 'system'),
  ('discover', 'system'),
  -- Brand
  ('rinkstop', 'brand'),
  ('hockey', 'brand'),
  ('ice', 'brand'),
  ('rink', 'brand'),
  ('puck', 'brand'),
  -- Account types
  ('team', 'account_type'),
  ('league', 'account_type'),
  ('player', 'account_type'),
  ('coach', 'account_type'),
  ('scout', 'account_type'),
  ('referee', 'account_type'),
  ('rink_operator', 'account_type'),
  ('league_admin', 'account_type'),
  ('team_admin', 'account_type'),
  ('business', 'account_type'),
  ('fan', 'account_type'),
  ('parent', 'account_type'),
  -- Future use
  ('stats', 'future_use'),
  ('scores', 'future_use'),
  ('news', 'future_use'),
  ('games', 'future_use'),
  ('schedule', 'future_use'),
  ('standings', 'future_use'),
  ('leaderboard', 'future_use'),
  ('rankings', 'future_use')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 3. Username change history (for 14-day cooldown)
-- =====================================================
CREATE TABLE IF NOT EXISTS username_changes (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  old_username TEXT,
  new_username TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookup index: most recent change per user
CREATE INDEX IF NOT EXISTS username_changes_user_recent 
  ON username_changes (user_id, changed_at DESC);

-- =====================================================
-- 4. Username holds (released slugs held for 14 days)
-- =====================================================
CREATE TABLE IF NOT EXISTS username_holds (
  slug TEXT PRIMARY KEY,
  previous_user_id TEXT NOT NULL,
  released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  available_at TIMESTAMPTZ NOT NULL
);

-- Cleanup index: for cron job that removes expired holds
CREATE INDEX IF NOT EXISTS username_holds_available_at 
  ON username_holds (available_at);

-- =====================================================
-- 5. Helper function: check if slug is in any unavailable state
-- =====================================================
CREATE OR REPLACE FUNCTION is_username_unavailable(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Check reserved_slugs
  IF EXISTS (SELECT 1 FROM reserved_slugs WHERE slug = LOWER(p_slug)) THEN
    RETURN TRUE;
  END IF;
  
  -- Check active holds (not yet expired)
  IF EXISTS (
    SELECT 1 FROM username_holds 
    WHERE slug = LOWER(p_slug) 
    AND available_at > NOW()
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check profiles (active username)
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE LOWER(username) = LOWER(p_slug)
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- =====================================================
-- 6. Comments for documentation
-- =====================================================
COMMENT ON COLUMN profiles.username IS 'Public-facing username. Used in profile URL: rinkstop.com/profile/{username}. Case-insensitive unique. Instagram rules: 1-30 chars, [a-z0-9._], no leading/trailing period, no consecutive periods, no all-numeric.';
COMMENT ON TABLE reserved_slugs IS 'Slugs that cannot be registered as usernames. Includes system routes, brand names, account types, and reserved-for-future-use words.';
COMMENT ON TABLE username_changes IS 'Audit log of username changes per user. Used to enforce 14-day cooldown between changes (Instagram rule).';
COMMENT ON TABLE username_holds IS 'Slugs that were released by their previous owner. Held for 14 days before becoming available for re-registration. Prevents username-squatting via swap.';

COMMIT;
