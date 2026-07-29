-- ============================================================================
-- Profile Cover Image History (Phase 1b)
-- Date: 2026-07-29
-- Author: KiloClaw (per Arnel 2026-07-29 directive: "save old images for historical
-- reference like profile picture; user can delete them when viewing old pictures,
-- similar to Facebook")
-- ============================================================================
-- Tracks every change to a user's cover image so the public profile page can
-- show a "Cover history" strip (Facebook-style, mirroring the photo history
-- pattern from profile_photo_history).
--
-- Why this exists:
--   - The current cover image lives on profiles.cover_image_url, but we want
--     to show previous choices on the profile page (per Arnel directive).
--   - Without a history table, RinkStop has no way to fetch old versions after
--     the user picks a new one (the API route first inserts a new history row,
--     then updates profiles.cover_image_url).
--   - This also gives RinkStop its own backup of cover image URLs in case
--     Supabase Storage ever prunes objects.
--
-- Lifecycle:
--   - INSERT: when a new cover image is uploaded (BEFORE updating
--     profiles.cover_image_url). Source = 'manual'.
--   - UPDATE: removed_at = now() when the user deletes an entry from the
--     cover history strip (the storage object is deleted by the API route in
--     the same call).
--
-- The "current" cover image is the row with the latest set_at where
-- removed_at IS NULL. There is at most one such row per user at a time, but
-- we don't enforce that with a partial unique index because it would block
-- us from inserting a new row before the old one is marked replaced_at in
-- the same transaction. Instead, the application is responsible for keeping
-- the invariant (the upload API inserts the new row, then UPDATEs the
-- previous "current" row's replaced_at in the same transaction).
--
-- Visibility:
--   - SELECT: public (the cover history is shown on /profile/[slug] for any
--     visitor — matches Facebook behavior Arnel asked for).
--   - INSERT/UPDATE/DELETE: only via service role (the API routes use
--     supabaseAdmin on the server). End users cannot mutate this table
--     directly.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile_cover_image_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,  -- Clerk user id (e.g. user_3Etd1E64...)
  url             TEXT NOT NULL,  -- Public URL in profile_covers bucket
  position        TEXT NOT NULL DEFAULT 'center'
    CHECK (position IN ('center', 'top', 'bottom')),
  set_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  replaced_at     TIMESTAMPTZ,    -- NULL = still current
  removed_at      TIMESTAMPTZ,    -- NULL = still set (even if replaced)
  source          TEXT NOT NULL DEFAULT 'manual'  -- 'manual' | 'admin_reset'
    CHECK (source IN ('manual', 'admin_reset'))
);

-- Fast lookup of "current cover" for a user
CREATE INDEX IF NOT EXISTS idx_profile_cover_image_history_user_current
  ON profile_cover_image_history (user_id, set_at DESC)
  WHERE removed_at IS NULL;

-- Fast lookup of "all covers for a user, newest first" (for the public
-- history strip)
CREATE INDEX IF NOT EXISTS idx_profile_cover_image_history_user_set_at
  ON profile_cover_image_history (user_id, set_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE profile_cover_image_history ENABLE ROW LEVEL SECURITY;

-- Public SELECT: anyone can read cover history (it's shown on the public
-- /profile/[slug] page)
DROP POLICY IF EXISTS cover_image_history_public_select ON profile_cover_image_history;
CREATE POLICY cover_image_history_public_select ON profile_cover_image_history
  FOR SELECT
  USING (true);

-- No public INSERT/UPDATE/DELETE. All mutations happen server-side via
-- supabaseAdmin (service role bypasses RLS). The user's identity is
-- verified by Clerk auth() in the API route before the server-side write.
DROP POLICY IF EXISTS cover_image_history_no_public_write ON profile_cover_image_history;
CREATE POLICY cover_image_history_no_public_write ON profile_cover_image_history
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
