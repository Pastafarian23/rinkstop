-- 2026-06-15: Post review workflow — promote-with-edits + override + audit trail
-- See: Play 3 / Sub-task 2 (article review workflow)
-- Adds:
--   1. posts.cross_link_overrides (jsonb) — reviewer's manual fix for pipeline's team/league/player/country choice
--   2. posts.highlight_id_override (bigint) — reviewer's manual fix for highlight_id
--   3. posts.reviewed_by / reviewed_at — who approved and when
--   4. posts.last_edited_field — for QC queries ("which fields are being edited most")
--   5. post_review_edits table — append-only audit trail of every field change at review time

-- ============================================================
-- 1. New columns on posts
-- ============================================================

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS cross_link_overrides JSONB DEFAULT NULL;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS highlight_id_override BIGINT DEFAULT NULL;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) DEFAULT NULL;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS last_edited_field TEXT DEFAULT NULL;

COMMENT ON COLUMN posts.cross_link_overrides IS
  'Reviewer-set overrides for the pipeline''s cross-link picks. JSON shape: { team_home_id?, team_away_id?, league_id?, player_id?, country_slug? }. At read time, override is preferred over pipeline value.';
COMMENT ON COLUMN posts.highlight_id_override IS
  'Reviewer-set override for posts.highlight_id. NULL means use the pipeline value.';
COMMENT ON COLUMN posts.reviewed_by IS
  'auth.users.id of the admin who last promoted (or re-promoted) this post.';
COMMENT ON COLUMN posts.reviewed_at IS
  'Timestamp of the most recent review/promote action.';
COMMENT ON COLUMN posts.last_edited_field IS
  'Field name that was last edited at review (for QC: which fields humans touch most).';

-- Index for finding posts reviewed by a specific admin
CREATE INDEX IF NOT EXISTS idx_posts_reviewed_by ON posts(reviewed_by) WHERE reviewed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_reviewed_at ON posts(reviewed_at DESC NULLS LAST);

-- ============================================================
-- 2. post_review_edits — append-only audit trail
-- ============================================================

CREATE TABLE IF NOT EXISTS post_review_edits (
  id BIGSERIAL PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reviewed_by UUID NOT NULL REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT post_review_edits_field_check CHECK (
    field IN (
      'title',
      'subtitle',
      'body_markdown',
      'tags',
      'category',
      'cross_link_overrides',
      'highlight_id_override',
      'status'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_post_review_edits_post ON post_review_edits(post_id);
CREATE INDEX IF NOT EXISTS idx_post_review_edits_field ON post_review_edits(field);
CREATE INDEX IF NOT EXISTS idx_post_review_edits_reviewed_at ON post_review_edits(reviewed_at DESC);

COMMENT ON TABLE post_review_edits IS
  'Append-only audit trail of every field change made at review/promote time. Used for QC (which fields humans correct most) and to feed back into pipeline improvements.';
COMMENT ON COLUMN post_review_edits.field IS
  'Which field was edited. Constrained to the set of editable review fields.';
COMMENT ON COLUMN post_review_edits.old_value IS
  'JSON-encoded value before the edit. NULL if field was previously empty.';
COMMENT ON COLUMN post_review_edits.new_value IS
  'JSON-encoded value after the edit. NULL if field was cleared.';

-- ============================================================
-- 3. RLS — service role only for writes, no public read
-- ============================================================

ALTER TABLE post_review_edits ENABLE ROW LEVEL SECURITY;

-- No policies. Only service role bypasses RLS.
-- Admin UI uses supabaseAdmin (service role), so reads/writes work.
-- Anon/authenticated users cannot read or write this table.

-- ============================================================
-- 4. Helper view — post review summary (for QC dashboard later)
-- ============================================================

CREATE OR REPLACE VIEW post_review_summary AS
SELECT
  p.id AS post_id,
  p.slug,
  p.title,
  p.status,
  p.reviewed_by,
  p.reviewed_at,
  p.last_edited_field,
  COALESCE(edit_counts.edit_count, 0) AS total_edits,
  edit_counts.fields_touched
FROM posts p
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS edit_count,
    array_agg(DISTINCT pre.field) AS fields_touched
  FROM post_review_edits pre
  WHERE pre.post_id = p.id
) edit_counts ON true;

COMMENT ON VIEW post_review_summary IS
  'Per-post review/edit summary for QC. Joins posts with their edit history. Add to admin tools when needed.';

-- ============================================================
-- 5. Grant — explicit, even though we rely on service role
-- ============================================================

GRANT SELECT ON post_review_summary TO authenticated;
GRANT SELECT ON post_review_summary TO anon;
-- Writes still go through service role (RLS blocks authenticated/anon).
