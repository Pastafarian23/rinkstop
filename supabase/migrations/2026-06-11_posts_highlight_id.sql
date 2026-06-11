-- 2026-06-11: Add highlight_id to posts for article-from-highlight pipeline
--
-- Each article generated from a video highlight gets a foreign key back to
-- the source row in highlight_backups. This lets the /api/highlights popup
-- show a snippet of the article body, and lets the /api/blog/posts route
-- resolve a highlight_id → article for "View full article" links.
--
-- ON DELETE SET NULL: if the highlight is purged (e.g. broken video URL
-- cleanup), the article remains, just with no source link.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS highlight_id BIGINT
  REFERENCES public.highlight_backups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_highlight_id_idx
  ON public.posts(highlight_id)
  WHERE highlight_id IS NOT NULL;
