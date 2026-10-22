-- 2026-10-22_post_media_bucket_video.sql
-- Allow video in the post-media bucket and raise its size limit to 100MB.
--
-- ROOT CAUSE (Arnel-reported 2026-10-22, "Failed (500)" on Share Media
-- video upload):
-- The `post-media` bucket was created image-only:
--     allowed_mime_types = {image/jpeg, image/png, image/webp, image/gif}
--     file_size_limit    = 10MB
-- Supabase Storage therefore rejected every video at the storage layer
-- with "mime type video/mp4 is not supported". The upload died BEFORE the
-- profile_posts insert ever ran, so the API returned a bare 500 and the
-- composer rendered "Failed (500)" with no diagnostic.
--
-- The 10MB limit was a second, independent mismatch: the route's own
-- MAX_VIDEO_BYTES allows 100MB, so even a MIME-permitted video between
-- 10MB and 100MB would have failed on size.
--
-- The Share Media UI shipped 2026-10-16 (commit 72f0233b) but the bucket
-- was never configured for video — the same class of bug as the
-- unapplied profile_posts migration earlier the same day: the app code
-- and the infra behind it shipped independently, and neither validated
-- the other.
--
-- Idempotent.

update storage.buckets
   set allowed_mime_types = array[
         'image/jpeg',
         'image/png',
         'image/webp',
         'image/gif',
         'video/mp4',
         'video/quicktime',
         'video/webm'
       ],
       file_size_limit = 104857600, -- 100MB, matches MAX_VIDEO_BYTES
       updated_at = now()
 where name = 'post-media';

-- Storage metadata isn't served through PostgREST, but a reload is
-- harmless and keeps the change discoverable.
notify pgrst, 'reload schema';