-- ============================================================
-- SECURITY HARDENING: SECURITY DEFINER functions
--
-- Date: 2026-09-23
-- Trigger: Supabase advisor 'anon_security_definer_function_executable'
--
-- Strategy per function:
--   - Mutating functions: enforce auth.uid() check (allow service_role bypass)
--   - Read-only functions: keep as-is (SECURITY DEFINER is needed for RLS bypass on reads)
--   - Functions with no SET search_path: add it
--   - Revoke EXECUTE from anon on functions that should never be called by anon
--
-- ============================================================

BEGIN;

-- ============================================================
-- 1. regenerate_passport_qr_identifier — CRITICAL FIX
--
-- BEFORE: takes p_revoked_by as text param, NO auth check.
--   Anyone could call:
--     POST /rest/v1/rpc/regenerate_passport_qr_identifier
--     Body: { p_passport_id: 'any-uuid', p_reason: 'whatever', p_revoked_by: 'attacker' }
--   → Would rotate ANY user's passport QR identifier
--
-- AFTER: For non-service_role callers, p_revoked_by must match auth.uid() (or be NULL = self).
-- ============================================================

CREATE OR REPLACE FUNCTION public.regenerate_passport_qr_identifier(
  p_passport_id text,
  p_reason text,
  p_revoked_by text DEFAULT NULL
)
RETURNS public.passports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_old_qr uuid;
  v_new_qr uuid;
  v_returned public.passports;
  v_caller_id text;
  v_caller_role text;
  v_final_revoked_by text;
BEGIN
  v_caller_role := current_setting('role', true);
  IF v_caller_role = 'service_role' THEN
    v_final_revoked_by := COALESCE(p_revoked_by, 'service_role');
  ELSE
    v_caller_id := (auth.jwt() ->> 'sub')::text;
    IF v_caller_id IS NULL THEN
      RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
    END IF;
    IF p_revoked_by IS NOT NULL AND p_revoked_by <> v_caller_id THEN
      RAISE EXCEPTION 'caller_id_mismatch: cannot revoke on behalf of another user' USING ERRCODE = '42501';
    END IF;
    v_final_revoked_by := v_caller_id;
  END IF;

  SELECT qr_identifier INTO v_old_qr
  FROM public.passports
  WHERE passport_id = p_passport_id
  FOR UPDATE;
  IF v_old_qr IS NULL THEN
    RAISE EXCEPTION 'Passport % not found', p_passport_id;
  END IF;
  v_new_qr := gen_random_uuid();
  UPDATE public.passports
    SET qr_identifier = v_new_qr
    WHERE passport_id = p_passport_id
    RETURNING * INTO v_returned;
  INSERT INTO public.passport_qr_revocations
    (passport_id, old_qr_identifier, new_qr_identifier, reason, revoked_by)
  VALUES
    (p_passport_id, v_old_qr, v_new_qr, p_reason, v_final_revoked_by);
  RETURN v_returned;
END;
$function$;

-- ============================================================
-- 2. review_post_with_edits — CRITICAL FIX
--
-- BEFORE: takes p_reviewer_id as text, NO role check.
--   Anyone could "review" any post with any reviewer_id.
--
-- AFTER: p_reviewer_id must match auth.uid() OR caller must be service_role.
-- Function body preserved exactly (uses 'field' not 'field_name').
-- ============================================================

CREATE OR REPLACE FUNCTION public.review_post_with_edits(
  p_post_id uuid,
  p_reviewer_id text,
  p_changes jsonb,
  p_set_status text DEFAULT NULL
)
RETURNS public.posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_post posts;
  v_field TEXT;
  v_old_value JSONB;
  v_new_value JSONB;
  v_last_edited_field TEXT;
  v_new_next_check TIMESTAMPTZ;
  v_new_verified_at TIMESTAMPTZ;
  v_caller_id text;
  v_caller_role text;
