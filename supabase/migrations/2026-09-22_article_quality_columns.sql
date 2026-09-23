-- Migration: article quality tracking columns
-- Per Arnel 2026-09-22 21:37 CDT: must rerun all articles for QC,
-- with safeguards to prevent AI slop from shipping again.
--
-- Adds quality metadata columns + an index for finding low-quality
-- articles. Additive only, idempotent.

BEGIN;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS quality_score INTEGER
    CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100));

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS quality_issues TEXT[];

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS generation_method TEXT
    CHECK (generation_method IS NULL OR generation_method IN ('llm-v1', 'llm-v2', 'manual-edit', 'web-recap'));

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS regenerated_at TIMESTAMPTZ;

-- Index for finding low-quality articles fast.
CREATE INDEX IF NOT EXISTS idx_posts_low_quality
  ON posts (quality_score NULLS FIRST, status)
  WHERE status = 'published';

COMMIT;
