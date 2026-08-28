-- 2026-08-28_image_only_posts.sql
-- Allow image-only posts (no text body required when media_url is set).
--
-- Before this migration:
--   body text NOT NULL CHECK (char_length(trim(body)) between 1 and 1000)
--   → rejected empty body even when media_url was set.
--
-- After:
--   body can be empty ONLY when media_url is set.
--   body still capped at 1000 chars when non-empty.
--   media_url is still optional (you can have a text-only post).
--
-- Idempotent: drops the old constraint if it exists, then adds the
-- new one. Safe to re-run.

alter table profile_posts
  drop constraint if exists profile_posts_body_check;

-- New constraint: body is required (1–1000 chars) UNLESS media_url is set.
-- If both are empty, that's still a 400 (caught by the API route).
-- If both are set, the text must be valid (capped at 1000).
alter table profile_posts
  add constraint profile_posts_body_or_image_check
  check (
    (media_url is not null and char_length(trim(body)) <= 1000)
    or
    (media_url is null and char_length(trim(body)) between 1 and 1000)
  );

comment on constraint profile_posts_body_or_image_check on profile_posts is
  'Body required (1–1000 chars) for text-only posts. Body optional (≤1000 chars) when media_url is set.';
