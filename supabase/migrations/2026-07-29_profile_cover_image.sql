-- ============================================================================
-- Profile Cover Image (Phase 1b)
-- Date: 2026-07-29
-- Author: KiloClaw
-- ============================================================================
-- Adds a customizable cover image to public.profiles. The user picks an
-- image from their device, we upload it to the profile_covers storage
-- bucket, and store the public URL + a focal-point hint on the profile row.
--
-- Lifecycle:
--   - INSERT: when the user picks an image in CoverImageEditor (uploads via
--     API route to profile_covers/{userId}/{timestamp}.{ext})
--   - UPDATE: when the user picks a new image (old row is overwritten; the
--     storage object is NOT deleted automatically — separate cleanup job)
--   - UPDATE: when the user removes their cover (column set back to NULL,
--     storage object deleted by API route)
--   - UPDATE: when the user repositions the focal point (cover_image_position)
--
-- Why a separate column (not avatar_url):
--   - avatars are square thumbnails (Clerk's responsibility)
--   - cover images are wide banners shown above the profile content
--   - different aspect ratios, different storage paths, different UX
--
-- Why no history table (unlike profile_photo_history):
--   - photo history was added because Clerk's image versioning isn't
--     queryable and Arnel wanted a "photo history strip" on the profile
--   - cover images don't have that reusable shape — the current one is
--     what shows. If a "cover history" feature is added later, we add
--     profile_cover_image_history then.
--   - keeps Phase 1 scope tight: schema + API + UI + integration, no extras.
--
-- Why cover_image_position = text (not numeric x/y):
--   - the UI is a simple 3-option picker (center/top/bottom) per Arnel's
--     design priority. CSS object-position takes 'center', 'top', 'bottom'
--     directly. Numeric coords would be over-engineered for v1.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Columns on public.profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_image_url      TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_position TEXT NOT NULL DEFAULT 'center'
    CHECK (cover_image_position IN ('center', 'top', 'bottom'));

COMMENT ON COLUMN public.profiles.cover_image_url      IS 'Public URL of the user''s cover image in the profile_covers bucket. NULL = use the default gradient banner.';
COMMENT ON COLUMN public.profiles.cover_image_position IS 'CSS object-position hint for the cover image. One of: center, top, bottom.';

-- ---------------------------------------------------------------------------
-- 2. Storage bucket: profile_covers
-- ---------------------------------------------------------------------------
-- Public read, service-role write (uploads go through the API route which
-- uses supabaseAdmin). 5 MB cap, same allowed mime types as listing-photos.
-- Files are named {user_id}/{timestamp}.{ext} so ownership is encoded in the
-- path. Path collisions between users are impossible.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile_covers',
  'profile_covers',
  true,                      -- public read (anyone can see cover images)
  5 * 1024 * 1024,           -- 5 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Storage RLS
-- ---------------------------------------------------------------------------
-- Public SELECT is already granted by `public = true` on the bucket, but we
-- add explicit storage.objects policies for completeness and so the docs
-- surface the access model.
--
-- Writes are server-mediated via the API route using the service role key,
-- which bypasses RLS. We do NOT add a public write policy — that would let
-- any authenticated user upload to any path, which is the wrong security
-- posture even if the API also validates ownership.

DROP POLICY IF EXISTS profile_covers_public_select ON storage.objects;
CREATE POLICY profile_covers_public_select ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile_covers');

-- No INSERT/UPDATE/DELETE policy for authenticated/anon. Service role only.
-- (Service role bypasses RLS, so the API route can write without one.)

-- ---------------------------------------------------------------------------
-- 4. profiles.cover_image_url RLS
-- ---------------------------------------------------------------------------
-- The column rides on public.profiles, which already has a public SELECT
-- policy (profiles_select_authenticated — see 2026-06-16-critical-rls-fixes.sql
-- and the inferred baseline in 2026-07-16_profiles_baseline.sql). So the
-- new columns are publicly readable by default.
--
-- Writes happen via the API route using supabaseAdmin, which bypasses RLS.
-- We do NOT add a profiles-column UPDATE policy for cover_image_url — the
-- existing profiles_upsert_own policy may or may not cover it depending on
-- the WITH CHECK expression, and adding a separate policy is cleaner than
-- relying on the existing one. Confirm in the API route that the route
-- uses supabaseAdmin (service role) for the update.
-- ============================================================================
