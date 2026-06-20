-- ============================================================
-- is_team_admin() — widen to 12 roles (coaching + board)
-- ============================================================
-- Member Roles Audit 2026-06-19, Finding 1.
--
-- Before: only the 6 coaching/manager roles could post team_news,
--         team_results, and team_schedule. A team president or
--         treasurer (the most active admins in parent-run minor
--         hockey orgs) could not post anything.
--
-- After:  the 6 board roles (president, vice_president, secretary,
--         treasurer, board_member, safety_officer) can also post.
--
-- Backwards compatible: roles are added, none removed. The 6
-- coaching roles keep their existing access.
--
-- No other policies, tables, or functions change. This is a
-- surgical widening of one helper function.

CREATE OR REPLACE FUNCTION is_team_admin(p_team_id UUID, p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members m
    WHERE m.team_id = p_team_id
      AND m.user_id = p_user_id
      AND m.left_at IS NULL
      AND m.role IN (
        'head_coach','assistant_coach','goalie_coach','skills_coach',
        'manager','team_staff',
        'president','vice_president','secretary','treasurer',
        'board_member','safety_officer'
      )
  );
$$;
