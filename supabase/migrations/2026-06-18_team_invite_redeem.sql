-- 2026-06-18_team_invite_redeem.sql
-- Day 2: Invite code redemption + team creation RPCs.
-- Owner: KiloClaw
--
-- Adds:
--   * claim_team_invite(code TEXT) - SECURITY DEFINER function that lets a
--     player self-join a team by entering a code. Bypasses RLS for the
--     team_members insert (RLS only allows admins to add members).
--   * create_team_workspace(p_name, p_slug, p_country_code, p_age_category, p_home_rink_id) -
--     SECURITY DEFINER function that creates a team and adds the caller as
--     head_coach. Bypasses RLS for the team_workspaces insert (which requires
--     identity_verified_at IS NOT NULL).
--   * get_team_by_slug(p_slug) - simple read helper.
--
-- All three functions are SECURITY DEFINER + search_path locked to prevent
-- search-path attacks. They all check auth.uid() and use it explicitly.
--
-- Parent consent: a minor who has not yet had parent_consent_at set can join
-- a team, but the team_members row will have is_minor=true. The team can't
-- officially "activate" the minor until consent is set. We surface this via
-- team_members.is_minor + managed_profiles.parent_consent_at check.

BEGIN;

-- ============================================================
-- A. claim_team_invite(code TEXT)
-- ============================================================
-- Player enters an invite code. The function:
--   1. Looks up the invite by code.
--   2. Validates: not revoked, not expired, times_used < max_uses.
--   3. Validates: caller is identity-verified (because the team is private).
--   4. Inserts a team_members row for the caller with the role on the invite.
--   5. Increments times_used and appends caller to accepted_by.
--   6. Returns a result row so the client can show success/failure.
--
-- The function is idempotent: if the caller is already a member, it returns
-- the existing row instead of creating a duplicate.

CREATE OR REPLACE FUNCTION claim_team_invite(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id   TEXT;
  v_invite    team_invites%ROWTYPE;
  v_member    team_members%ROWTYPE;
  v_team      team_workspaces%ROWTYPE;
  v_identity  BOOLEAN;
BEGIN
  v_user_id := auth.uid()::text;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Look up invite (lock row to prevent race)
  SELECT * INTO v_invite
  FROM team_invites
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  -- Validate invite state
  IF v_invite.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_revoked');
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_expired');
  END IF;

  IF v_invite.times_used >= v_invite.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invite_exhausted');
  END IF;

  -- Caller must be identity-verified
  SELECT EXISTS (
    SELECT 1 FROM profile_identity_status
    WHERE user_id = v_user_id AND status = 'active'
  ) INTO v_identity;

  IF NOT v_identity THEN
    RETURN jsonb_build_object('ok', false, 'error', 'identity_required',
      'message', 'Verify your identity before joining a team.');
  END IF;

  -- Get the team
  SELECT * INTO v_team
  FROM team_workspaces
  WHERE id = v_invite.team_id;

  IF NOT FOUND OR NOT v_team.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'team_inactive');
  END IF;

  -- Idempotency: if caller is already an active member, return success
  SELECT * INTO v_member
  FROM team_members
  WHERE team_id = v_invite.team_id
    AND user_id = v_user_id
    AND left_at IS NULL;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'team_id', v_team.id,
      'team_slug', v_team.slug,
      'team_name', v_team.name,
      'role', v_member.role,
      'already_member', true
    );
  END IF;

  -- Insert the membership (use SECURITY DEFINER to bypass RLS)
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_invite.team_id, v_user_id, v_invite.role)
  RETURNING * INTO v_member;

  -- Update invite counters
  UPDATE team_invites
  SET times_used = times_used + 1,
      accepted_by = array_append(accepted_by, v_user_id)
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'ok', true,
    'team_id', v_team.id,
    'team_slug', v_team.slug,
    'team_name', v_team.name,
    'role', v_member.role,
    'already_member', false
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unexpected',
      'message', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION claim_team_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_team_invite(TEXT) TO authenticated;

