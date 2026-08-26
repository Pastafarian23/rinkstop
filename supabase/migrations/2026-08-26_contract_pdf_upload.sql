-- ============================================================
-- WS17 PR4 Phase 2C: Contract PDF Upload
-- Adds document storage columns to rink_contracts.
-- ============================================================

ALTER TABLE rink_contracts
  ADD COLUMN IF NOT EXISTS document_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS file_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS uploaded_by_user_id UUID REFERENCES auth.users(id);
