-- A-iii: Real e-sign semantics — adds fields required for legally adequate
-- electronic signatures (RA 8792 / ESIGN).
--
-- See docs/phase-2-team-admin-gap-fix.md (Phase A-iii) and the audit doc
-- for the legal reasoning.
--
-- What this migration adds:
--   - consent_to_electronic  BOOLEAN — explicit consent to do business
--                                        electronically (RA 8792 req)
--   - consent_text           TEXT    — exact text user agreed to (audit)
--   - document_hash          TEXT    — sha256 of PDF bytes at sign-time
--                                        (signed artifact = what was shown)
--   - signature_payload      TEXT    — SVG markup of the captured signature
--   - signature_width        INT
--   - signature_height       INT
--   - withdrawn_at           TIMESTAMPTZ
--   - withdrawn_reason       TEXT
--   - withdrawn_by_user_id   TEXT
--
-- A-iii is additive — does NOT remove typed-name fields. Existing signed_by_name
-- and signed_by_role stay (display + audit fallback). All new fields are
-- nullable so legacy rows still load.
--
-- team_documents is empty + document_signatures is empty today, so this is a
-- clean slate — no backfill.

ALTER TABLE document_signatures
  ADD COLUMN IF NOT EXISTS consent_to_electronic BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_text TEXT,
  ADD COLUMN IF NOT EXISTS document_hash TEXT,
  ADD COLUMN IF NOT EXISTS signature_payload TEXT,
  ADD COLUMN IF NOT EXISTS signature_width INTEGER,
  ADD COLUMN IF NOT EXISTS signature_height INTEGER,
  ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS withdrawn_reason TEXT,
  ADD COLUMN IF NOT EXISTS withdrawn_by_user_id TEXT;

-- Audit: index on (document_id, signed_by_user_id) so the admin's "signed-by-who"
-- view can quickly count unique signers per doc, and so the withdrawal flow
-- can find "my signature on this doc" fast.
CREATE INDEX IF NOT EXISTS idx_document_signatures_doc_user
  ON document_signatures (document_id, signed_by_user_id);

-- Audit: index on document_hash for forensic lookups (rare, but legal hold
-- workflows need it).
CREATE INDEX IF NOT EXISTS idx_document_signatures_doc_hash
  ON document_signatures (document_hash)
  WHERE document_hash IS NOT NULL;

-- Storage: the signature_payload SVG is text. For longer files, consider
-- compressing or storing in storage bucket. For now, TEXT is fine — typical
-- signature SVG is ~5-15 KB.