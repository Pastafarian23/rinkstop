-- A-iv: cascade safety + idempotent withdrawal.
-- See docs/phase-2-Aiv-prep-cascade-withdrawal.md
--
-- Two changes:
--   1. FK on document_signatures.document_id: CASCADE → RESTRICT.
--      Deleting a doc that has signatures should fail loudly with 409
--      (handled by the DELETE route). Today a hard delete silently wipes
--      signatures, which is a real audit/compliance bug.
--   2. UNIQUE on (document_id, signed_by_user_id). Makes withdrawal
--      idempotent and prevents accidental double-signs (parent double-
--      clicks → DB error → UI handles as 409).
--
-- Both are safe today: 0 docs and 0 signatures exist (verified 2026-07-07
-- 08:36 CDT). Forward-only.

ALTER TABLE document_signatures
  DROP CONSTRAINT document_signatures_document_id_fkey;

ALTER TABLE document_signatures
  ADD CONSTRAINT document_signatures_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES team_documents(id) ON DELETE RESTRICT;

ALTER TABLE document_signatures
  ADD CONSTRAINT document_signatures_user_unique
  UNIQUE (document_id, signed_by_user_id);
