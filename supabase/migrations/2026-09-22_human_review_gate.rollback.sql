-- Rollback for 2026-09-22_human_review_gate
-- Reverses all changes from the migration. Drops the 6 new columns,
-- 2 indexes, and 2 CHECK constraints. Does NOT touch any other table
-- or any existing data.

BEGIN;

DROP INDEX IF EXISTS idx_posts_review_queue;
DROP INDEX IF EXISTS idx_posts_published_audit;

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_human_review_status_check;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_last_audit_status_check;

ALTER TABLE posts DROP COLUMN IF EXISTS last_audit_status;
ALTER TABLE posts DROP COLUMN IF EXISTS last_audit_check_at;
ALTER TABLE posts DROP COLUMN IF EXISTS review_note;
ALTER TABLE posts DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE posts DROP COLUMN IF EXISTS reviewed_at;
ALTER TABLE posts DROP COLUMN IF EXISTS human_review_status;

COMMIT;
