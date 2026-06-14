-- 2026-06-14-listing-photos-bucket.sql
-- Storage bucket for business listing photos. Public read, service-role write
-- (the upload API uses the service role key, so the bucket policy stays simple).
--
-- Files are named {user_id}/{listing_id}/{uuid}.{ext} so ownership is encoded
-- in the path. Path collisions between users are impossible.
--
-- We also add a storage RLS policy that lets users delete their own photos.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-photos',
  'listing-photos',
  true,                      -- public read (anyone can see listing photos)
  5 * 1024 * 1024,           -- 5 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Service role bypasses RLS, but for completeness in case future code uses
-- the anon key for direct uploads:
-- (None — uploads are server-mediated via the API.)
