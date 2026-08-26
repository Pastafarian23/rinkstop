// supabase/migrations/2026-08-26_league_members_pending.sql
--
-- WS17 PR4 Phase 2D: add pending status to league_members
--

ALTER TABLE league_members DROP CONSTRAINT IF EXISTS league_members_status_check;
ALTER TABLE league_members ADD CONSTRAINT league_members_status_check
  CHECK (status IN ('active', 'pending', 'suspended', 'archived'));
