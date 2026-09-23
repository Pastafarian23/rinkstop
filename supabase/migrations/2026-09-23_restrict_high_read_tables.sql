-- ============================================================
-- SECURITY FIX: Restrict 3 HIGH-read tables to service_role
--
-- Date: 2026-09-23
-- Per security assessment: anon can read data from these tables
-- that should be service_role only (operational/internal data).
--
-- Tables:
--   1. game_stats_audit   — audit trail of game data fetches
--   2. nhl_coaching_staff — internal NHL team data
--   3. play_by_play       — NHL play-by-play events
--
-- All 3 currently have RLS + public SELECT policies (intentional or
-- not). Audit confirms they're operational data, not user-facing.
-- Restrict to service_role only.
--
-- Note: if any of these are intentionally public, revert that one.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. game_stats_audit
-- ============================================================
ALTER TABLE public.game_stats_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_stats_audit read" ON public.game_stats_audit;
DROP POLICY IF EXISTS "game_stats_audit service write" ON public.game_stats_audit;

REVOKE ALL ON public.game_stats_audit FROM anon, authenticated;
GRANT ALL ON public.game_stats_audit TO service_role;

CREATE POLICY "game_stats_audit: service_role full access"
  ON public.game_stats_audit
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. nhl_coaching_staff
-- ============================================================
ALTER TABLE public.nhl_coaching_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nhl_coaching_staff_public_read" ON public.nhl_coaching_staff;

REVOKE ALL ON public.nhl_coaching_staff FROM anon, authenticated;
GRANT ALL ON public.nhl_coaching_staff TO service_role;

CREATE POLICY "nhl_coaching_staff: service_role full access"
  ON public.nhl_coaching_staff
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. play_by_play
-- ============================================================
ALTER TABLE public.play_by_play ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "play_by_play read" ON public.play_by_play;
DROP POLICY IF EXISTS "play_by_play service write" ON public.play_by_play;

REVOKE ALL ON public.play_by_play FROM anon, authenticated;
GRANT ALL ON public.play_by_play TO service_role;

CREATE POLICY "play_by_play: service_role full access"
  ON public.play_by_play
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
