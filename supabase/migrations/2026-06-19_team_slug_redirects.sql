-- 2026-06-19: team_slug_redirects
--
-- When a workspace slug changes, save the old slug so we can 301-redirect
-- /dashboard/team/[old] and /directory/teams/[old] to the new slug. Used
-- for invite codes, shared links, search engine cached URLs, and any
-- references the team might have given out before the rename.
--
-- Old slugs are unique (one row per from_slug). If the team renames
-- again, the upsert updates the same row to point to the latest slug.
--
-- Public SELECT — anyone can read redirects. They're public knowledge.
-- Writes only via service role (admin API endpoint).

CREATE TABLE IF NOT EXISTS team_slug_redirects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_slug   TEXT NOT NULL UNIQUE,
  to_slug     TEXT NOT NULL,
  team_id     UUID NOT NULL REFERENCES team_workspaces(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_slug_redirects_team_idx ON team_slug_redirects(team_id);

ALTER TABLE team_slug_redirects ENABLE ROW LEVEL SECURITY;

-- Public read so the middleware can serve redirects to anonymous users.
DROP POLICY IF EXISTS team_slug_redirects_select_public ON team_slug_redirects;
CREATE POLICY team_slug_redirects_select_public ON team_slug_redirects
  FOR SELECT USING (true);

-- No public write — only service role (admin client) inserts here.