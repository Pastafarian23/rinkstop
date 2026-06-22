-- ============================================================
-- Coach Feed — player-side aggregated timeline (Day 5)
-- ============================================================
-- Replaces the /dashboard/coach-feed stub with a real aggregated
-- timeline of posts from all teams the user is on (directly or as
-- a parent of a minor player).
--
-- Two new pieces:
--   1. feed_reads — tracks which posts a user has seen (per user
--      per post, polymorphic on (post_table, post_id))
--   2. feed_notifications (optional) — for unread counts and
--      push-style surfacing in the future. NOT in this migration;
--      can be added when the push infrastructure lands.
--
-- RLS:
--   feed_reads: users can read/write their own rows only.
--
-- Backwards compatible: no existing tables changed.

CREATE TABLE IF NOT EXISTS feed_reads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  post_table   TEXT NOT NULL CHECK (post_table IN ('team_news', 'team_results', 'team_schedule')),
  post_id      UUID NOT NULL,
  read_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_table, post_id)
);

CREATE INDEX IF NOT EXISTS feed_reads_user_idx ON feed_reads (user_id, read_at DESC);
CREATE INDEX IF NOT EXISTS feed_reads_post_idx ON feed_reads (post_table, post_id);

ALTER TABLE feed_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feed_reads_select_own" ON feed_reads;
CREATE POLICY "feed_reads_select_own" ON feed_reads
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "feed_reads_insert_own" ON feed_reads;
CREATE POLICY "feed_reads_insert_own" ON feed_reads
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "feed_reads_delete_own" ON feed_reads;
CREATE POLICY "feed_reads_delete_own" ON feed_reads
  FOR DELETE USING (auth.uid()::text = user_id);

-- Idempotent insert helper for the API
CREATE OR REPLACE FUNCTION mark_feed_post_read(
  p_user_id TEXT,
  p_post_table TEXT,
  p_post_id UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO feed_reads (user_id, post_table, post_id)
  VALUES (p_user_id, p_post_table, p_post_id)
  ON CONFLICT (user_id, post_table, post_id)
  DO UPDATE SET read_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Unread count helper (counts posts in the user's feed that have no
-- feed_reads row). Used by the API and any future push notification.
-- Returns an int. Pass the list of (post_table, post_id) tuples the
-- user can see; this counts how many have no matching read.
CREATE OR REPLACE FUNCTION count_unread_feed_posts(
  p_user_id TEXT,
  p_visible_post_ids JSONB -- [{table: "team_news", id: "..."}]
)
RETURNS INTEGER AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO result
  FROM jsonb_to_recordset(p_visible_post_ids) AS v(post_table TEXT, id UUID)
  LEFT JOIN feed_reads r
    ON r.user_id = p_user_id
    AND r.post_table = v.post_table
    AND r.post_id = v.id
  WHERE r.id IS NULL;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
