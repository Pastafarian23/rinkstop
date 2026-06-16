-- 2026-06-16: Extend review_post_with_edits RPC to accept the new 8-status enum
--
-- The state machine (migration 2026-06-16-article-state-machine.sql) added
-- 5 new statuses: needs_review, verified, needs_rewrite, rewriting, manually_approved.
-- The RPC originally accepted only published | archived | draft.
--
-- This migration expands the check from 3 to 8 statuses so admin actions
-- (Approve / Edit / Archive) can transition posts through the full workflow.
--
-- Side effects on publish:
--   - status='verified'    → verified_at = now(), next_check_at = now() + 7d
--   - status='published'   → published_at = now() (if not already set), next_check_at = now() + 7d
--   - status='manually_approved' → verified_at = now(), next_check_at = now() + 30d (slower)
--   - status='archived'    → terminal, next_check_at = NULL
--   - status='needs_review'|'needs_rewrite'|'rewriting'|'draft' → no time side effects

CREATE OR REPLACE FUNCTION review_post_with_edits(
  p_post_id UUID,
  p_reviewer_id TEXT,
  p_changes JSONB,
  p_set_status TEXT DEFAULT NULL
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
  v_new_next_check TIMESTAMPTZ;
  v_new_verified_at TIMESTAMPTZ;
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

      IF v_old_value IS NOT DISTINCT FROM v_new_value THEN
        CONTINUE;
      END IF;

      INSERT INTO post_review_edits (post_id, field, old_value, new_value, reviewed_by)
      VALUES (p_post_id, v_field, v_old_value, v_new_value, p_reviewer_id);

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
    -- 8-value state machine check (was 3 in the original 2026-06-15 migration)
    IF p_set_status NOT IN (
      'published', 'archived', 'draft',
      'needs_review', 'verified',
      'needs_rewrite', 'rewriting', 'manually_approved'
    ) THEN
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

      -- Side effect: set verified_at + next_check_at on re-check workflow
      -- Use a 7d default for verified/published, 30d for manually_approved
      -- (admin has signed off explicitly, so we trust it longer).
      v_new_next_check := NULL;
      v_new_verified_at := NULL;
      CASE p_set_status
        WHEN 'published' THEN
          v_new_verified_at := now();
          v_new_next_check := now() + INTERVAL '7 days';
        WHEN 'verified' THEN
          v_new_verified_at := now();
          v_new_next_check := now() + INTERVAL '7 days';
        WHEN 'manually_approved' THEN
          v_new_verified_at := now();
          v_new_next_check := now() + INTERVAL '30 days';
        WHEN 'archived' THEN
          -- Terminal — no further re-checks
          v_new_next_check := NULL;
        ELSE
          -- needs_review, needs_rewrite, rewriting, draft — no time side effects
          NULL;
      END CASE;

      v_post.verified_at := v_new_verified_at;
      v_post.next_check_at := v_new_next_check;
      -- When transitioning INTO verified/published, reset verified_rounds to 0
      -- (admin said "this is clean right now")
      IF p_set_status IN ('published', 'verified', 'manually_approved') THEN
        v_post.verified_rounds := 0;
      END IF;
      -- When transitioning to archived from needs_rewrite, reset rewrite_fails
      IF p_set_status = 'archived' THEN
        v_post.rewrite_fails := 0;
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

  IF v_last_edited_field IS NOT NULL THEN
    v_post.last_edited_field := v_last_edited_field;
  END IF;

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
    verified_at            = v_post.verified_at,
    verified_rounds        = v_post.verified_rounds,
    next_check_at          = v_post.next_check_at,
    rewrite_fails          = v_post.rewrite_fails,
    last_edited_field      = v_post.last_edited_field,
    updated_at             = v_post.updated_at
  WHERE id = p_post_id;

  RETURN v_post;
END;
$$;

COMMENT ON FUNCTION review_post_with_edits IS
  'Atomic "promote with edits": updates posts columns and writes the diff to post_review_edits in a single transaction. Status transitions can target any of the 8 workflow values (draft, needs_review, verified, published, needs_rewrite, rewriting, archived, manually_approved). Transitions to verified/published/manually_approved auto-set verified_at + next_check_at (7d for verified/published, 30d for manually_approved). Transitions to archived clear next_check_at.';

REVOKE ALL ON FUNCTION review_post_with_edits FROM PUBLIC;
GRANT EXECUTE ON FUNCTION review_post_with_edits(UUID, TEXT, JSONB, TEXT) TO service_role;
