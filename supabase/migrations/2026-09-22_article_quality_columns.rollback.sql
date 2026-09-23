-- Rollback for 2026-09-22_article_quality_columns
BEGIN;
DROP INDEX IF EXISTS idx_posts_low_quality;
ALTER TABLE posts DROP COLUMN IF EXISTS regenerated_at;
ALTER TABLE posts DROP COLUMN IF EXISTS generation_method;
ALTER TABLE posts DROP COLUMN IF EXISTS quality_issues;
ALTER TABLE posts DROP COLUMN IF EXISTS quality_score;
COMMIT;
