-- ============================================================
-- Workspace dismiss — join table on profiles
-- ============================================================
-- Lets a user hide workspaces they don't use (e.g. a player who never
-- coaches can dismiss the Coach workspace without losing access if they
-- later upgrade). The workspace reappears when they tap "Show all" in
-- settings or restore individually from the dashboard footer.
--
-- Why a join table (profile_dismissed_workspaces) and not a text[] column
-- on profiles:
--   1. We expect to want `dismissed_at` for "dismissed 3 days ago" UI,
--      restore-stale-dismissions prompts, and a count badge.
--   2. We expect to want `reason` (enum: not_relevant, too_complex,
--      temporary, other) — gives product signal on which workspaces users
--      find unhelpful.
--   3. Per-row RLS is cleaner than filtering a column array.
--   4. Indexed lookup on (profile_user_id) is the same cost as reading a
--      column from profiles. No perf regression vs text[].
--   5. If we ever want a hot-path array cache on profiles, we can add it
--      as a denormalization later — but starting from the table means we
--      never have to migrate data when those features ship.
--
-- Additive only. No FK changes to existing tables. profiles.user_id is
-- pre-existing (used by referee_attendance and other tables). No data
-- mutation. Production behavior unchanged.
--
-- Per Workstream 1 Rule 6 (Zero Data Mutation): only DDL.
-- Per Workstream 1 Rule 9 (No Existing Foreign Keys Change): new FK only
-- from new table TO existing profiles.user_id.

CREATE TABLE IF NOT EXISTS public.profile_dismissed_workspaces (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_user_id  text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  workspace_id     text NOT NULL,
  dismissed_at     timestamptz NOT NULL DEFAULT NOW(),
  reason           text CHECK (reason IS NULL OR reason IN ('not_relevant', 'too_complex', 'temporary', 'other')),
  UNIQUE (profile_user_id, workspace_id)
);

-- Hot-path index: dashboard layout reads dismissed workspaces on every render.
-- Single-row lookup by profile_user_id covers the typical case (1-N small).
CREATE INDEX IF NOT EXISTS idx_pdw_profile
  ON public.profile_dismissed_workspaces(profile_user_id);

-- RLS: a user can read and modify only their own dismiss rows.
ALTER TABLE public.profile_dismissed_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own dismisses"
  ON public.profile_dismissed_workspaces FOR SELECT
  USING (profile_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users insert own dismisses"
  ON public.profile_dismissed_workspaces FOR INSERT
  WITH CHECK (profile_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users delete own dismisses"
  ON public.profile_dismissed_workspaces FOR DELETE
  USING (profile_user_id = auth.jwt() ->> 'sub');

-- Comment for future readers / psql \d+
COMMENT ON TABLE public.profile_dismissed_workspaces IS
  'Workspaces a user has hidden from their dashboard nav. One row per (user, workspace). Source of truth for the dashboard layout filter.';
COMMENT ON COLUMN public.profile_dismissed_workspaces.workspace_id IS
  'Workspace id matching src/lib/dashboard/workspaces.ts WorkspaceDef.id (e.g. ''coach'', ''referee'', ''team'').';
COMMENT ON COLUMN public.profile_dismissed_workspaces.reason IS
  'Optional user-supplied reason. NULL = no reason given. Values: not_relevant, too_complex, temporary, other.';
