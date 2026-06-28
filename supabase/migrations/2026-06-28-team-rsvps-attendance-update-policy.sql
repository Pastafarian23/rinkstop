-- 2026-06-28-team-rsvps-attendance-update-policy.sql
-- Fix RLS policy for attendance updates - coaches/admins can mark any player's attendance
--
-- The fix in 2026-06-26 removed admin role check from team_rsvps_self_update
-- which would prevent coaches from marking attendance for other players.

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

-- Also allow admin INSERT for attendance (when coach marks attendance for player who didn't RSVP)
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
    AND EXISTS (
      SELECT 1 FROM team_events e
      JOIN team_members m ON m.team_id = e.team_id
      WHERE e.id = team_rsvps.event_id
        AND m.user_id = auth.uid()::text
        AND m.left_at IS NULL
        AND m.role IN ('head_coach','assistant_coach','manager','president','vice_president','secretary')
    )
  );