-- 2026-07-06 — Player Documents (Phase 1b-1)
-- Prep doc: docs/phase-1b-player-documents-prep.md (v1.0, 2026-07-06)
-- Approved by Arnel 2026-07-06 07:33 CDT (Telegram msg #32742)
--
-- Adds two new tables:
--   player_documents         — uploaded documents at the player level
--   player_document_audit    — per-action audit log (upload, replace, archive, view, download)
--
-- Storage:
--   Bucket "player-documents" (Supabase Storage, private, signed URLs only)
--   Created in Supabase Dashboard by Arnel after this migration applies.
--   Path convention: {player_id}/{document_id}/{filename}
--
-- Out of scope (deferred to 1b-2/1b-3/Phase 2):
--   - player_achievements, player_timeline_events, player_media
--   - consumer_notifications (expiry-based notifications)
--   - family_org_invitations (parent -> org flow)
--   - org-side document reads (parent controls visibility; org requests are a future piece)
--   - hard DELETE in v1 (archive only)
--
-- v2 follow-ups (per Arnel 2026-07-06 06:57):
--   - Add trigger or scheduled job to maintain status='expired' from expires_at
--   - Add co-parent upload (parent_links table or expanded RLS)
--   - Reconsider minor_consent_revoked_at IS NULL check in RLS

BEGIN;

-- =============================================================================
-- player_documents
-- =============================================================================

CREATE TABLE public.player_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  uploaded_by     text NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
  category        text NOT NULL CHECK (category IN (
                    'birth_certificate', 'waiver', 'medical_form',
                    'vaccination_record', 'proof_of_residence',
                    'photo_id', 'other'
                  )),
  title           text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description     text CHECK (description IS NULL OR char_length(description) <= 500),
  storage_path    text NOT NULL,
  file_name       text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes < 26214400),  -- 25 MB cap
  mime_type       text NOT NULL CHECK (mime_type IN (
                    'application/pdf',
                    'image/jpeg', 'image/png', 'image/heic', 'image/webp'
                  )),
  expires_at      date,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'archived')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- v2: add trigger to maintain status='expired' from expires_at < now()
-- v2: add co-parent upload policy (parent_links table or expanded managed_profiles check)

COMMENT ON TABLE public.player_documents IS
  'Player-level uploaded documents (birth certificates, waivers, medical forms, etc.). Parent-controlled visibility; v1: parent reads, no org-side reads. Status expired is computed-on-read in v1 (see route code).';

COMMENT ON COLUMN public.player_documents.storage_path IS
  'Path within the player-documents Supabase Storage bucket. Convention: {player_id}/{document_id}/{filename}';

COMMENT ON COLUMN public.player_documents.expires_at IS
  'Optional. For waivers, medical forms, vaccination records. v1: status="expired" is computed-on-read when expires_at < current_date. v2: add trigger or scheduled job to maintain this.';

CREATE INDEX player_documents_player_idx
  ON public.player_documents (player_id, created_at DESC);

CREATE INDEX player_documents_player_status_idx
  ON public.player_documents (player_id, status)
  WHERE status = 'active';

CREATE INDEX player_documents_player_expires_idx
  ON public.player_documents (player_id, expires_at)
  WHERE expires_at IS NOT NULL AND status = 'active';

-- =============================================================================
-- player_document_audit
-- =============================================================================

CREATE TABLE public.player_document_audit (
  id              bigserial PRIMARY KEY,
  document_id     uuid NOT NULL REFERENCES public.player_documents(id) ON DELETE CASCADE,
  actor_user_id   text NOT NULL REFERENCES public.profiles(user_id),
  action          text NOT NULL CHECK (action IN ('upload', 'replace', 'archive', 'view', 'download')),
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.player_document_audit IS
  'Per-action audit log for player_documents. Cheap insurance for future org-side reads (parental "who saw my kid''s medical form" answers). v1: written on upload, replace, archive, view (signed URL mint), and download.';

CREATE INDEX player_document_audit_document_idx
  ON public.player_document_audit (document_id, created_at DESC);

CREATE INDEX player_document_audit_actor_idx
  ON public.player_document_audit (actor_user_id, created_at DESC);

-- =============================================================================
-- RLS — player_documents
-- =============================================================================

ALTER TABLE public.player_documents ENABLE ROW LEVEL SECURITY;

-- Read: managed-profile relationship covers both parent-of-player AND player-self
-- (a player over 18 with their own Clerk account adds a managed_profiles row
-- with manager_user_id = own_user_id, profile_id = own_player_id).
-- Verified 2026-07-06: players table has no user_id column; the parent/manager
-- relationship is the single source of truth for "who can see this player's docs".
CREATE POLICY player_documents_select ON public.player_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_documents.player_id
        AND mp.manager_user_id = current_user_id()
    )
  );

-- Insert: parent of the player only (v1 — co-parent in v2)
-- Note: per Arnel 2026-07-06 06:57, no minor_consent_revoked_at check in v1.
--       Consent is re-asserted at upload time via the API route; route writes
--       managed_profiles.parent_consent_at = now() when applicable.
CREATE POLICY player_documents_insert ON public.player_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_documents.player_id
        AND mp.manager_user_id = current_user_id()
    )
    AND uploaded_by = current_user_id()
  );

-- Update: parent of the player only (v1). Used for archive (status='archived')
-- and replace (which in v1 is "insert new row + update old row to status='archived'").
CREATE POLICY player_documents_update ON public.player_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_documents.player_id
        AND mp.manager_user_id = current_user_id()
    )
  );

-- No DELETE policy in v1. Archive is the only way to "remove" a document.
-- v2: hard DELETE may be added for admin/parent purge flows.

-- =============================================================================
-- RLS — player_document_audit
-- =============================================================================

ALTER TABLE public.player_document_audit ENABLE ROW LEVEL SECURITY;

-- Read: parent of the linked player (so they can answer "who accessed my kid's docs?")
-- No self-read for players in v1; v2 may add it.
CREATE POLICY player_document_audit_select ON public.player_document_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.player_documents pd
      JOIN public.managed_profiles mp ON mp.profile_id = pd.player_id
      WHERE pd.id = player_document_audit.document_id
        AND mp.manager_user_id = current_user_id()
    )
  );

-- Insert: server-side only (via supabaseAdmin in the API route, which bypasses RLS).
-- No policy needed for the public/authenticated role; server uses service_role key.

COMMIT;
