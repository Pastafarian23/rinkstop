-- 2026-06-19_team_public_posts.sql
--
-- Public-facing content for team hubs. Populated by team admins from the workspace,
-- displayed on the public profile page at /teams/[slug].
--
-- Three separate tables (Arnel decision 2026-06-19, msg #19656):
--   team_news      — editorial posts (title + body)
--   team_results   — game results (immutable once posted)
--   team_schedule  — upcoming games (mutable: reschedule, cancel, add)
--
-- RLS model:
--   SELECT — open to anon + authenticated. Public profile is publicly viewable.
--   INSERT / UPDATE / DELETE — team admins only (head_coach, assistant_coach,
--     goalie_coach, skills_coach, manager, team_staff).
--
-- IMPORTANT: Admin checks use a SECURITY DEFINER function (`is_team_admin()`)
-- instead of inline EXISTS over team_members. Reason: inline EXISTS triggers
-- Postgres's RLS-recursion detector when the same query plans the sub-query's
-- own RLS policies, which causes "infinite recursion detected in policy"
-- (SQLSTATE 42P17) for anon/foreign users. A SECURITY DEFINER function runs
-- as the function owner (postgres) and bypasses RLS, so the EXISTS check
-- doesn't recurse.

BEGIN;

-- ============================================================
-- is_team_admin(team_uuid, user_uuid) — SECURITY DEFINER
-- ============================================================
-- Returns true when the given user has an admin role on the given team.
-- Used by RLS policies to gate INSERT/UPDATE/DELETE on public-post tables.
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
        'manager','team_staff'
      )
  );
$$;

-- ============================================================
-- team_news
-- ============================================================
CREATE TABLE IF NOT EXISTS team_news (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES team_workspaces(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE RESTRICT,
  title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  body          TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
  is_published  BOOLEAN NOT NULL DEFAULT true,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_news_team_published_idx
  ON team_news (team_id, published_at DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS team_news_author_idx ON team_news (author_user_id);

ALTER TABLE team_news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_news_select_public" ON team_news;
CREATE POLICY "team_news_select_public" ON team_news
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "team_news_insert_admin" ON team_news;
CREATE POLICY "team_news_insert_admin" ON team_news
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_team_admin(team_news.team_id, auth.uid()::text)
    AND team_news.author_user_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "team_news_update_admin" ON team_news;
CREATE POLICY "team_news_update_admin" ON team_news
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND is_team_admin(team_news.team_id, auth.uid()::text)
  );

DROP POLICY IF EXISTS "team_news_delete_admin" ON team_news;
CREATE POLICY "team_news_delete_admin" ON team_news
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND is_team_admin(team_news.team_id, auth.uid()::text)
  );

-- ============================================================
-- team_results
-- ============================================================
CREATE TABLE IF NOT EXISTS team_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES team_workspaces(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE RESTRICT,
  game_date     DATE NOT NULL,
  opponent      TEXT NOT NULL CHECK (char_length(opponent) BETWEEN 1 AND 120),
  home_away     TEXT NOT NULL CHECK (home_away IN ('home','away','neutral')),
  our_score     INTEGER NOT NULL CHECK (our_score >= 0 AND our_score <= 99),
  their_score   INTEGER NOT NULL CHECK (their_score >= 0 AND their_score <= 99),
  outcome       TEXT GENERATED ALWAYS AS (
    CASE
      WHEN our_score > their_score THEN 'W'
      WHEN our_score < their_score THEN 'L'
      ELSE 'T'
    END
  ) STORED,
  notes         TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_results_team_date_idx
  ON team_results (team_id, game_date DESC);

CREATE INDEX IF NOT EXISTS team_results_author_idx ON team_results (author_user_id);

ALTER TABLE team_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_results_select_public" ON team_results;
CREATE POLICY "team_results_select_public" ON team_results
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "team_results_insert_admin" ON team_results;
CREATE POLICY "team_results_insert_admin" ON team_results
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_team_admin(team_results.team_id, auth.uid()::text)
    AND team_results.author_user_id = auth.uid()::text
  );

-- No UPDATE on results — historical data should be immutable. If a coach
-- fat-fingers a score, delete + repost.
DROP POLICY IF EXISTS "team_results_update_admin" ON team_results;
CREATE POLICY "team_results_update_admin" ON team_results
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "team_results_delete_admin" ON team_results;
CREATE POLICY "team_results_delete_admin" ON team_results
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND is_team_admin(team_results.team_id, auth.uid()::text)
  );

-- ============================================================
-- team_schedule
-- ============================================================
CREATE TABLE IF NOT EXISTS team_schedule (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES team_workspaces(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE RESTRICT,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  opponent      TEXT CHECK (opponent IS NULL OR char_length(opponent) <= 120),
  -- 'game' | 'practice' | 'tournament' | 'meeting' | 'other'
  kind          TEXT NOT NULL DEFAULT 'game'
                CHECK (kind IN ('game','practice','tournament','meeting','other')),
  venue         TEXT CHECK (venue IS NULL OR char_length(venue) <= 200),
  home_away     TEXT CHECK (home_away IS NULL OR home_away IN ('home','away','neutral')),
  notes         TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
  is_cancelled  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_schedule_team_time_idx
  ON team_schedule (team_id, scheduled_at)
  WHERE is_cancelled = false;

CREATE INDEX IF NOT EXISTS team_schedule_author_idx ON team_schedule (author_user_id);

ALTER TABLE team_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_schedule_select_public" ON team_schedule;
CREATE POLICY "team_schedule_select_public" ON team_schedule
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "team_schedule_insert_admin" ON team_schedule;
CREATE POLICY "team_schedule_insert_admin" ON team_schedule
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_team_admin(team_schedule.team_id, auth.uid()::text)
    AND team_schedule.author_user_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "team_schedule_update_admin" ON team_schedule;
CREATE POLICY "team_schedule_update_admin" ON team_schedule
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND is_team_admin(team_schedule.team_id, auth.uid()::text)
  );

DROP POLICY IF EXISTS "team_schedule_delete_admin" ON team_schedule;
CREATE POLICY "team_schedule_delete_admin" ON team_schedule
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND is_team_admin(team_schedule.team_id, auth.uid()::text)
  );

-- ============================================================
-- updated_at triggers
-- ============================================================
DROP TRIGGER IF EXISTS team_news_set_updated_at ON team_news;
CREATE TRIGGER team_news_set_updated_at
  BEFORE UPDATE ON team_news
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS team_schedule_set_updated_at ON team_schedule;
CREATE TRIGGER team_schedule_set_updated_at
  BEFORE UPDATE ON team_schedule
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
