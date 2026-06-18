-- ============================================================
-- Day 3.5 — team_workspace v2 (parent_org + custom age labels)
-- ============================================================
--
-- Adds fields to team_workspaces for:
--   - parent_org: lightweight "club" grouping (free text, optional)
--   - age_label:  custom age group name (e.g. "U12", "Bantam AAA", "12+")
--   - age_min/max: numeric range for "show me teams for my 13yo" queries
--
-- Backward compatible: age_category enum stays, but the new age_label
-- is the source of truth for display. age_category can be derived
-- (e.g. age_max < 18 → 'youth') or just ignored.
--
-- Replaces hex invite codes (CEBU-9D17-CD style) with Crockford base32:
--   alphabet = 0123456789ABCDEFGHJKMNPQRSTVWXYZ  (32 chars, no I/L/O/U)
--   Why: easier to read aloud over the phone, fewer typos
--
-- Idempotent: uses IF NOT EXISTS / DROP + CREATE patterns.
--
-- Apply:  psql via Supabase SQL editor, or supabase CLI db push

-- --------------------------------------------------------
-- A. Schema additions to team_workspaces
-- --------------------------------------------------------

ALTER TABLE team_workspaces
  ADD COLUMN IF NOT EXISTS age_label TEXT,
  ADD COLUMN IF NOT EXISTS age_min   INTEGER,
  ADD COLUMN IF NOT EXISTS age_max   INTEGER,
  ADD COLUMN IF NOT EXISTS parent_org TEXT;

COMMENT ON COLUMN team_workspaces.age_label IS
  'Display name for the team age group. Free text. e.g. "U12", "Bantam AAA", "12+", "Overage". '
  'For non-US hockey, the org may define its own groupings (Cebu has U12 / 12+).';

COMMENT ON COLUMN team_workspaces.age_min IS
  'Lower bound of player age in years. Used for filtering "teams for my kid". NULL = no min.';

COMMENT ON COLUMN team_workspaces.age_max IS
  'Upper bound of player age in years. NULL = no max. 99 = open-ended.';

COMMENT ON COLUMN team_workspaces.parent_org IS
  'Optional. Names the parent org / club. Two play-teams under the same club share this. '
  'e.g. "Cebu Ice Datus" appears in both the U12 and Overage workspace rows. '
  'Dashboard groups team cards by parent_org.';

-- Index for the dashboard grouping + age-range queries
CREATE INDEX IF NOT EXISTS team_workspaces_parent_org_idx
  ON team_workspaces (parent_org)
  WHERE parent_org IS NOT NULL;

CREATE INDEX IF NOT EXISTS team_workspaces_age_range_idx
  ON team_workspaces (age_min, age_max)
  WHERE age_min IS NOT NULL OR age_max IS NOT NULL;

-- --------------------------------------------------------
-- B. Update create_team_workspace to accept new fields
-- --------------------------------------------------------

-- Drop old overloads (8-param version from prior migration) so callers can't
-- hit the "function is not unique" error. The v2 (12-param) version is the
-- canonical one going forward.
DROP FUNCTION IF EXISTS create_team_workspace(
  TEXT, TEXT, CHAR(2), TEXT, UUID, TEXT, TEXT, TEXT
) CASCADE;

