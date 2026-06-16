-- 2026-06-16: Article workflow state machine (Phase 1: schema + backfill)
--
-- Replaces the 3-value status enum (draft / published / archived) with an 8-value
-- workflow that supports progression, review checkpoints, and verification history.
--
-- New statuses:
--   draft             — just generated, never verified
--   needs_review      — ambiguous: source data missing/contradictory, awaiting human
--   verified          — clean, all claims match source, ready to publish
--   published         — live on rinkstop.com
--   needs_rewrite     — failed verification, queued for rewrite-architect
--   rewriting         — rewrite-architect is currently working on it
--   archived          — terminal: cannot be auto-rewritten
--   manually_approved — human marked it OK despite verification flag (e.g. opinion)
--
-- New columns:
--   verified_at           — last time audit passed
--   verified_rounds       — consecutive clean re-checks
--   last_issue_summary    — why it failed last time (for debugging)
--   next_check_at         — when to re-check next (7d/14d/30d/90d backoff)
--   source_data_status    — has_source | no_source | source_conflict
--
-- The existing CHECK constraint on status is updated to allow the new values.
-- Old values: 'draft' | 'published' | 'archived' — all remain valid, so backfill is a no-op
-- for status. Only the new columns need population.

-- =====================================================================
-- 1. Drop the old CHECK constraint on status (if it exists)
-- =====================================================================

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'posts'::regclass
    AND pg_get_constraintdef(oid) LIKE '%status%'
    AND contype = 'c'
    AND conname NOT LIKE '%reviewed%';
  
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE posts DROP CONSTRAINT %I', cname);
    RAISE NOTICE 'Dropped status CHECK constraint: %', cname;
  END IF;
END $$;

-- =====================================================================
-- 2. Add the new CHECK constraint with all 8 values
-- =====================================================================

ALTER TABLE posts
  ADD CONSTRAINT posts_status_check
  CHECK (status IN (
    'draft',
    'needs_review',
    'verified',
    'published',
    'needs_rewrite',
    'rewriting',
    'archived',
    'manually_approved'
  ));

-- =====================================================================
-- 3. Add the 5 new columns
-- =====================================================================

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_rounds INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_issue_summary TEXT,
  ADD COLUMN IF NOT EXISTS next_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_data_status TEXT
    CHECK (source_data_status IS NULL OR source_data_status IN ('has_source', 'no_source', 'source_conflict'));

-- =====================================================================
-- 4. Backfill existing 722 posts
-- =====================================================================

-- For published: set verified_at to published_at (best guess), next_check_at = now() + 7d
UPDATE posts
SET
  verified_at = COALESCE(published_at, created_at),
  verified_rounds = 0,
  next_check_at = COALESCE(published_at, created_at) + INTERVAL '7 days'
WHERE status = 'published'
  AND verified_at IS NULL;

-- For archived: set verified_at to updated_at (last touched), next_check_at = NULL (terminal)
UPDATE posts
SET
  verified_at = COALESCE(updated_at, created_at),
  verified_rounds = 0,
  next_check_at = NULL
WHERE status = 'archived'
  AND verified_at IS NULL;

-- For draft: set verified_at to NULL, next_check_at = NULL (will be set on first verify)
UPDATE posts
SET
  verified_at = NULL,
  verified_rounds = 0,
  next_check_at = NULL
WHERE status = 'draft'
  AND verified_at IS NULL;

-- =====================================================================
-- 5. Index for the new query pattern (find articles due for re-check)
-- =====================================================================

CREATE INDEX IF NOT EXISTS posts_published_due_for_check_idx
  ON posts (next_check_at)
  WHERE status = 'published' AND next_check_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS posts_needs_review_idx
  ON posts (created_at DESC)
  WHERE status = 'needs_review';

CREATE INDEX IF NOT EXISTS posts_needs_rewrite_idx
  ON posts (created_at ASC)
  WHERE status = 'needs_rewrite';

-- =====================================================================
-- 6. Document the new workflow
-- =====================================================================

COMMENT ON COLUMN posts.status IS
  'Article workflow state. Values:
   draft (just generated, never verified),
   needs_review (ambiguous, awaiting human),
   verified (clean, ready to publish),
   published (live, eligible for re-check after next_check_at),
   needs_rewrite (failed verification, queued for rewrite),
   rewriting (rewrite-architect working on it),
   archived (terminal: cannot be auto-rewritten),
   manually_approved (human override, slower re-check)';

COMMENT ON COLUMN posts.verified_at IS
  'Last time this article passed fact-audit (NULL = never passed)';

COMMENT ON COLUMN posts.verified_rounds IS
  'Number of consecutive clean re-checks. Used to back off re-check frequency: 0=7d, 1=14d, 2=30d, 3+=90d';

COMMENT ON COLUMN posts.next_check_at IS
  'When to next re-verify this article. NULL = never (draft/archived/rewriting)';

COMMENT ON COLUMN posts.source_data_status IS
  'Snapshot of source data availability at last verification: has_source | no_source | source_conflict';

COMMENT ON COLUMN posts.last_issue_summary IS
  'Human-readable reason this article failed its last verification. Empty if it passed.';
