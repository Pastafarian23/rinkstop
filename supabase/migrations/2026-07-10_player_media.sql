-- 2026-07-10 — Player Media (Phase 1b-3)
-- Prep doc: docs/phase-1b-3-prep-player-media.md
-- Approved by Arnel 2026-07-07 ("use your recommendations and proceed")
--
-- Adds: player_media table (photos + videos at the player level).
-- Storage: 'player-media' bucket (private, 100MB cap, mime-restricted).
-- Path convention: {player_id}/{media_id}/{variant}.{ext}
--
-- Image variants are generated CLIENT-SIDE (browser <canvas>) in v1.
-- No sharp/ffmpeg dependency. Variants are stored as separate files in
-- the same bucket; v1 supports thumbnail/medium/full.
--
-- v2 follow-ups (per Arnel 2026-07-07 13:53 CDT):
--   - Server-side variants via sharp
--   - Server-side video transcoding via ffmpeg
--   - EXIF stripping
--   - HEIC support
--   - AI tagging / face recognition
--   - Public sharing / share-by-link
--   - Org-side media reads
--   - Comments + likes
--   - Bulk import from phone gallery
--   - "Attach photo to this achievement" linking
--   - .mov support
--   - Larger video file cap (500 MB)

BEGIN;

-- =============================================================================
-- player_media
-- =============================================================================

CREATE TABLE public.player_media (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  uploaded_by     text NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,

  media_type      text NOT NULL CHECK (media_type IN ('photo', 'video')),

  -- For photos: 1-3 variants (thumbnail/medium/full). For videos: 1 (original).
  -- Schema: { "original": "...", "thumbnail": "...", "medium": "...", "full": "..." }
  -- For videos, only "original" is set.
  storage_paths   jsonb NOT NULL,

  caption         text CHECK (caption IS NULL OR char_length(caption) <= 200),

  width_px        integer,
  height_px       integer,
  duration_sec    integer,

  file_size_bytes integer NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes < 104857600),  -- 100 MB cap

  is_primary      boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),

  archived_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- v2: trigger-maintained status='archived' for soft-delete (matches 1b-1/1b-2)

COMMENT ON TABLE public.player_media IS
  'Player-level media items (photos + videos). v1 stores originals + client-generated image variants. Videos have no variants in v1.';

COMMENT ON COLUMN public.player_media.storage_paths IS
  'jsonb map of variant → storage path. Photos: {original, thumbnail, medium, full}. Videos: {original} only.';

COMMENT ON COLUMN public.player_media.is_primary IS
  'At most one row per (player_id, media_type) is primary. Application-level invariant; v2 may add a partial unique index.';

CREATE INDEX player_media_player_idx
  ON public.player_media (player_id, created_at DESC)
  WHERE status = 'active';

CREATE INDEX player_media_player_primary_idx
  ON public.player_media (player_id)
  WHERE is_primary = true AND status = 'active';

CREATE INDEX player_media_player_type_idx
  ON public.player_media (player_id, media_type, created_at DESC)
  WHERE status = 'active';

-- =============================================================================
-- RLS — player_media
-- =============================================================================

ALTER TABLE public.player_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY player_media_select ON public.player_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_media.player_id
        AND mp.manager_user_id = current_user_id()
    )
  );

CREATE POLICY player_media_insert ON public.player_media
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_media.player_id
        AND mp.manager_user_id = current_user_id()
    )
    AND uploaded_by = current_user_id()
  );

CREATE POLICY player_media_update ON public.player_media
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_media.player_id
        AND mp.manager_user_id = current_user_id()
    )
  );

-- No DELETE policy in v1. Matches 1b-1 / 1b-2 destructive-action protocol.

COMMIT;
