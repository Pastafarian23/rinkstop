-- ============================================================
-- Profile Photo History (Day 7, Arnel 2026-06-23 04:47 CDT)
-- ============================================================
-- Tracks every change to a user's profile photo so the public
-- profile page can show a "Photo history" strip (Facebook-style).
--
-- Why this exists:
--   - Clerk is the source of truth for the *current* photo, but
--     Clerk's image version history is not queryable from the API.
--   - Without this table, RinkStop has no way to display old photos
--     on the public profile page.
--   - This also gives RinkStop its own backup of photo URLs in case
--     Clerk's image service ever prunes a version.
--
-- Lifecycle:
--   - INSERT: when a new photo is saved (via ChangePhotoButton or the
--     Clerk webhook)
--   - UPDATE: replaced_at = now() when a NEW row supersedes this one
--   - UPDATE: removed_at = now() when the user removes their photo
--     (reverts to initials)
--
-- The "current" photo is the row with the latest set_at where
-- removed_at IS NULL. There is at most one such row per user at a
-- time, but we don't enforce that with a partial unique index because
-- it would block us from inserting a new row before the old one is
-- marked replaced_at in the same transaction. Instead, the
-- application is responsible for keeping the invariant.
--
-- Visibility:
--   - SELECT: public (the photo history is shown on /profile/[slug]
--     for any visitor — matches Facebook's behavior Arnel asked for
--     2026-06-23 05:13 CDT)
--   - INSERT/UPDATE/DELETE: only via service role (the ChangePhotoButton
--     uses supabaseAdmin on the server; the Clerk webhook uses
--     supabaseAdmin). End users cannot mutate this table directly.

-- ----------------------------------------------------------
-- Schema
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile_photo_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,  -- Clerk user id (e.g. user_3Etd1E64...)
  clerk_image_id  TEXT,           -- Clerk's internal image id (for dedup)
  url             TEXT,           -- The CDN URL Clerk served
  set_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  replaced_at     TIMESTAMPTZ,    -- NULL = still current
  removed_at      TIMESTAMPTZ,    -- NULL = still set (even if replaced)
  source          TEXT NOT NULL DEFAULT 'manual'  -- 'manual' | 'clerk_webhook' | 'reset'
    CHECK (source IN ('manual', 'clerk_webhook', 'reset'))
);

-- Fast lookup of "current photo" for a user
CREATE INDEX IF NOT EXISTS idx_profile_photo_history_user_current
  ON profile_photo_history (user_id, set_at DESC)
  WHERE removed_at IS NULL;

-- Fast lookup of "all photos for a user, newest first" (for the public
-- history strip)
CREATE INDEX IF NOT EXISTS idx_profile_photo_history_user_set_at
  ON profile_photo_history (user_id, set_at DESC);

-- ----------------------------------------------------------
-- RLS
-- ----------------------------------------------------------
ALTER TABLE profile_photo_history ENABLE ROW LEVEL SECURITY;

-- Public SELECT: anyone can read photo history (it's shown on the
-- public /profile/[slug] page)
DROP POLICY IF EXISTS photo_history_public_select ON profile_photo_history;
CREATE POLICY photo_history_public_select ON profile_photo_history
  FOR SELECT
  USING (true);

-- No public INSERT/UPDATE/DELETE. All mutations happen server-side
-- via supabaseAdmin (service role bypasses RLS).
DROP POLICY IF EXISTS photo_history_no_public_write ON profile_photo_history;
CREATE POLICY photo_history_no_public_write ON profile_photo_history
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
