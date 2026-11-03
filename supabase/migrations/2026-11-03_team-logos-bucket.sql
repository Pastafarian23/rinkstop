-- 2026-11-03_team-logos-bucket.sql
-- Storage bucket for team logos (team_workspaces.avatar_url).
-- Public read, service-role write (upload API uses supabaseAdmin).
--
-- Files are named {team_id}/{uuid}.{ext} so ownership is encoded in the path.
-- Path collisions between teams are impossible.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-logos',
  'team-logos',
  true,                      -- public read (anyone can see team logos)
  5 * 1024 * 1024,           -- 5 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;