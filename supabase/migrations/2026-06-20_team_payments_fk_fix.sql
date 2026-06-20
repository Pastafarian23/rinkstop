-- ============================================================
-- Fix FK references: teams(id) → team_workspaces(id)
-- ============================================================
-- The 2026-06-20 migration referenced `teams(id)` (NHL-imported),
-- but the user-facing team dashboard uses `team_workspaces(id)`.
-- Drop existing FKs and recreate against the correct table.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_team_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES team_workspaces(id) ON DELETE CASCADE;

ALTER TABLE team_documents DROP CONSTRAINT IF EXISTS team_documents_team_id_fkey;
ALTER TABLE team_documents ADD CONSTRAINT team_documents_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES team_workspaces(id) ON DELETE CASCADE;