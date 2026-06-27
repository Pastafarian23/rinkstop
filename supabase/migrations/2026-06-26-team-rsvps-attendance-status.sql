-- 2026-06-26-team-rsvps-attendance-status.sql
-- Piece G2: Attendance tracking for team events
--
-- Adds:
--   attendance_status  -- present | absent | late | excused
--   attendance_at      -- timestamp when marked
--   attendance_note     -- optional notes
--   marked_by          -- user_id of coach/manager who marked it

ALTER TABLE team_rsvps
  ADD COLUMN IF NOT EXISTS attendance_status TEXT
    CHECK (attendance_status IN ('present','absent','late','excused')),
  ADD COLUMN IF NOT EXISTS attendance_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attendance_note TEXT,
  ADD COLUMN IF NOT EXISTS marked_by TEXT REFERENCES profiles(user_id);

-- Index for querying attendance by status
CREATE INDEX IF NOT EXISTS team_rsvps_attendance_status_idx
  ON team_rsvps (event_id) WHERE attendance_status IS NOT NULL;

COMMENT ON COLUMN team_rsvps.attendance_status IS
  'Coach/manager marked attendance: present, absent, late, or excused. NULL = not yet marked.';
COMMENT ON COLUMN team_rsvps.attendance_at IS
  'Timestamp when the attendance status was recorded.';
COMMENT ON COLUMN team_rsvps.attendance_note IS
  'Optional notes for attendance (e.g., "arrived 15 min late").';
COMMENT ON COLUMN team_rsvps.marked_by IS
  'Clerk user_id of the coach/manager who marked this attendance.';