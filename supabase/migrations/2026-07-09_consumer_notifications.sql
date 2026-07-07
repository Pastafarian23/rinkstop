-- 2026-07-09 — Consumer Notifications (Phase 1b-4)
-- Prep doc: docs/phase-1b-4-prep-consumer-notifications.md
-- Approved by Arnel 2026-07-07 ("use your recommendations and proceed")
--
-- Adds: consumer_notifications table (personal inbox of events
-- derived from 1b-1 documents, 1b-2 achievements, and identity verification).
--
-- Distinct from team_notifications (which is org-side activity). The bell
-- component combines both channels.
--
-- v2 follow-ups (per Arnel 2026-07-07 13:21 CDT):
--   - Email channel integration
--   - Push notifications (mobile)
--   - Kind-level mute preferences
--   - Daily digest
--   - Postgres trigger on player_documents.expires_at

BEGIN;

-- =============================================================================
-- consumer_notifications
-- =============================================================================

CREATE TABLE public.consumer_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,

  kind            text NOT NULL CHECK (kind IN (
                    'document_expiring_30d',
                    'document_expiring_7d',
                    'document_expiring_1d',
                    'document_expired',
                    'identity_renewal_due',
                    'achievement_added'
                  )),

  -- Idempotency: same user + same source_key + same kind can only exist once.
  -- Re-derivation may DELETE+INSERT a previously-read row to refresh.
  source_key      text NOT NULL,

  player_id       uuid REFERENCES public.players(id) ON DELETE CASCADE,

  title           text NOT NULL,
  body            text,

  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,

  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, source_key, kind)
);

-- v2: include 'achievement_added' as a real kind with optional linking.

COMMENT ON TABLE public.consumer_notifications IS
  'Personal notifications for parents/guardians. Derived from documents, achievements, and identity. Distinct from team_notifications (org-side).';

CREATE INDEX consumer_notifications_user_unread_idx
  ON public.consumer_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX consumer_notifications_user_read_idx
  ON public.consumer_notifications (user_id, read_at)
  WHERE read_at IS NOT NULL;

CREATE INDEX consumer_notifications_player_idx
  ON public.consumer_notifications (player_id, created_at DESC);

-- =============================================================================
-- RLS — consumer_notifications
-- =============================================================================

ALTER TABLE public.consumer_notifications ENABLE ROW LEVEL SECURITY;

-- Read: only the user can see their own notifications.
CREATE POLICY consumer_notifications_select_own ON public.consumer_notifications
  FOR SELECT USING (user_id = current_user_id());

-- Mark-as-read: only the user can update their own notifications.
-- v2 may add a "dismiss" semantic; v1 only supports read_at marking.
CREATE POLICY consumer_notifications_update_own ON public.consumer_notifications
  FOR UPDATE USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- No DELETE policy in v1. Server-side cleanup is allowed via service-role
-- for re-derivation DELETE+INSERT semantics.

COMMIT;
