-- 2026-10-01 (Arnel data-integrity audit, P2 follow-up):
-- Backfill leagues.updated_at = created_at for legacy batch-imported
-- rows where updated_at is null or equal to created_at. This makes
-- the "Last updated ${date}" string on /directory/leagues/[id] render
-- for every league (not just the 71% that have a real updated_at).
--
-- We use created_at, not NOW(). NOW() would falsely claim the data
-- is fresh as of today. created_at is the truthful answer for legacy
-- batch imports — "we have not touched this league data since import."
--
-- Audit reference: memory/2026-10-01-data-integrity-audit.md, P2.

UPDATE leagues
SET updated_at = created_at
WHERE updated_at IS NULL
   OR updated_at = created_at;

