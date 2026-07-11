-- 2026-07-11 — create_team_workspace RPC updates for federation/org/league FKs
--
-- Adds p_federation_id, p_organization_id, p_league_id params and writes
-- them. parent_org text is preserved for backward compatibility until
-- all code references are swapped to FKs.

CREATE OR REPLACE FUNCTION create_team_workspace(
  p_name            TEXT,
  p_slug            TEXT,
  p_country         CHAR(2) DEFAULT NULL,
  p_age_cat         TEXT    DEFAULT 'youth',
  p_rink_id         UUID    DEFAULT NULL,
  p_short_name      TEXT    DEFAULT NULL,
  p_season          TEXT    DEFAULT NULL,
  p_level           TEXT    DEFAULT NULL,
  p_age_label       TEXT    DEFAULT NULL,
  p_age_min         INTEGER DEFAULT NULL,
  p_age_max         INTEGER DEFAULT NULL,
  p_parent_org      TEXT    DEFAULT NULL,
  p_federation_id   UUID    DEFAULT NULL,
  p_organization_id UUID    DEFAULT NULL,
  p_league_id       UUID    DEFAULT NULL
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
BEGIN
  v_user_id := current_user_id();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  v_slug_ok := p_slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$';
  IF NOT v_slug_ok THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_slug',
      'message', 'Slug must be 3-50 chars, lowercase letters, digits, hyphens. Must start and end with a letter or digit.');
  END IF;

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
    age_label, age_min, age_max, parent_org,
    federation_id, organization_id, league_id
  ) VALUES (
    p_slug, p_name, p_short_name, p_country, p_age_cat,
    p_rink_id, v_rink_city, v_rink_country, p_season, p_level, v_user_id,
    p_age_label, p_age_min, p_age_max, p_parent_org,
    p_federation_id, p_organization_id, p_league_id
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

REVOKE ALL ON FUNCTION create_team_workspace(
  TEXT, TEXT, CHAR, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, UUID, UUID, UUID
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_team_workspace(
  TEXT, TEXT, CHAR, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, UUID, UUID, UUID
) TO authenticated;
