-- 2026-07-11 — Direct Messages (Phase 1c-1)
-- Prep doc: docs/phase-1c-1-prep-advanced-messaging.md
-- Approved by Arnel 2026-07-07 (B1: 3 features at a time, ship+verify+audit per feature)
--
-- Adds: direct_message_threads + direct_messages tables.
-- Distinct from team_messages (org-side broadcast).
--
-- Tier gate: sender must be on Identity Plus+ or Business Plus+ (matches the
-- "Advanced messaging" promise on /pricing for both tiers). Receiving is free.
--
-- v2 follow-ups (not in v1):
--   - Real-time updates (SSE/websocket)
--   - Read receipts beyond "read at"
--   - Group DMs
--   - File attachments
--   - Block/mute
--   - Search within messages

BEGIN;

-- =============================================================================
-- direct_message_threads
-- =============================================================================

CREATE TABLE public.direct_message_threads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Canonical ordering: user_a_id < user_b_id lexicographically. This lets
  -- the route find-or-create threads by inserting (min, max) and avoids
  -- the (a,b) vs (b,a) collision.
  user_a_id       text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  user_b_id       text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CHECK (user_a_id < user_b_id),
  UNIQUE (user_a_id, user_b_id)
);

-- v2: add last_message_sender_id for unread-count-by-thread optimization

COMMENT ON TABLE public.direct_message_threads IS
  '1:1 DM threads between two users. Canonical ordering (user_a < user_b) prevents duplicates.';

CREATE INDEX direct_message_threads_user_a_idx
  ON public.direct_message_threads (user_a_id, last_message_at DESC);

CREATE INDEX direct_message_threads_user_b_idx
  ON public.direct_message_threads (user_b_id, last_message_at DESC);

-- =============================================================================
-- direct_messages
-- =============================================================================

CREATE TABLE public.direct_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       uuid NOT NULL REFERENCES public.direct_message_threads(id) ON DELETE CASCADE,
  sender_id       text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  body            text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at      timestamptz NOT NULL DEFAULT now(),
  read_at         timestamptz
);

COMMENT ON TABLE public.direct_messages IS
  'Individual DM messages within a thread. read_at is set by the recipient on thread open.';

CREATE INDEX direct_messages_thread_idx
  ON public.direct_messages (thread_id, created_at DESC);

CREATE INDEX direct_messages_unread_idx
  ON public.direct_messages (thread_id)
  WHERE read_at IS NULL;

CREATE INDEX direct_messages_sender_idx
  ON public.direct_messages (sender_id, created_at DESC);

-- =============================================================================
-- RLS — direct_message_threads
-- =============================================================================

ALTER TABLE public.direct_message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY dm_threads_select ON public.direct_message_threads
  FOR SELECT USING (user_a_id = current_user_id() OR user_b_id = current_user_id());

CREATE POLICY dm_threads_insert ON public.direct_message_threads
  FOR INSERT WITH CHECK (user_a_id = current_user_id() OR user_b_id = current_user_id());

CREATE POLICY dm_threads_update ON public.direct_message_threads
  FOR UPDATE USING (user_a_id = current_user_id() OR user_b_id = current_user_id());

-- No DELETE in v1 (destructive action protocol).

-- =============================================================================
-- RLS — direct_messages
-- =============================================================================

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY dm_messages_select ON public.direct_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.direct_message_threads t
      WHERE t.id = direct_messages.thread_id
        AND (t.user_a_id = current_user_id() OR t.user_b_id = current_user_id())
    )
  );

CREATE POLICY dm_messages_insert ON public.direct_messages
  FOR INSERT WITH CHECK (
    sender_id = current_user_id()
    AND EXISTS (
      SELECT 1 FROM public.direct_message_threads t
      WHERE t.id = direct_messages.thread_id
        AND (t.user_a_id = current_user_id() OR t.user_b_id = current_user_id())
    )
  );

CREATE POLICY dm_messages_update ON public.direct_messages
  FOR UPDATE USING (
    -- A participant who is NOT the sender can mark a message as read.
    sender_id != current_user_id()
    AND EXISTS (
      SELECT 1 FROM public.direct_message_threads t
      WHERE t.id = direct_messages.thread_id
        AND (t.user_a_id = current_user_id() OR t.user_b_id = current_user_id())
    )
  );

-- No DELETE in v1.

COMMIT;
