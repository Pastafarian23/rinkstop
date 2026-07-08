-- 2026-07-08 — Add reviewer columns to claims table (Phase 3-A0)
-- Approved by Arnel 2026-07-08 (Path X — claims approval + player self-claim)
-- Prep: docs/phase-3-A0-prep-claims-approval.md
--
-- The claims table was missing the columns an admin review needs to store:
-- reviewer_user_id, reviewer_note, reviewed_at. Adding them now so the
-- /admin/claims queue has somewhere to record the decision.
--
-- These are nullable so existing pending claims don't need backfilling.

BEGIN;

ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS reviewer_user_id text
  REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS reviewer_note text;

ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

COMMENT ON COLUMN public.claims.reviewer_user_id IS
  'Clerk user id of the admin who approved/rejected the claim. NULL for pending.';

COMMENT ON COLUMN public.claims.reviewer_note IS
  'Optional note from the reviewer (visible to the submitter).';

COMMENT ON COLUMN public.claims.reviewed_at IS
  'When the reviewer acted. NULL for pending.';

COMMIT;