-- 2026-10-13: Add X (Twitter) auto-posting columns to posts table
--
-- Arnel directive 2026-10-13: auto-post published highlight articles to X
-- with the highlight image, article link, league+team hashtags, and a
-- "Full recap and highlights" CTA. Stop sending to Telegram.
--
-- These three columns are nullable; existing posts default to x_posted=false,
-- so the script only acts on posts that have not been posted yet. To avoid
-- spamming the timeline with old content, the script ALSO filters on
-- created_at > now() - interval 'X days' (set by the script, not the DB).
--
-- Why a separate column instead of a join table:
--   - One X post per published post is the rule
--   - Storing x_post_id lets us link back to the tweet for engagement tracking
--   - x_posted_at is the "no double-post" gate, not the engagement window
--
-- Idempotent: safe to re-run.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS x_posted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS x_post_id text,
  ADD COLUMN IF NOT EXISTS x_posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS x_post_error text;

-- Index for the cron query: "find published posts that haven't been X-posted yet"
CREATE INDEX IF NOT EXISTS idx_posts_x_unposted
  ON public.posts (created_at)
  WHERE status = 'published' AND x_posted = false;

-- Comment so future agents know what these are for
COMMENT ON COLUMN public.posts.x_posted IS 'True once a tweet has been posted for this article. Gate for the social auto-poster.';
COMMENT ON COLUMN public.posts.x_post_id IS 'X post id (numeric string) returned by xurl, used for engagement tracking.';
COMMENT ON COLUMN public.posts.x_posted_at IS 'When the tweet was posted. UTC.';
COMMENT ON COLUMN public.posts.x_post_error IS 'Last error message from xurl. NULL when posted successfully. Lets us surface stuck posts in the audit.';
