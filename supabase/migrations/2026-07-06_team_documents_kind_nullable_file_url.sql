-- A-0: Federation-template fix
-- See docs/phase-2-team-admin-audit.md + docs/phase-2-A0-prep-federation-template-fix.md
--
-- Bug: route src/app/api/team/[slug]/apply-federation-template/route.ts:71-77
--   - inserts with `kind` column that does not exist
--   - omits `file_url` which is currently NOT NULL
--   - federation-template POST returns 500 on every call
--
-- Fix:
--   - add `kind TEXT` so the route's insert succeeds
--   - make `file_url` nullable so federation-template placeholders can be inserted
--     before an admin uploads the real file
--
-- Forward-only. Both changes are strictly loosening — no existing queries break.
-- team_documents is empty as of 2026-07-06, so no backfill concern.

ALTER TABLE team_documents
  ADD COLUMN IF NOT EXISTS kind TEXT;

ALTER TABLE team_documents
  ALTER COLUMN file_url DROP NOT NULL;

-- Optional index for the federation-doc-kind lookup the route uses
-- (federation.requiredDocKinds filter by existing kind)
CREATE INDEX IF NOT EXISTS idx_team_documents_team_kind
  ON team_documents (team_id, kind)
  WHERE kind IS NOT NULL;