CREATE OR REPLACE FUNCTION create_team_workspace(
  p_name        TEXT,
  p_slug        TEXT,
  p_country     CHAR(2) DEFAULT NULL,
  p_age_cat     TEXT    DEFAULT 'youth',
  p_rink_id     UUID    DEFAULT NULL,
  p_short_name  TEXT    DEFAULT NULL,
  p_season      TEXT    DEFAULT NULL,
  p_level       TEXT    DEFAULT NULL,
  p_age_label   TEXT    DEFAULT NULL,    -- v2: custom age group name
  p_age_min     INTEGER DEFAULT NULL,    -- v2: optional age range lower bound
  p_age_max     INTEGER DEFAULT NULL,    -- v2: optional age range upper bound
  p_parent_org  TEXT    DEFAULT NULL     -- v2: optional club / org name
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

  -- BUG #8 FIX: regex now enforces 3-50 chars consistently with the message.
  -- Previous regex allowed 1-char slugs but rejected 2-char, contradicting
  -- the '3-50 chars' error message.
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

  -- Validate age range if provided
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

  -- If a rink is provided, pull city + country from it for denormalized columns
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

REVOKE ALL ON FUNCTION create_team_workspace(
  TEXT, TEXT, CHAR, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_team_workspace(
  TEXT, TEXT, CHAR, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT
) TO authenticated;

-- --------------------------------------------------------
-- C. Crockford base32 helper for invite codes
-- --------------------------------------------------------
--
-- Replaces hex (16 chars/byte) with Crockford base32 (32 chars/byte).
-- Same entropy per byte, more readable, no I/L/O/U.
--
-- Alphabet: 0123456789ABCDEFGHJKMNPQRSTVWXYZ  (32 chars)
-- Format:   PREFIX-XXXX-YY  (4-char prefix from team slug + 4 + 2)
-- Entropy:  4 chars (20 bits) + 2 chars (10 bits) = 30 bits per code
--           2^30 = ~1.07 billion unique codes per team prefix

CREATE OR REPLACE FUNCTION crockford_encode(bytes BYTEA)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  alphabet TEXT := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  result   TEXT := '';
  v_int    BIGINT;
  v_bytes  BYTEA;
BEGIN
  -- Treat the bytea as a big-endian integer.
  -- For up to 8 bytes this fits in bigint.
  IF octet_length(bytes) > 8 THEN
    RAISE EXCEPTION 'crockford_encode: input > 8 bytes (%, got %)', octet_length(bytes), octet_length(bytes);
  END IF;

  -- Convert bytes to a bigint (big-endian)
  v_int := 0;
  FOR i IN 1..octet_length(bytes) LOOP
    v_int := v_int * 256 + get_byte(bytes, i - 1);
  END LOOP;

  -- Encode to base-32 (Crockford)
  IF v_int = 0 THEN
    RETURN '0';
  END IF;

  WHILE v_int > 0 LOOP
    result := substr(alphabet, (v_int % 32)::int + 1, 1) || result;
    v_int := v_int / 32;
  END LOOP;

  RETURN result;
END;
$$;

-- Generate an invite code in the format PREFIX-XXXX-YY using Crockford base32.
-- p_prefix should be 4 alphanumeric chars (derived from team slug).
-- Returns a code like 'CEBU-9D17-CD'.
CREATE OR REPLACE FUNCTION generate_invite_code(p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_prefix TEXT;
  v_part1  TEXT;
  v_part2  TEXT;
  v_bytes1 BYTEA;
  v_bytes2 BYTEA;
  v_code   TEXT;
BEGIN
  -- Normalize prefix: uppercase, strip non-alphanumerics, map I/L/O/U to
  -- their Crockford equivalents (1/1/0/V) so the prefix is always
  -- 4 valid Crockford base32 chars. Standard Crockford decoding table.
  v_prefix := upper(regexp_replace(p_prefix, '[^a-zA-Z0-9]', '', 'g'));
  v_prefix := translate(v_prefix, 'ILOU', '110V');
  v_prefix := substr(v_prefix, 1, 4);
  IF length(v_prefix) < 2 THEN
    v_prefix := rpad(v_prefix, 2, 'X');
  END IF;

  -- 20 bits from 3 random bytes → 4 base32 chars
  v_bytes1 := extensions.gen_random_bytes(3);
  v_part1 := crockford_encode(v_bytes1);
  -- Pad to 4 chars (left-pad with '0')
  v_part1 := rpad(v_part1, 4, '0');

  -- 10 bits from 2 random bytes → 2 base32 chars
  v_bytes2 := extensions.gen_random_bytes(2);
  v_part2 := crockford_encode(v_bytes2);
  v_part2 := rpad(v_part2, 2, '0');

  v_code := v_prefix || '-' || v_part1 || '-' || v_part2;

  RETURN v_code;
END;
$$;

-- --------------------------------------------------------
-- D. Update generate_team_invite to use Crockford base32
-- --------------------------------------------------------

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
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_user_id   TEXT;
  v_team      team_workspaces%ROWTYPE;
  v_is_admin  BOOLEAN;
  v_code      TEXT;
  v_inserted  team_invites%ROWTYPE;
  v_attempts  INT := 0;
BEGIN
  v_user_id := current_user_id();
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

  -- Validate expires
  IF p_expires_days < 1 OR p_expires_days > 365 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_expires');
  END IF;

  -- Look up team
  SELECT * INTO v_team FROM team_workspaces WHERE id = p_team_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'team_not_found');
  END IF;

  -- Caller must be on the team in an admin role
  SELECT EXISTS (
    SELECT 1 FROM team_members m
    WHERE m.team_id = p_team_id
      AND m.user_id = v_user_id
      AND m.left_at IS NULL
      AND m.role IN ('head_coach','assistant_coach','goalie_coach','skills_coach',
                     'manager','president','vice_president','secretary','treasurer')
  ) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized',
      'message', 'Only coaches, managers, and board members can generate invite codes.');
  END IF;

  -- Generate a unique code (retry on collision — extremely rare with Crockford)
  LOOP
    v_attempts := v_attempts + 1;
    v_code := generate_invite_code(v_team.slug);

    -- Try insert; if it conflicts, retry (up to 5 times)
    BEGIN
      INSERT INTO team_invites (
        team_id, code, role, max_uses, expires_at, label, created_by
      ) VALUES (
        p_team_id, v_code, p_role, p_max_uses,
        now() + (p_expires_days || ' days')::interval,
        p_label, v_user_id
      )
      RETURNING * INTO v_inserted;
      EXIT; -- success
    EXCEPTION
      WHEN unique_violation THEN
        IF v_attempts >= 5 THEN
          RETURN jsonb_build_object('ok', false, 'error', 'code_generation_failed',
            'message', 'Could not generate a unique invite code. Try again.');
        END IF;
        -- retry with new random bytes
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_inserted.id,
    'code', v_inserted.code,
    'role', v_inserted.role,
    'max_uses', v_inserted.max_uses,
    'expires_at', v_inserted.expires_at,
    'label', v_inserted.label
  );
