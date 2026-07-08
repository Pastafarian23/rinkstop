-- 2026-07-08 — Self-managed players: players.user_id column
-- Phase 1c-6 (Path A)
-- Approved by Arnel 2026-07-08 12:25 UTC
--
-- Adds a nullable text column linking a player row to a Clerk user. A player
-- becomes "self-managed" when this column is set; until then, only parents
-- can manage them via managed_profiles.
--
-- A future "claim this player as yourself" flow on /players/[slug] will set
-- this column. In v1 we expose the column + index + RLS only; the claim UX
-- ships in a separate piece.

BEGIN;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS user_id text
  REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- One player row per user (defense against duplicate self-claims).
CREATE UNIQUE INDEX IF NOT EXISTS players_user_id_unique
  ON public.players (user_id)
  WHERE user_id IS NOT NULL;

-- Lookup support: "show me my player row" → fast index hit.
CREATE INDEX IF NOT EXISTS players_user_id_idx
  ON public.players (user_id);

COMMENT ON COLUMN public.players.user_id IS
  'Clerk user id when the player self-manages their own row. NULL for directory-only rows or players managed by a parent via managed_profiles.';

-- RLS: a self-managing user can UPDATE their own player row.
-- The actual scope of self-edit (which columns) is enforced by the API
-- route — we just open the row to its owner here.
DROP POLICY IF EXISTS players_self_update ON public.players;
CREATE POLICY players_self_update ON public.players
  FOR UPDATE USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

COMMIT;