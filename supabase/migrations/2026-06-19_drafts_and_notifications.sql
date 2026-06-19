-- 2026-06-19: Drafts + notifications
--
-- 1. team_schedule: add is_published + published_at so schedule events can
--    be "private to roster" before they're shared publicly. Mirrors the
--    team_news pattern (default true, admin can flip to false for draft).
--
-- 2. team_notifications: per-user inbox of activity from teams the user is
--    a member of. Powers the bell icon on the dashboard.
--    - kind: 'news' | 'result' | 'schedule' | 'announcement' (admin-only)
--    - actor_user_id: who posted (so the notification shows "Arnel posted
--      a news item on Long")
--    - team_id: which team the activity is from
--    - entity_id: optional FK to the post (team_news.id etc)
--    - read_at: NULL = unread, non-null = when user dismissed/marked-read
--    - payload: JSONB with kind-specific extras (title preview, score, etc.)
--
-- 3. team_members: add notify_* preference columns so users can opt out of
--    specific notification types per team.
--
-- 4. Update team_news / team_schedule RLS so admins can read their own
--    drafts (is_published=false) — anon still only sees published.

-- 1. Schedule drafts
ALTER TABLE team_schedule
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Backfill published_at for existing rows that are already published
UPDATE team_schedule
SET published_at = created_at
WHERE is_published = true AND published_at IS NULL;

-- Public SELECT now filters by is_published
DROP POLICY IF EXISTS team_schedule_select_public ON team_schedule;
CREATE POLICY team_schedule_select_public ON team_schedule
  FOR SELECT USING (is_published = true);

-- 2. team_notifications
CREATE TABLE IF NOT EXISTS team_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  team_id       UUID NOT NULL REFERENCES team_workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES profiles(user_id) ON DELETE SET NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('news','result','schedule','announcement')),
  entity_id     UUID,
  title         TEXT NOT NULL,
  body          TEXT,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_notifications_user_unread_idx
  ON team_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS team_notifications_team_idx
  ON team_notifications (team_id, created_at DESC);

ALTER TABLE team_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
DROP POLICY IF EXISTS team_notifications_select_own ON team_notifications;
CREATE POLICY team_notifications_select_own ON team_notifications
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

-- Users can mark their own notifications read
DROP POLICY IF EXISTS team_notifications_update_own ON team_notifications;
CREATE POLICY team_notifications_update_own ON team_notifications
  FOR UPDATE USING (user_id = auth.jwt() ->> 'sub')
  WITH CHECK (user_id = auth.jwt() ->> 'sub');

-- Inserts go through service role only (the API fan-out is server-side)

-- 3. team_members notify prefs (default all on)
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS notify_news BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_results BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_schedule BOOLEAN NOT NULL DEFAULT true;

-- 4. team_news admin read-drafts policy
-- The existing admin_write policy was the only one. Add an admin read.
DROP POLICY IF EXISTS team_news_admin_select ON team_news;
CREATE POLICY team_news_admin_select ON team_news
  FOR SELECT USING ((auth.uid() IS NOT NULL) AND is_team_admin(team_id, (auth.uid())::text));

-- team_schedule admin read-drafts policy (mirror)
DROP POLICY IF EXISTS team_schedule_admin_select ON team_schedule;
CREATE POLICY team_schedule_admin_select ON team_schedule
  FOR SELECT USING ((auth.uid() IS NOT NULL) AND is_team_admin(team_id, (auth.uid())::text));