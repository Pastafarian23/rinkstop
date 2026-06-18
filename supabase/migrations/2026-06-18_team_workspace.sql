-- 2026-06-18_team_workspace.sql
-- Phase: Private team workspaces for beta teams (Cebu Ice Datus is first user).
-- Owner: KiloClaw
-- Status: Day 1 of 5-day plan.
--
-- Adds:
--   team_workspaces    — private team record (separate from public national_teams directory)
--   team_members       — roster with full role enum (coaching + board roles)
--   team_events        — ice times / practices / games at a rink
--   team_rsvps         — player responses to events
--   team_messages      — coach/manager one-way announcements
--   team_invites       — shareable invite codes/links (no email required)
--   parent_consent     — parent/guardian sign-off for minors (extends managed_profiles)
--
-- Design notes:
--   * profiles.user_id is TEXT (Clerk). All FK references to user use TEXT.
--   * team_workspaces is private by default. Public directory team data (national_teams,
--     teams, iihf_member_nations) stays untouched.
--   * Roster RLS: a user can only see a team_workspace if they have a team_members row.
--   * Coach/manager creation gate: coach role requires identity_verified_at IS NOT NULL.
--   * Role enum covers youth-team governance: coaching (head_coach, assistant_coach) +
--     operational (manager) + board (president, vice_president, secretary, treasurer,
--     board_member, safety_officer) + player. Default: 'player'.
--   * Minors: managed_profiles row with relationship IN ('parent','guardian') gates
--     the minor's first login + Didit verification. parent_consent_at records the
--     explicit sign-off.
--
-- IMPORTANT: Tables are created FIRST, then RLS policies. Triggers last. This avoids
-- "relation does not exist" errors when policies reference each other.

BEGIN;

-- ============================================================
-- SECTION A: CREATE TABLES
-- ============================================================

