-- 2026-07-08 — Corrections flow (Phase 2-A0)
-- Approved by Arnel 2026-07-08 ("Work on stage b ... go straight to correction
-- and complete if deemed safe")
-- Prep: docs/phase-2-A0-prep-corrections-flow.md
--
-- Any signed-in user can submit a correction when they see information that's
-- wrong. Admin reviews every submission before any data changes. The flow is
-- spam-protected at the API layer (account-age, rate-limit, one-open-per-field,
-- min-content) and the database schema is the durable record.
--
-- Players-only apply in v1 — the table accepts team/rink/league but those
-- statuses land as 'review_required' since no auto-apply path exists for them.

BEGIN;

CREATE TABLE IF NOT EXISTS public.corrections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type       text NOT NULL CHECK (entity_type IN ('player', 'team', 'rink', 'league')),
  entity_id         text NOT NULL,
  field_name        text NOT NULL,
  current_value     text,
  proposed_value    text NOT NULL,
  reason            text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 1000),
  submitter_user_id text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'review_required')),
  reviewer_user_id  text REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  reviewer_note     text,
  submitted_at      timestamptz NOT NULL DEFAULT now(),
  reviewed_at       timestamptz
);

COMMENT ON TABLE public.corrections IS
  'User-submitted corrections to directory data. Spam-protected at API layer; reviewed by admin before any data change.';

COMMENT ON COLUMN public.corrections.entity_type IS
  'player | team | rink | league. v1 auto-apply only for player; others land as review_required.';

COMMENT ON COLUMN public.corrections.status IS
  'pending (awaiting admin) | approved (applied) | rejected (denied) | review_required (admin must edit the row manually).';

-- One open correction per (submitter, entity, field) — the spam-protection
-- check is also enforced in the API, but the partial unique index is the
-- structural defense against concurrent submissions slipping through.
CREATE UNIQUE INDEX IF NOT EXISTS corrections_one_open_per_field
  ON public.corrections (submitter_user_id, entity_type, entity_id, field_name)
  WHERE status = 'pending';

-- Admin queue ordering
CREATE INDEX IF NOT EXISTS corrections_status_submitted_idx
  ON public.corrections (status, submitted_at DESC)
  WHERE status = 'pending';

-- User's own list
CREATE INDEX IF NOT EXISTS corrections_submitter_idx
  ON public.corrections (submitter_user_id, submitted_at DESC);

-- Entity lookup (for the corrections-mine page and admin filters)
CREATE INDEX IF NOT EXISTS corrections_entity_idx
  ON public.corrections (entity_type, entity_id);

-- RLS: admin reads + writes everything via service role key. Users read
-- their own submissions. Submissions are INSERT-only for users (handled by
-- API route, not direct RLS — service role inserts after spam checks).
ALTER TABLE public.corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY corrections_select_own ON public.corrections
  FOR SELECT USING (submitter_user_id = current_user_id());

-- No INSERT/UPDATE/DELETE policies for non-admin users — the API uses
-- supabaseAdmin which bypasses RLS, so users cannot bypass the spam
-- checks by hitting the table directly.

COMMIT;