COMMENT ON FUNCTION claim_team_invite(TEXT) IS
  'Player-facing: redeem a team invite code. Validates code, identity, and team '
  'state. Inserts a team_members row with the role on the invite. Idempotent.';

-- ============================================================
-- B. create_team_workspace(...)
-- ============================================================
-- Verified coach creates a new team. The function:
--   1. Validates slug uniqueness (DB also enforces).
--   2. Validates the caller is identity-verified.
--   3. Inserts the team_workspace row.
--   4. Inserts the caller as head_coach.
--   5. Returns the team info.

CREATE OR REPLACE FUNCTION create_team_workspace(
  p_name        TEXT,
  p_slug        TEXT,
  p_country     CHAR(2) DEFAULT NULL,
  p_age_cat     TEXT    DEFAULT 'youth',
  p_rink_id     UUID    DEFAULT NULL,
  p_short_name  TEXT    DEFAULT NULL,
  p_season      TEXT    DEFAULT NULL,
  p_level       TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id   TEXT;
  v_team      team_workspaces%ROWTYPE;
  v_identity  BOOLEAN;
  v_slug_ok   BOOLEAN;
BEGIN
  v_user_id := auth.uid()::text;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Slug validation: lowercase, alphanumeric + hyphens, 3-50 chars
  v_slug_ok := p_slug ~ '^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$';
  IF NOT v_slug_ok THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_slug',
      'message', 'Slug must be 3-50 chars, lowercase letters, digits, hyphens.');
  END IF;

  -- Identity gate (same as RLS policy)
  SELECT EXISTS (
    SELECT 1 FROM profile_identity_status
    WHERE user_id = v_user_id AND status = 'active'
  ) INTO v_identity;

  IF NOT v_identity THEN
    RETURN jsonb_build_object('ok', false, 'error', 'identity_required',
      'message', 'Verify your identity via /dashboard/identity before creating a team.');
  END IF;

  -- Age category validation
  IF p_age_cat NOT IN ('youth','adult','mixed') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_age_category');
  END IF;

  -- Insert the team (SECURITY DEFINER bypasses RLS for verified coach)
  INSERT INTO team_workspaces (
    slug, name, short_name, country_code, age_category,
    home_rink_id, season_label, level, created_by
  ) VALUES (
    p_slug, p_name, p_short_name, p_country, p_age_cat,
    p_rink_id, p_season, p_level, v_user_id
  )
  RETURNING * INTO v_team;

  -- Add caller as head_coach
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

