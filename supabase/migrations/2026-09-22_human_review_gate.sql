-- Migration: human review gate for posts
-- Per Arnel 2026-09-22 (Open Protocol Gap 3):
--   - Articles publish automatically when audit pipeline passes
--   - Human review for unverifiable/failed content
--   - Reject is a new status, separate from draft
--   - Game-result recaps also re-audited post-publish
--
-- Additive only. Transaction-wrapped. Idempotent (IF NOT EXISTS).
-- Rollback: see 2026-09-22_human_review_gate.rollback.sql

BEGIN;

-- Add columns (no defaults on existing rows — they stay NULL until
-- something writes to them).
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS human_review_status TEXT DEFAULT 'pending';

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS review_note TEXT;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS last_audit_check_at TIMESTAMPTZ;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS last_audit_status TEXT;

-- CHECK constraints on the new columns. NULL is allowed so old rows
-- stay valid without backfill.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_human_review_status_check'
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT posts_human_review_status_check
        CHECK (human_review_status IS NULL OR human_review_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_last_audit_status_check'
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT posts_last_audit_status_check
        CHECK (last_audit_status IS NULL OR last_audit_status IN ('PASS_HIGH', 'PASS_SINGLE', 'PASS_WIKI', 'CANNOT_VERIFY', 'FAIL', 'FAIL_DISAGREE', 'FAIL_CONFIDENCE'));
  END IF;
END $$;

-- Indexes for the new admin queries.
CREATE INDEX IF NOT EXISTS idx_posts_review_queue
  ON posts (status, human_review_status, created_at)
  WHERE status = 'draft' AND human_review_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_posts_published_audit
  ON posts (last_audit_check_at NULLS FIRST, published_at)
  WHERE status = 'published';

-- Grandfather existing rows: align human_review_status with status.
-- Note: ALTER TABLE ... ADD COLUMN ... DEFAULT 'pending' applies the
-- default to all existing rows (Postgres behavior). So drafts already
-- have human_review_status='pending'. We just need to flip published
-- rows to 'approved' to keep the admin queue from showing every
-- existing published post.
UPDATE posts
  SET human_review_status = 'approved',
      reviewed_at = NOW(),
      reviewed_by = 'auto-grandfather@system'
  WHERE status = 'published';

COMMIT;
