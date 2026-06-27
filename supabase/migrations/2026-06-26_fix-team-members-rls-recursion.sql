-- Fix: Infinite recursion in team_members RLS policy
-- The SELECT policy joins team_members within itself, causing recursion

-- 1. Create security-definer function to check membership without RLS
CREATE OR REPLACE FUNCTION public.is_team_member(_team_id uuid, _user_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = _team_id
      AND user_id = _user_id
      AND left_at IS NULL
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, text) TO authenticated;

-- 2. Fix team_members policy to use the function
DROP POLICY IF EXISTS "team_members_select_roster" ON team_members;
CREATE POLICY "team_members_select_roster" ON team_members
  FOR SELECT USING (
    user_id = auth.uid()::text
    OR is_team_member(team_members.team_id, auth.uid()::text)
  );

-- 3. Fix team_rsvps policies to use the function (prevents recursion chain)
DROP POLICY IF EXISTS "team_rsvps_select_roster" ON team_rsvps;
CREATE POLICY "team_rsvps_select_roster" ON team_rsvps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_events e
      WHERE e.id = team_rsvps.event_id
        AND is_team_member(e.team_id, auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS "team_rsvps_self_write" ON team_rsvps;
CREATE POLICY "team_rsvps_self_write" ON team_rsvps
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM team_events e
      WHERE e.id = team_rsvps.event_id
        AND is_team_member(e.team_id, auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS "team_rsvps_self_update" ON team_rsvps;
CREATE POLICY "team_rsvps_self_update" ON team_rsvps
  FOR UPDATE USING (
    user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM team_events e
      WHERE e.id = team_rsvps.event_id
        AND is_team_member(e.team_id, auth.uid()::text)
    )
  );

-- Set search_path for the function to use public schema
ALTER FUNCTION public.is_team_member(uuid, text) SET search_path = public;