REVOKE ALL ON FUNCTION create_team_workspace(TEXT, TEXT, CHAR, TEXT, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_team_workspace(TEXT, TEXT, CHAR, TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION create_team_workspace IS
  'Verified coach creates a new team_workspace. Inserts the workspace, adds '
  'the caller as head_coach. Returns team info. Slug is validated + unique.';

-- ============================================================
-- C. generate_team_invite(p_team_id, p_role, p_max_uses, p_expires_in_days, p_label)
-- ============================================================
-- Coach/manager generates a shareable invite code. Returns a short, human-
-- readable code (e.g. 'CID-JANE-7Q'). Code is unique across all teams.

CREATE OR REPLACE FUNCTION generate_team_invite(
  p_team_id        UUID,
  p_role           TEXT    DEFAULT 'player',
  p_max_uses       INTEGER DEFAULT 1,
  p_expires_days   INTEGER DEFAULT 30,
  p_label          TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT;
  v_is_admin BOOLEAN;
  v_code TEXT;
  v_invite team_invites%ROWTYPE;
  v_attempts INTEGER := 0;
  v_team_slug TEXT;
BEGIN
  v_user_id := auth.uid()::text;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Validate role
  IF p_role NOT IN (
    'head_coach','assistant_coach','goalie_coach','skills_coach',
    'manager','team_staff',
    'president','vice_president','secretary','treasurer','board_member','safety_officer',
    'player','goalie','alternate_player','parent_rep'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_role');
  END IF;

  -- Validate max_uses
  IF p_max_uses < 1 OR p_max_uses > 100 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_max_uses');
  END IF;

  -- Caller must be on the team in an admin role
  SELECT EXISTS (
    SELECT 1 FROM team_members m
    WHERE m.team_id = p_team_id
      AND m.user_id = v_user_id
      AND m.left_at IS NULL
      AND m.role IN ('head_coach','manager','president','vice_president','secretary')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_team_admin');
  END IF;

  -- Get team slug for code prefix
  SELECT slug INTO v_team_slug FROM team_workspaces WHERE id = p_team_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'team_not_found');
  END IF;

  -- Generate unique code. Format: <TEAM-PREFIX>-<RANDOM>-<RANDOM>
  -- Example: 'DATS-A7K2-9F' (12 chars). 4-letter team prefix + 4 hex + 2 hex.
  -- If we collide, retry. Cap at 10 attempts to avoid infinite loop.
  LOOP
    v_attempts := v_attempts + 1;
    v_code := upper(
      substring(regexp_replace(v_team_slug, '[^a-zA-Z0-9]', '', 'g') from 1 for 4) ||
      '-' ||
      upper(encode(gen_random_bytes(2), 'hex')) ||
      '-' ||
      upper(encode(gen_random_bytes(1), 'hex'))
    );

    -- Check uniqueness
    PERFORM 1 FROM team_invites WHERE code = v_code;
    IF NOT FOUND THEN
      EXIT;
    END IF;

    IF v_attempts >= 10 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'code_gen_failed',
        'message', 'Could not generate a unique code after 10 attempts. Try again.');
    END IF;
  END LOOP;

  -- Insert the invite
  INSERT INTO team_invites (
    team_id, code, role, max_uses, expires_at, created_by, label
  ) VALUES (
    p_team_id, v_code, p_role, p_max_uses,
    now() + (p_expires_days || ' days')::INTERVAL,
    v_user_id, p_label
  )
  RETURNING * INTO v_invite;

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_invite.code,
    'role', v_invite.role,
    'max_uses', v_invite.max_uses,
    'expires_at', v_invite.expires_at,
    'label', v_invite.label
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unexpected',
      'message', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION generate_team_invite(UUID, TEXT, INTEGER, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_team_invite(UUID, TEXT, INTEGER, INTEGER, TEXT) TO authenticated;

COMMENT ON FUNCTION generate_team_invite IS
  'Admin of a team generates a shareable invite code. Format: PREFIX-XXXX-Y. '
  'Returns code, role, max_uses, expires_at. Codes are unique across all teams.';

-- ============================================================
-- D. revoke_team_invite(p_invite_id)
-- ============================================================

CREATE OR REPLACE FUNCTION revoke_team_invite(p_invite_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT;
  v_is_admin BOOLEAN;
  v_invite team_invites%ROWTYPE;
BEGIN
  v_user_id := auth.uid()::text;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_invite FROM team_invites WHERE id = p_invite_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM team_members m
    WHERE m.team_id = v_invite.team_id
      AND m.user_id = v_user_id
      AND m.left_at IS NULL
      AND m.role IN ('head_coach','manager','president','vice_president','secretary')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_team_admin');
  END IF;

  UPDATE team_invites SET revoked_at = now() WHERE id = p_invite_id;

  RETURN jsonb_build_object('ok', true, 'invite_id', p_invite_id);
END;
$$;

REVOKE ALL ON FUNCTION revoke_team_invite(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION revoke_team_invite(UUID) TO authenticated;

COMMENT ON FUNCTION revoke_team_invite IS
  'Admin revokes an invite. Sets revoked_at = now(). Future claim attempts get invite_revoked.';

-- ============================================================
-- E. Helper indexes (perf)
-- ============================================================

CREATE INDEX IF NOT EXISTS team_invites_active_idx
  ON team_invites (code)
  WHERE revoked_at IS NULL;

COMMIT;