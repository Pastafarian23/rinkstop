-- A-i: Document distribution + recipient inbox
-- See docs/phase-2-Ai-prep-document-distribution.md
--
-- New table: one row per (document, recipient_user) pair. Parents read their
-- own rows via RLS; admins write via service-role from the upload route.

CREATE TABLE team_document_recipients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id           UUID NOT NULL REFERENCES team_documents(id) ON DELETE CASCADE,
  recipient_user_id     TEXT NOT NULL,
  recipient_player_id   UUID,
  delivered_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at             TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  archived_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, recipient_user_id)
);

CREATE INDEX idx_recipients_user ON team_document_recipients(recipient_user_id);
CREATE INDEX idx_recipients_player ON team_document_recipients(recipient_player_id);
CREATE INDEX idx_recipients_doc ON team_document_recipients(document_id);

ALTER TABLE team_document_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipients_select_own" ON team_document_recipients
  FOR SELECT USING (recipient_user_id = auth.uid()::text);