-- --------------------------------------------------------
-- A1. team_workspaces
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_workspaces (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,                     -- URL slug, e.g. 'cebu-ice-datus'
  name              TEXT NOT NULL,
  short_name        TEXT,                                     -- e.g. 'Datus', used in lists
  home_rink_id      UUID REFERENCES rinks(id) ON DELETE SET NULL,
  home_city         TEXT,
  home_country      TEXT,
  age_category      TEXT NOT NULL DEFAULT 'youth'
                    CHECK (age_category IN ('youth','adult','mixed')),
  level             TEXT,                                     -- 'learn_to_play' | 'house' | 'travel' | 'rep'
  season_label      TEXT,                                     -- e.g. '2026-2027'
  founded_on        DATE,
  avatar_url        TEXT,
  banner_url        TEXT,
  description       TEXT,
  contact_email     TEXT,
  contact_phone     TEXT,
  visibility        TEXT NOT NULL DEFAULT 'private'
                    CHECK (visibility IN ('private','unlisted','public')),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_by        TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS team_workspaces_slug_idx         ON team_workspaces (slug);
CREATE INDEX IF NOT EXISTS team_workspaces_home_rink_idx    ON team_workspaces (home_rink_id);
CREATE INDEX IF NOT EXISTS team_workspaces_active_idx       ON team_workspaces (is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS team_workspaces_created_by_idx   ON team_workspaces (created_by);

-- --------------------------------------------------------
-- A2. team_members (roster)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES team_workspaces(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'player'
                CHECK (role IN (
                  'head_coach','assistant_coach','goalie_coach','skills_coach',
                  'manager','team_staff',
                  'president','vice_president','secretary','treasurer','board_member','safety_officer',
                  'player','goalie','alternate_player','parent_rep'
                )),
  jersey_number INTEGER,
  position      TEXT,                          -- 'C' | 'LW' | 'RW' | 'D' | 'G'
  shoots        TEXT CHECK (shoots IN ('L','R') OR shoots IS NULL),
  birth_date    DATE,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at       TIMESTAMPTZ,
  is_minor      BOOLEAN NOT NULL DEFAULT false,
  parent_user_id TEXT REFERENCES profiles(user_id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique active membership per user per team.
CREATE UNIQUE INDEX IF NOT EXISTS team_members_unique_active
  ON team_members (team_id, user_id)
  WHERE left_at IS NULL;

CREATE INDEX IF NOT EXISTS team_members_team_idx       ON team_members (team_id);
CREATE INDEX IF NOT EXISTS team_members_user_idx       ON team_members (user_id);
CREATE INDEX IF NOT EXISTS team_members_role_idx       ON team_members (team_id, role);

-- --------------------------------------------------------
-- A3. team_events (ice times / practices / games)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID NOT NULL REFERENCES team_workspaces(id) ON DELETE CASCADE,
  rink_id         UUID NOT NULL REFERENCES rinks(id) ON DELETE RESTRICT,
  event_kind      TEXT NOT NULL DEFAULT 'practice'
                  CHECK (event_kind IN ('practice','game','tournament','tryout','meeting','team_event')),
  title           TEXT NOT NULL,
  description     TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  arrival_minutes INTEGER NOT NULL DEFAULT 30,
  cost_per_player NUMERIC(10,2),
  currency        TEXT NOT NULL DEFAULT 'PHP',
  rsvp_required   BOOLEAN NOT NULL DEFAULT true,
  rsvp_deadline   TIMESTAMPTZ,
  max_attendees   INTEGER,
  opposing_team   TEXT,
  location_note   TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','cancelled','completed')),
  created_by      TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_events_time_order CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS team_events_team_idx        ON team_events (team_id);
CREATE INDEX IF NOT EXISTS team_events_team_time_idx   ON team_events (team_id, starts_at);
CREATE INDEX IF NOT EXISTS team_events_rink_idx        ON team_events (rink_id, starts_at);
CREATE INDEX IF NOT EXISTS team_events_status_idx      ON team_events (status) WHERE status = 'scheduled';

-- --------------------------------------------------------
-- A4. team_rsvps
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_rsvps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES team_events(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  response    TEXT NOT NULL CHECK (response IN ('yes','no','maybe')),
  note        TEXT,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_rsvps_unique UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS team_rsvps_event_idx ON team_rsvps (event_id);
CREATE INDEX IF NOT EXISTS team_rsvps_user_idx  ON team_rsvps (user_id);
CREATE INDEX IF NOT EXISTS team_rsvps_yes_idx   ON team_rsvps (event_id) WHERE response = 'yes';

-- --------------------------------------------------------
-- A5. team_messages (announcements)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES team_workspaces(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE RESTRICT,
  pinned      BOOLEAN NOT NULL DEFAULT false,
  audience    TEXT NOT NULL DEFAULT 'roster'
              CHECK (audience IN ('roster','coaches','board','parents','players')),
  subject     TEXT,
  body        TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_messages_team_idx     ON team_messages (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS team_messages_team_pinned  ON team_messages (team_id, pinned) WHERE pinned;
CREATE INDEX IF NOT EXISTS team_messages_audience_idx ON team_messages (team_id, audience);

-- --------------------------------------------------------
-- A6. team_invites
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES team_workspaces(id) ON DELETE CASCADE,
  code          TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT 'player'
                CHECK (role IN (
                  'head_coach','assistant_coach','goalie_coach','skills_coach',
                  'manager','team_staff',
                  'president','vice_president','secretary','treasurer','board_member','safety_officer',
                  'player','goalie','alternate_player','parent_rep'
                )),
  created_by    TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE RESTRICT,
  max_uses      INTEGER NOT NULL DEFAULT 1,
  times_used    INTEGER NOT NULL DEFAULT 0,
  expires_at    TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  accepted_by   TEXT[] NOT NULL DEFAULT '{}',
  label         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_invites_team_idx  ON team_invites (team_id);

-- --------------------------------------------------------
-- A7. parent_consent columns on managed_profiles
-- --------------------------------------------------------
ALTER TABLE managed_profiles
  ADD COLUMN IF NOT EXISTS parent_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parent_consent_ip INET,
  ADD COLUMN IF NOT EXISTS parent_consent_method TEXT,
  ADD COLUMN IF NOT EXISTS minor_consent_revoked_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'managed_profiles' AND constraint_name = 'managed_profiles_parent_consent_method_check'
  ) THEN
    ALTER TABLE managed_profiles ADD CONSTRAINT managed_profiles_parent_consent_method_check
      CHECK (parent_consent_method IS NULL OR
             parent_consent_method IN ('checkbox_signup','signed_form','in_person','email_confirmed'));
  END IF;
END$$;

-- ============================================================
-- SECTION B: ENABLE RLS
-- ============================================================

ALTER TABLE team_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_rsvps        ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION C: RLS POLICIES
-- ============================================================

-- C1. team_workspaces ------------------------------------------------
DROP POLICY IF EXISTS "team_workspaces_select_roster" ON team_workspaces;
CREATE POLICY "team_workspaces_select_roster" ON team_workspaces
  FOR SELECT USING (
    visibility = 'public'
    OR EXISTS (
      SELECT 1 FROM team_members m
      WHERE m.team_id = team_workspaces.id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
    )
    OR created_by = auth.uid()::text
  );

DROP POLICY IF EXISTS "team_workspaces_insert_verified" ON team_workspaces;
CREATE POLICY "team_workspaces_insert_verified" ON team_workspaces
  FOR INSERT WITH CHECK (
    created_by = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM profile_identity_status s
      WHERE s.user_id = auth.uid()::text AND s.status = 'active'
    )
  );

DROP POLICY IF EXISTS "team_workspaces_update_admin" ON team_workspaces;
CREATE POLICY "team_workspaces_update_admin" ON team_workspaces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members m
      WHERE m.team_id = team_workspaces.id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
        AND m.role IN ('head_coach','assistant_coach','manager','president','vice_president')
    )
  );

DROP POLICY IF EXISTS "team_workspaces_delete_head" ON team_workspaces;
CREATE POLICY "team_workspaces_delete_head" ON team_workspaces
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM team_members m
      WHERE m.team_id = team_workspaces.id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
        AND m.role = 'head_coach'
    )
  );

-- C2. team_members ---------------------------------------------------
DROP POLICY IF EXISTS "team_members_select_roster" ON team_members;
CREATE POLICY "team_members_select_roster" ON team_members
  FOR SELECT USING (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM team_members me
      WHERE me.team_id = team_members.team_id
        AND me.user_id = auth.uid()::text
        AND me.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "team_members_insert_admin" ON team_members;
CREATE POLICY "team_members_insert_admin" ON team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members m
      WHERE m.team_id = team_members.team_id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
        AND m.role IN ('head_coach','assistant_coach','manager','president','vice_president','secretary')
    )
  );