BEGIN
  v_caller_role := current_setting('role', true);
  IF v_caller_role <> 'service_role' THEN
    v_caller_id := (auth.jwt() ->> 'sub')::text;
    IF v_caller_id IS NULL THEN
      RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
    END IF;
    IF p_reviewer_id <> v_caller_id THEN
      RAISE EXCEPTION 'caller_id_mismatch: cannot review on behalf of another user' USING ERRCODE = '42501';
    END IF;
  END IF;

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

      IF p_set_status = 'published' AND v_post.published_at IS NULL THEN
        v_post.published_at := now();
      END IF;

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
          v_new_next_check := NULL;
        ELSE
          NULL;
      END CASE;

      v_post.verified_at := v_new_verified_at;
      v_post.next_check_at := v_new_next_check;
      IF p_set_status IN ('published', 'verified', 'manually_approved') THEN
        v_post.verified_rounds := 0;
      END IF;
      IF p_set_status = 'archived' THEN
        v_post.rewrite_fails := 0;
      END IF;
    END IF;
  END IF;

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
$function$;

-- ============================================================
-- 3. cleanup_expired_share_tokens — service_role only
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_share_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
  v_caller_role text;
BEGIN
  v_caller_role := current_setting('role', true);
  IF v_caller_role <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_only' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.schedule_share_tokens
  WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_share_tokens() FROM anon, authenticated;

-- ============================================================
-- 4. mark_feed_post_read — require auth.uid() = p_user_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_feed_post_read(
  p_user_id text,
  p_post_table text,
  p_post_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_caller_id text;
  v_caller_role text;
BEGIN
  v_caller_role := current_setting('role', true);
  IF v_caller_role = 'service_role' THEN
    NULL;
  ELSE
    v_caller_id := (auth.jwt() ->> 'sub')::text;
    IF v_caller_id IS NULL THEN
      RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
    END IF;
    IF p_user_id <> v_caller_id THEN
      RAISE EXCEPTION 'caller_id_mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  INSERT INTO feed_reads (user_id, post_table, post_id)
  VALUES (p_user_id, p_post_table, p_post_id)
  ON CONFLICT (user_id, post_table, post_id)
  DO UPDATE SET read_at = now();
END;
$function$;

-- ============================================================
-- 5. count_unread_feed_posts — require auth.uid() = p_user_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.count_unread_feed_posts(
  p_user_id text,
  p_visible_post_ids jsonb
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  result INTEGER;
  v_caller_id text;
  v_caller_role text;
BEGIN
  v_caller_role := current_setting('role', true);
  IF v_caller_role = 'service_role' THEN
    NULL;
  ELSE
    v_caller_id := (auth.jwt() ->> 'sub')::text;
    IF v_caller_id IS NULL THEN
      RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
    END IF;
    IF p_user_id <> v_caller_id THEN
      RAISE EXCEPTION 'caller_id_mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;
  SELECT COUNT(*)::INTEGER INTO result
  FROM jsonb_to_recordset(p_visible_post_ids) AS v(post_table TEXT, id UUID)
  LEFT JOIN feed_reads r
    ON r.user_id = p_user_id
    AND r.post_table = v.post_table
    AND r.post_id = v.id
  WHERE r.id IS NULL;
  RETURN result;
END;
$function$;

-- ============================================================
-- 6. prevent_qr_identifier_update — TRIGGER function. Already checks caller.
-- Add SET search_path.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_qr_identifier_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_caller_is_privileged boolean := (
    pg_has_role(current_user, 'postgres',     'MEMBER')
    OR pg_has_role(current_user, 'supabase_admin', 'MEMBER')
    OR pg_has_role(current_user, 'service_role',  'MEMBER')
    OR pg_has_role(current_user, 'authenticator', 'MEMBER')
  );
BEGIN
  IF v_caller_is_privileged THEN
    RETURN NEW;
  END IF;
  IF OLD.qr_identifier IS DISTINCT FROM NEW.qr_identifier THEN
    RAISE EXCEPTION 'qr_identifier is immutable (use regenerate_passport_qr_identifier SECURITY DEFINER function)';
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- 7. is_rink_owner — add SET search_path
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_rink_owner(p_user_id text, p_rink_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.claims c
    WHERE c.user_id = p_user_id
    AND c.claim_type = 'rink'
    AND c.entity_id = p_rink_id::text
    AND c.status = 'approved'
  );
$function$;

COMMIT;
