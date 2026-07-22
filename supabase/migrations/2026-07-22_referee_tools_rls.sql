-- ============================================================
-- WS4 PR2 — Referee Tools RLS policies
-- ============================================================
-- Mirrors the patterns in 2026-07-22_stamps_rls_policies.sql:
--   - Referees can SELECT their own rows (own_user_id = auth.uid()::text)
--   - Referees can INSERT/UPDATE their own rows for status transitions
--     that are within their control (attendance check-in/out, payment
--     marking as paid). Other status transitions are staff-only.
--   - Staff (profiles.role IN ('admin','super_admin')) can SELECT all
--     and INSERT/UPDATE anything.
--
-- Per the WS4 spec chunk 2: staff write paths are the only path to
-- create an assignment or set the payment amount. The referee self-
-- serves confirm/decline/check-in/check-out/mark-paid.

-- Enable RLS on all three tables (idempotent).
ALTER TABLE public.referee_game_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referee_attendance       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referee_payments         ENABLE ROW LEVEL SECURITY;

-- ─── referee_game_assignments ────────────────────────────────
-- Read: ref sees own; staff sees all.
DROP POLICY IF EXISTS rga_select_self_or_staff ON public.referee_game_assignments;
CREATE POLICY rga_select_self_or_staff ON public.referee_game_assignments
  FOR SELECT
  USING (
    referee_user_id = (auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (auth.uid()::text)
        AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insert: staff only (chunk 2). Future chunks may let league/team
-- admins insert for events they own.
DROP POLICY IF EXISTS rga_insert_staff ON public.referee_game_assignments;
CREATE POLICY rga_insert_staff ON public.referee_game_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (auth.uid()::text)
        AND p.role IN ('admin', 'super_admin')
    )
  );

-- Update: ref can update own for confirm/decline (status IN
-- ('assigned','confirmed','declined')). Staff can update any.
DROP POLICY IF EXISTS rga_update_self_or_staff ON public.referee_game_assignments;
CREATE POLICY rga_update_self_or_staff ON public.referee_game_assignments
  FOR UPDATE
  USING (
    referee_user_id = (auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (auth.uid()::text)
        AND p.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    referee_user_id = (auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (auth.uid()::text)
        AND p.role IN ('admin', 'super_admin')
    )
  );

-- Delete: staff only.
DROP POLICY IF EXISTS rga_delete_staff ON public.referee_game_assignments;
CREATE POLICY rga_delete_staff ON public.referee_game_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (auth.uid()::text)
        AND p.role IN ('admin', 'super_admin')
    )
  );

-- ─── referee_attendance ──────────────────────────────────────
-- Read: ref sees own; staff sees all.
DROP POLICY IF EXISTS ra_select_self_or_staff ON public.referee_attendance;
CREATE POLICY ra_select_self_or_staff ON public.referee_attendance
  FOR SELECT
  USING (
    referee_user_id = (auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (auth.uid()::text)
        AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insert: ref for self (via service layer for writes from API routes).
-- For chunk 2 the service uses supabaseAdmin, so RLS doesn't gate the
-- actual write; this policy is here for direct-insert safety in case
-- future code goes through the user-scoped client.
DROP POLICY IF EXISTS ra_insert_self ON public.referee_attendance;
CREATE POLICY ra_insert_self ON public.referee_attendance
  FOR INSERT
  WITH CHECK (
    referee_user_id = (auth.uid()::text)
  );

-- Update: ref for own attendance state; staff can override anything.
DROP POLICY IF EXISTS ra_update_self_or_staff ON public.referee_attendance;
CREATE POLICY ra_update_self_or_staff ON public.referee_attendance
  FOR UPDATE
  USING (
    referee_user_id = (auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (auth.uid()::text)
        AND p.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    referee_user_id = (auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (auth.uid()::text)
        AND p.role IN ('admin', 'super_admin')
    )
  );

-- ─── referee_payments ────────────────────────────────────────
-- Read: ref sees own; staff sees all.
DROP POLICY IF EXISTS rp_select_self_or_staff ON public.referee_payments;
CREATE POLICY rp_select_self_or_staff ON public.referee_payments
  FOR SELECT
  USING (
    referee_user_id = (auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (auth.uid()::text)
        AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insert / Update: staff only (staff sets amount; referee can flip
-- status to 'paid' once they receive payment, but for chunk 2 that's
-- also a staff operation via the service layer).
DROP POLICY IF EXISTS rp_insert_staff ON public.referee_payments;
CREATE POLICY rp_insert_staff ON public.referee_payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (auth.uid()::text)
        AND p.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS rp_update_staff ON public.referee_payments;
CREATE POLICY rp_update_staff ON public.referee_payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (auth.uid()::text)
        AND p.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (auth.uid()::text)
        AND p.role IN ('admin', 'super_admin')
    )
  );