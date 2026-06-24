-- 2026-06-25: Piece #1 Commit A — Reserved-slug guard for create_team_workspace
-- Triggered by: Arnel's "let's implement piece #1" instruction on 2026-06-24
-- Branch: recovery/day6-rebuild
-- Prep doc: docs/piece-1-prep-team-profile-page.md
--
-- Purpose: Block team slugs that would shadow existing RinkStop routes
-- (admin, login, dashboard, api, etc). The reserved_slugs table already has
-- 71 entries (verified 2026-06-24) — this migration only updates the
-- create_team_workspace SQL function to consult that table.
--
-- Scope:
--   - ONE function modified: create_team_workspace(...)
--   - ONE new check added: if proposed slug is in reserved_slugs, return
--     error: 'slug_reserved' with a clear message.
--   - No table changes, no RLS changes, no policy changes.
--   - No data migration. Existing teams (slug='long') are unaffected because
--     'long' is not in reserved_slugs.
--
-- Risk profile:
--   - Purely additive. If the new check fails, the function returns a clean
--     error — no DB write happens.
--   - The check uses LOWER(p_slug) to match how reserved_slugs is keyed
--     (all-lowercase per the verified data).
--   - No other code paths are modified. NewTeamForm.tsx and any other
--     caller of create_team_workspace will surface the new error message
--     naturally via the existing error-display path.
--
-- Rollback:
--   CREATE OR REPLACE FUNCTION create_team_workspace(...) -- revert
--   to the version in 2026-06-18_team_workspace_v2.sql.

CREATE OR REPLACE FUNCTION create_team_workspace(
  p_name        TEXT,
  p_slug        TEXT,
  p_country     CHAR(2) DEFAULT NULL,
  p_age_cat     TEXT    DEFAULT 'youth',
  p_rink_id     UUID    DEFAULT NULL,
  p_short_name  TEXT    DEFAULT NULL,
  p_season      TEXT    DEFAULT NULL,
  p_level       TEXT    DEFAULT NULL,
  p_age_label   TEXT    DEFAULT NULL,
  p_age_min     INTEGER DEFAULT NULL,
  p_age_max     INTEGER DEFAULT NULL,
  p_parent_org  TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_user_id   TEXT;
  v_team      team_workspaces%ROWTYPE;
  v_identity  BOOLEAN;
  v_slug_ok   BOOLEAN;
  v_rink_city    TEXT;
  v_rink_country TEXT;
  v_slug_reserved BOOLEAN;
BEGIN
  v_user_id := current_user_id();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Slug format validation (unchanged)
  v_slug_ok := p_slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$';
  IF NOT v_slug_ok THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_slug',
      'message', 'Slug must be 3-50 chars, lowercase letters, digits, hyphens. Must start and end with a letter or digit.');
  END IF;

  -- 2026-06-25 Piece #1: reserved-slug check.
  -- Prevents team slugs that would shadow existing RinkStop routes
  -- (admin, login, dashboard, api, signup, etc).
  SELECT EXISTS (
    SELECT 1 FROM reserved_slugs WHERE slug = LOWER(p_slug)
  ) INTO v_slug_reserved;
  IF v_slug_reserved THEN
    RETURN jsonb_build_object('ok', false, 'error', 'slug_reserved',
      'message', 'That URL is reserved by RinkStop. Please choose a different team slug.');
  END IF;

  -- Identity gate (unchanged)
  SELECT EXISTS (
    SELECT 1 FROM profile_identity_status
    WHERE user_id = v_user_id AND status = 'active'
  ) INTO v_identity;
  IF NOT v_identity THEN
    RETURN jsonb_build_object('ok', false, 'error', 'identity_required',
      'message', 'Verify your identity via /dashboard/identity before creating a team.');
  END IF;

  IF p_age_cat NOT IN ('youth','adult','mixed') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_age_category');
  END IF;

  IF p_age_min IS NOT NULL AND p_age_min < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_age_min',
      'message', 'age_min must be >= 0.');
  END IF;
  IF p_age_max IS NOT NULL AND p_age_max < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_age_max',
      'message', 'age_max must be >= 0.');
  END IF;
  IF p_age_min IS NOT NULL AND p_age_max IS NOT NULL AND p_age_min > p_age_max THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_age_range',
      'message', 'age_min must be <= age_max.');
  END IF;

  IF p_rink_id IS NOT NULL THEN
    SELECT city, country INTO v_rink_city, v_rink_country
    FROM rinks
    WHERE id = p_rink_id AND is_active = true;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_rink',
        'message', 'The selected rink is not active or does not exist.');
    END IF;
  END IF;

  INSERT INTO team_workspaces (
    slug, name, short_name, country_code, age_category,
    home_rink_id, home_city, home_country, season_label, level, created_by,
    age_label, age_min, age_max, parent_org
  ) VALUES (
    p_slug, p_name, p_short_name, p_country, p_age_cat,
    p_rink_id, v_rink_city, v_rink_country, p_season, p_level, v_user_id,
    p_age_label, p_age_min, p_age_max, p_parent_org
  )
  RETURNING * INTO v_team;

  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team.id, v_user_id, 'head_coach');

  RETURN jsonb_build_object(
    'ok', true,
    'team_id', v_team.id,
    'team_slug', v_team.slug,
    'team_name', v_team.name,
    'currency', v_team.currency
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'slug_taken',
      'message', 'That slug is already in use. Try another.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unexpected',
      'message', SQLERRM);
END;
$$;

-- Permissions: keep identical to the v2 version. No change.
REVOKE ALL ON FUNCTION create_team_workspace(
  TEXT, TEXT, CHAR, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_team_workspace(
  TEXT, TEXT, CHAR, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT
) TO authenticated;

COMMENT ON FUNCTION create_team_workspace(
  TEXT, TEXT, CHAR, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT
) IS
  'Verified coach creates a new team_workspace. v2 (2026-06-18) added parent_org + age_label + age_min + age_max. 2026-06-25 Piece #1 Commit A added reserved-slug guard (checks reserved_slugs table to prevent shadowing existing routes).';
