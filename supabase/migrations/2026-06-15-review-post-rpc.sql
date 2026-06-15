-- 2026-06-15: review_post_with_edits RPC (v2 — TEXT reviewer_id, TEXT changes payload)
-- Atomic "promote with edits" — updates posts columns AND writes diff rows
-- to post_review_edits in a single transaction.
--
-- Idempotent: drops and recreates the function.
--
-- Used by: PATCH /api/admin/articles/[id] when the request includes
-- status='published' or any of the override fields.
--
-- The function only enqueues a small, audited set of columns. The api
-- caller (TypeScript) is the only source of keys; unknown keys are rejected.

CREATE OR REPLACE FUNCTION review_post_with_edits(
  p_post_id UUID,
  p_reviewer_id TEXT,    -- Clerk user id (e.g. user_3Etd1E...)
  p_changes JSONB,       -- { field_name: new_value, ... } only fields that changed
  p_set_status TEXT DEFAULT NULL  -- 'published' | 'archived' | 'draft' | NULL for no status change
)
RETURNS posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post posts;
  v_field TEXT;
  v_old_value JSONB;
  v_new_value JSONB;
  v_last_edited_field TEXT;
BEGIN
  -- Lock the row
  SELECT * INTO v_post FROM posts WHERE id = p_post_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'article_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Apply per-field changes and record the diff
  IF p_changes IS NOT NULL THEN
    FOR v_field IN SELECT jsonb_object_keys(p_changes)
    LOOP
      v_new_value := p_changes -> v_field;

      -- Capture old value (JSON-encoded) and verify this field is editable
      CASE v_field
        WHEN 'title'              THEN v_old_value := to_jsonb(v_post.title);
        WHEN 'subtitle'           THEN v_old_value := to_jsonb(v_post.subtitle);
        WHEN 'content'            THEN v_old_value := to_jsonb(v_post.content);
        WHEN 'tags'               THEN v_old_value := to_jsonb(v_post.tags);
        WHEN 'category'           THEN v_old_value := to_jsonb(v_post.category);
        WHEN 'cross_link_overrides' THEN v_old_value := to_jsonb(v_post.cross_link_overrides);
        WHEN 'highlight_id_override' THEN v_old_value := to_jsonb(v_post.highlight_id_override);
        ELSE
          RAISE EXCEPTION 'field_not_editable: %', v_field USING ERRCODE = 'P0001';
      END CASE;

      -- Skip if no actual change
      IF v_old_value IS NOT DISTINCT FROM v_new_value THEN
        CONTINUE;
      END IF;

      -- Record the diff row
      INSERT INTO post_review_edits (post_id, field, old_value, new_value, reviewed_by)
      VALUES (p_post_id, v_field, v_old_value, v_new_value, p_reviewer_id);

      -- Track the "most important" field edited. Priority order (lowest index = highest priority):
      -- content > title > cross_link_overrides > highlight_id_override > tags > category > subtitle.
      -- We only overwrite if this field has a strictly higher priority than the current winner.
      v_last_edited_field := COALESCE(
        (SELECT f FROM unnest(ARRAY['content','title','cross_link_overrides','highlight_id_override','tags','category','subtitle']) AS f
         WHERE f = v_field
            OR f = v_last_edited_field
         ORDER BY array_position(ARRAY['content','title','cross_link_overrides','highlight_id_override','tags','category','subtitle'], f)
         LIMIT 1),
        v_last_edited_field
      );
    END LOOP;
  END IF;

  -- Status change (if any)
  IF p_set_status IS NOT NULL THEN
    IF p_set_status NOT IN ('published', 'archived', 'draft') THEN
      RAISE EXCEPTION 'invalid_status: %', p_set_status USING ERRCODE = 'P0001';
    END IF;

    IF v_post.status IS DISTINCT FROM p_set_status THEN
      INSERT INTO post_review_edits (post_id, field, old_value, new_value, reviewed_by)
      VALUES (p_post_id, 'status', to_jsonb(v_post.status), to_jsonb(p_set_status), p_reviewer_id);

      v_post.status := p_set_status;
      v_post.reviewed_by := p_reviewer_id;
      v_post.reviewed_at := now();
      v_post.updated_at := now();

      -- Side effect: set published_at on first publish
      IF p_set_status = 'published' AND v_post.published_at IS NULL THEN
        v_post.published_at := now();
      END IF;
    END IF;
  END IF;

  -- Apply the field changes directly to v_post (in-memory)
  IF p_changes IS NOT NULL THEN
    IF p_changes ? 'title' AND (p_changes->>'title') IS DISTINCT FROM v_post.title THEN
      v_post.title := p_changes->>'title';
      v_post.reviewed_by := p_reviewer_id;
      v_post.reviewed_at := now();
      v_post.updated_at := now();
    END IF;
    IF p_changes ? 'subtitle' AND (p_changes->>'subtitle') IS DISTINCT FROM COALESCE(v_post.subtitle, '') THEN
      v_post.subtitle := p_changes->>'subtitle';
      v_post.reviewed_by := p_reviewer_id;
      v_post.reviewed_at := now();
      v_post.updated_at := now();
    END IF;
    IF p_changes ? 'content' AND (p_changes->>'content') IS DISTINCT FROM v_post.content THEN
      v_post.content := p_changes->>'content';
      v_post.reviewed_by := p_reviewer_id;
      v_post.reviewed_at := now();
      v_post.updated_at := now();
    END IF;
    IF p_changes ? 'category' AND (p_changes->>'category') IS DISTINCT FROM COALESCE(v_post.category, '') THEN
      v_post.category := p_changes->>'category';
      v_post.reviewed_by := p_reviewer_id;
      v_post.reviewed_at := now();
      v_post.updated_at := now();
    END IF;
    IF p_changes ? 'tags' THEN
      v_post.tags := (SELECT array_agg(value::text) FROM jsonb_array_elements_text(p_changes->'tags'));
      v_post.reviewed_by := p_reviewer_id;
      v_post.reviewed_at := now();
      v_post.updated_at := now();
    END IF;
    IF p_changes ? 'cross_link_overrides' THEN
      v_post.cross_link_overrides := p_changes->'cross_link_overrides';
      v_post.reviewed_by := p_reviewer_id;
      v_post.reviewed_at := now();
      v_post.updated_at := now();
    END IF;
    IF p_changes ? 'highlight_id_override' THEN
      IF jsonb_typeof(p_changes->'highlight_id_override') = 'null' THEN
        v_post.highlight_id_override := NULL;
      ELSE
        v_post.highlight_id_override := (p_changes->>'highlight_id_override')::bigint;
      END IF;
      v_post.reviewed_by := p_reviewer_id;
      v_post.reviewed_at := now();
      v_post.updated_at := now();
    END IF;
  END IF;

  -- Set last_edited_field if any content-changing field was touched
  IF v_last_edited_field IS NOT NULL THEN
    v_post.last_edited_field := v_last_edited_field;
  END IF;

  -- Persist the in-memory changes
  UPDATE posts SET
    title                  = v_post.title,
    subtitle               = v_post.subtitle,
    content                = v_post.content,
    category               = v_post.category,
    tags                   = v_post.tags,
    status                 = v_post.status,
    cross_link_overrides   = v_post.cross_link_overrides,
    highlight_id_override  = v_post.highlight_id_override,
    reviewed_by            = v_post.reviewed_by,
    reviewed_at            = v_post.reviewed_at,
    published_at           = v_post.published_at,
    last_edited_field      = v_post.last_edited_field,
    updated_at             = v_post.updated_at
  WHERE id = p_post_id;

  RETURN v_post;
END;
$$;

COMMENT ON FUNCTION review_post_with_edits IS
  'Atomic "promote with edits": updates posts columns and writes the diff to post_review_edits in a single transaction. Used by PATCH /api/admin/articles/[id] when the review workflow is in play. Only the audited fields (title, subtitle, content, tags, category, cross_link_overrides, highlight_id_override, status) can be set through this function.';

-- Grant execute to service role only
REVOKE ALL ON FUNCTION review_post_with_edits FROM PUBLIC;
GRANT EXECUTE ON FUNCTION review_post_with_edits(UUID, TEXT, JSONB, TEXT) TO service_role;

-- Recreate post_review_summary view (was dropped in fix-userid-types migration)
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
  'Per-post review/edit summary for QC. Joins posts with their edit history.';

GRANT SELECT ON post_review_summary TO authenticated;
GRANT SELECT ON post_review_summary TO anon;
