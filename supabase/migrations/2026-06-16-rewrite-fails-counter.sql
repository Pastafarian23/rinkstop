-- 2026-06-16: Add rewrite_fails counter for needs_rewrite → archived escalation
-- After 3 failed rewrite attempts (no source data, render failed, etc.),
-- the article moves from needs_rewrite → archived (terminal).

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS rewrite_fails INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN posts.rewrite_fails IS
  'Number of consecutive failed rewrite attempts. When it hits 3, the article is moved from needs_rewrite to archived (terminal). Resets to 0 on successful rewrite.';