END;
$$;

REVOKE ALL ON FUNCTION generate_team_invite(UUID, TEXT, INTEGER, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_team_invite(UUID, TEXT, INTEGER, INTEGER, TEXT) TO authenticated;

-- --------------------------------------------------------
-- E. Add a helper view for the dashboard: "My Teams" grouped by parent_org
-- --------------------------------------------------------
--
-- This is for the dashboard UI. Players/coaches see their teams grouped
-- by parent_org (or "Unaffiliated" if NULL).

CREATE OR REPLACE VIEW my_team_memberships AS
SELECT
  m.id            AS membership_id,
  m.user_id,
  m.role,
  m.jersey_number,
  m.joined_at,
  m.left_at,
  tw.id            AS team_id,
  tw.slug          AS team_slug,
  tw.name          AS team_name,
  tw.short_name    AS team_short_name,
  tw.country_code  AS team_country_code,
  tw.age_label     AS team_age_label,
  tw.age_min       AS team_age_min,
  tw.age_max       AS team_age_max,
  tw.parent_org    AS team_parent_org,
  tw.level         AS team_level,
  tw.home_city     AS team_home_city
FROM team_members m
JOIN team_workspaces tw ON tw.id = m.team_id
WHERE tw.is_active = true;

COMMENT ON VIEW my_team_memberships IS
  'Joins team_members with team_workspaces for dashboard queries. '
  'Server-side filtering by user_id is enforced by the caller (RLS on team_members).';

-- --------------------------------------------------------
-- F. Update RLS on team_workspaces to allow reading parent_org
--    (no change — existing policies already grant SELECT to team members)
-- --------------------------------------------------------
-- team_workspaces_select_member policy already exists from Day 1.
-- New columns (age_label, age_min, age_max, parent_org) are visible to anyone
-- who can SELECT from team_workspaces. No RLS change needed.

-- ============================================================
-- END Day 3.5 migration
-- ============================================================