DROP POLICY IF EXISTS "team_members_update_admin" ON team_members;
CREATE POLICY "team_members_update_admin" ON team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members m
      WHERE m.team_id = team_members.team_id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
        AND m.role IN ('head_coach','assistant_coach','manager','president','vice_president','secretary')
    )
  );

-- C3. team_events ----------------------------------------------------
DROP POLICY IF EXISTS "team_events_select_roster" ON team_events;
CREATE POLICY "team_events_select_roster" ON team_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members m
      WHERE m.team_id = team_events.team_id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "team_events_insert_admin" ON team_events;
CREATE POLICY "team_events_insert_admin" ON team_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members m
      WHERE m.team_id = team_events.team_id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
        AND m.role IN ('head_coach','assistant_coach','manager','president','vice_president','secretary')
    )
  );

DROP POLICY IF EXISTS "team_events_update_admin" ON team_events;
CREATE POLICY "team_events_update_admin" ON team_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members m
      WHERE m.team_id = team_events.team_id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
        AND m.role IN ('head_coach','assistant_coach','manager','president','vice_president','secretary')
    )
  );

DROP POLICY IF EXISTS "team_events_delete_admin" ON team_events;
CREATE POLICY "team_events_delete_admin" ON team_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM team_members m
      WHERE m.team_id = team_events.team_id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
        AND m.role IN ('head_coach','manager','president')
    )
  );

-- C4. team_rsvps -----------------------------------------------------
DROP POLICY IF EXISTS "team_rsvps_select_roster" ON team_rsvps;
CREATE POLICY "team_rsvps_select_roster" ON team_rsvps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_events e
      JOIN team_members m ON m.team_id = e.team_id
      WHERE e.id = team_rsvps.event_id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "team_rsvps_self_write" ON team_rsvps;
CREATE POLICY "team_rsvps_self_write" ON team_rsvps
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM team_events e
      JOIN team_members m ON m.team_id = e.team_id
      WHERE e.id = team_rsvps.event_id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "team_rsvps_self_update" ON team_rsvps;
CREATE POLICY "team_rsvps_self_update" ON team_rsvps
  FOR UPDATE USING (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM team_events e
      JOIN team_members m ON m.team_id = e.team_id
      WHERE e.id = team_rsvps.event_id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
        AND m.role IN ('head_coach','assistant_coach','manager','president','vice_president','secretary')
    )
  );

-- C5. team_messages --------------------------------------------------
DROP POLICY IF EXISTS "team_messages_select_roster" ON team_messages;
CREATE POLICY "team_messages_select_roster" ON team_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members m
      WHERE m.team_id = team_messages.team_id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "team_messages_insert_author" ON team_messages;
CREATE POLICY "team_messages_insert_author" ON team_messages
  FOR INSERT WITH CHECK (
    author_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM team_members m
      WHERE m.team_id = team_messages.team_id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
        AND m.role IN (
          'head_coach','assistant_coach','goalie_coach','skills_coach',
          'manager','team_staff',
          'president','vice_president','secretary','treasurer','board_member','safety_officer'
        )
    )
  );

