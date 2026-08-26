-- 2026-08-26_nhl_coaching_staff.sql
--
-- NHL coaching staff table for the 2025-26 season. Public read-only
-- data sourced from an audited spreadsheet (see PR for the source).
-- Idempotent.
--
-- Why a dedicated table instead of stuffing into an existing one:
--   - 32 teams × ~5 staff = ~150 rows, season-specific
--   - Coaches change yearly, so we don't want to pollute the
--     `coach_profiles` (verified-credential) or `coach_team_history`
--     (passport audit) tables with unverified mass-import data
--   - Lets us version by season (start_date, end_date) so we can
--     layer 2024-25 + 2025-26 + future seasons in the same table
--
-- Status enum:
--   - full_season : coached the full regular+playoffs
--   - hired_mid    : joined after the season started
--   - left_mid     : left (fired/resigned/retired) before season end
--   - interim      : filled a vacancy mid-season, may or may not be
--                    retained for next season
--   - unconfirmed  : placeholder row, real name not yet verified
--
-- Source: 2025-26 NHL Coaching Staff audit spreadsheet (PR #XXX).

CREATE TABLE IF NOT EXISTS nhl_coaching_staff (
  id              BIGSERIAL PRIMARY KEY,
  nhl_team_id     TEXT NOT NULL REFERENCES nhl_teams(id) ON DELETE CASCADE,
  season          TEXT NOT NULL DEFAULT '2025-26',
  role            TEXT NOT NULL CHECK (role IN (
                    'head_coach',
                    'associate_coach',
                    'assistant_coach',
                    'goaltending_coach',
                    'video_coach',
                    'skills_coach',
                    'other'
                  )),
  name            TEXT NOT NULL,
  start_date      DATE,
  end_date        DATE,
  status          TEXT NOT NULL CHECK (status IN (
                    'full_season', 'hired_mid', 'left_mid', 'interim', 'unconfirmed'
                  )),
  notes           TEXT,
  -- Display order within a team's staff. Head coach first, then ACs, then goalie coach.
  display_order   INTEGER NOT NULL DEFAULT 99,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One coach can't hold the same role at the same team in the same
  -- season twice. Lets us re-import without creating duplicates.
  CONSTRAINT nhl_coaching_staff_unique_seat
    UNIQUE (nhl_team_id, season, role, name)
);

-- Most common lookup: all coaching staff for a team in a season.
CREATE INDEX IF NOT EXISTS nhl_coaching_staff_team_season_idx
  ON nhl_coaching_staff (nhl_team_id, season);

-- Lookup by name (search pages, coach profile links).
CREATE INDEX IF NOT EXISTS nhl_coaching_staff_name_idx
  ON nhl_coaching_staff (name);

-- Mid-season changes are the interesting ones; index for "show
-- all firings/hires this season" UIs.
CREATE INDEX IF NOT EXISTS nhl_coaching_staff_status_idx
  ON nhl_coaching_staff (season, status)
  WHERE status IN ('hired_mid', 'left_mid', 'interim');

-- Public read, service-role write. The data is public anyway and
-- there are no PII concerns (names + roles are all on NHL.com).
ALTER TABLE nhl_coaching_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nhl_coaching_staff_public_read ON nhl_coaching_staff;
CREATE POLICY nhl_coaching_staff_public_read ON nhl_coaching_staff
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- No public write paths; service role bypasses RLS for the import script.