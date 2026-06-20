-- ============================================================
-- Email preferences on profiles
-- ============================================================
-- Adds 6 boolean columns to profiles. Each is checked before sending
-- a transactional email. Defaults:
--
--   email_team_news            = true   (fanout opt-in for team posts)
--   email_team_results         = true
--   email_team_schedule        = true
--   email_connection_requests  = true   (DM requests — Pro+ feature)
--   email_dm_notifications     = true   (offline DMs — Pro+ feature)
--   email_marketing            = false  (off by default; newsletter etc.)
--
-- The settings UI lives at /dashboard/settings/notifications. The
-- marketing column is opt-in (CAN-SPAM compliance).
--
-- All columns are nullable BOOLEAN. NULL is treated as the default
-- when reading — code uses COALESCE.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_team_news BOOLEAN,
  ADD COLUMN IF NOT EXISTS email_team_results BOOLEAN,
  ADD COLUMN IF NOT EXISTS email_team_schedule BOOLEAN,
  ADD COLUMN IF NOT EXISTS email_connection_requests BOOLEAN,
  ADD COLUMN IF NOT EXISTS email_dm_notifications BOOLEAN,
  ADD COLUMN IF NOT EXISTS email_marketing BOOLEAN;

-- Backfill existing rows so a "NULL" preference doesn't surprise us.
-- Using DEFAULT true via UPDATE. Idempotent (re-running is a no-op).
UPDATE profiles SET email_team_news = true WHERE email_team_news IS NULL;
UPDATE profiles SET email_team_results = true WHERE email_team_results IS NULL;
UPDATE profiles SET email_team_schedule = true WHERE email_team_schedule IS NULL;
UPDATE profiles SET email_connection_requests = true WHERE email_connection_requests IS NULL;
UPDATE profiles SET email_dm_notifications = true WHERE email_dm_notifications IS NULL;
UPDATE profiles SET email_marketing = false WHERE email_marketing IS NULL;

-- Comments for future-us
COMMENT ON COLUMN profiles.email_team_news IS
  'Send email when a team this user is a member of posts news. NULL = treat as true.';
COMMENT ON COLUMN profiles.email_team_results IS
  'Send email when a team this user is a member of posts a game result.';
COMMENT ON COLUMN profiles.email_team_schedule IS
  'Send email when a team this user is a member of posts a schedule update.';
COMMENT ON COLUMN profiles.email_connection_requests IS
  'Send email when another user sends a connection request. Pro+ feature.';
COMMENT ON COLUMN profiles.email_dm_notifications IS
  'Send email when an existing connection sends a DM. Pro+ feature.';
COMMENT ON COLUMN profiles.email_marketing IS
  'Marketing / newsletter emails. Default false (opt-in).';