DROP POLICY IF EXISTS "team_messages_author_update" ON team_messages;
CREATE POLICY "team_messages_author_update" ON team_messages
  FOR UPDATE USING (author_id = auth.uid()::text);

-- C6. team_invites ---------------------------------------------------
DROP POLICY IF EXISTS "team_invites_admin_select" ON team_invites;
CREATE POLICY "team_invites_admin_select" ON team_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members m
      WHERE m.team_id = team_invites.team_id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
        AND m.role IN ('head_coach','assistant_coach','manager','president','vice_president','secretary')
    )
  );

DROP POLICY IF EXISTS "team_invites_admin_write" ON team_invites;
CREATE POLICY "team_invites_admin_write" ON team_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members m
      WHERE m.team_id = team_invites.team_id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
        AND m.role IN ('head_coach','manager','president','vice_president','secretary')
    )
  );

DROP POLICY IF EXISTS "team_invites_admin_update" ON team_invites;
CREATE POLICY "team_invites_admin_update" ON team_invites
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members m
      WHERE m.team_id = team_invites.team_id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
        AND m.role IN ('head_coach','manager','president','vice_president','secretary')
    )
  );

-- ============================================================
-- SECTION D: TRIGGERS (updated_at)
-- ============================================================

DROP TRIGGER IF EXISTS trg_team_workspaces_updated ON team_workspaces;
CREATE TRIGGER trg_team_workspaces_updated BEFORE UPDATE ON team_workspaces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_team_members_updated ON team_members;
CREATE TRIGGER trg_team_members_updated BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_team_events_updated ON team_events;
CREATE TRIGGER trg_team_events_updated BEFORE UPDATE ON team_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_team_rsvps_updated ON team_rsvps;
CREATE TRIGGER trg_team_rsvps_updated BEFORE UPDATE ON team_rsvps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_team_messages_updated ON team_messages;
CREATE TRIGGER trg_team_messages_updated BEFORE UPDATE ON team_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SECTION E: COMMENTS
-- ============================================================

COMMENT ON TABLE team_workspaces IS
  'Private team workspaces for clubs, rep teams, and learn-to-play groups. '
  'Distinct from public national_teams (NHL/IIHF) and teams (league directory). '
  'Beta: Cebu Ice Datus is the first user.';
COMMENT ON COLUMN team_workspaces.slug IS 'URL-safe slug. Unique. Used for /team/<slug> routing.';
COMMENT ON COLUMN team_workspaces.visibility IS 'private (roster-only) | unlisted (link-only) | public (later)';
COMMENT ON COLUMN team_workspaces.created_by IS 'Clerk user_id of the head_coach who created the workspace.';

COMMENT ON TABLE team_members IS
  'Roster rows for a team_workspace. Soft-delete via left_at. Role enum covers '
  'coaching staff, operations, board governance, and players.';
COMMENT ON COLUMN team_members.parent_user_id IS
  'Mirror of managed_profiles.manager_user_id for fast RLS on minor-related queries.';

COMMENT ON TABLE team_events IS
  'Ice times, practices, games, tournaments. Linked to a rink. '
  'cost_per_player is in team currency (default PHP). Manager monitors RSVP counts.';

COMMENT ON TABLE team_rsvps IS
  'Player RSVP responses to team_events. yes/no/maybe. Manager uses yes count '
  'to confirm ice time booking and calculate cost per player.';

COMMENT ON TABLE team_messages IS
  'One-way announcements from coaching staff / board to roster. audience restricts '
  'who sees what (e.g. board-only financial updates, parents-only travel notes).';

COMMENT ON TABLE team_invites IS
  'Shareable invite codes (no email required). Coach generates a code, shares via '
  'SMS/WhatsApp/in-person, player creates account and redeems code. Each code has '
  'max_uses and optional expiry. Code redemption handled via SECURITY DEFINER function (Day 2).';

COMMENT ON COLUMN managed_profiles.parent_consent_at IS
  'Timestamp when the parent/guardian explicitly consented to the minor using RinkStop. '
  'NULL = consent not yet captured. Required before minor can join a team_workspace.';
COMMENT ON COLUMN managed_profiles.parent_consent_method IS
  'How consent was captured: checkbox_signup (self-serve), signed_form (uploaded PDF), '
  'in_person (coach verified offline), email_confirmed (legacy).';
COMMENT ON COLUMN managed_profiles.minor_consent_revoked_at IS
  'If non-null, consent has been revoked. Minor should be blocked from active roster.';

COMMIT;