-- ============================================================
-- SECURITY FIX: Enable RLS on 5 operational tables flagged by
-- Supabase advisor as 'rls_disabled_in_public' (ERROR level)
--
-- Issue date: 2026-09-23 (Supabase advisor email)
-- Trigger: Arnel received email — 'Table publicly accessible.
--   Anyone with your project URL can read, edit, and delete all
--   data in this table because Row-Level Security is not enabled.'
--
-- Verified live (2026-09-23 00:36 CDT):
--   curl /rest/v1/player_trade_log?select=id&limit=1 with anon key → HTTP 200 + data
--   curl -X DELETE /rest/v1/player_trade_log?id=eq.99999 with anon key → HTTP 204 (DELETED)
--
-- Affected tables:
--   1. player_trade_log        — internal audit (NHL player trade events)
--   2. games_cache             — cross-source reconciliation cache
--   3. ingest_audit_log        — ingest batch metadata
--   4. ingest_verify_failed    — disagreement audit queue
--   5. nhl_team_season_stats   — NHL team season aggregates
--
-- NOT affected (false positives or already secured):
--   spatial_ref_sys            — PostGIS internal, NOT user data (exclude from check)
--
-- Access pattern (verified via grep):
--   - All reads/writes happen via service-role scripts (nhl-ingest/*, _games-cache.cjs, etc.)
--   - NO Next.js app routes query these tables via anon/authenticated
--   - Therefore: enable RLS + grant EXECUTE/ALL only to service_role
--     + deny all default to anon + authenticated
--
-- Policies:
--   - Public read: NOT granted (these are operational tables, not user-facing)
--   - service_role full access: granted via TO service_role policies
--   - anon + authenticated: implicit deny (no policies = blocked)
--
-- ============================================================

BEGIN;

-- ============================================================
-- Helper: revoke all privileges from anon + authenticated,
-- then grant them back ONLY to service_role. Without this, anon
-- still has DELETE/INSERT at the GRANT level — RLS only blocks
-- ROW visibility, not table-level operations like DELETE WHERE
-- no rows match. REVOKE is the belt-and-suspenders fix.
-- ============================================================

-- ============================================================
-- 1. player_trade_log
-- ============================================================
ALTER TABLE public.player_trade_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.player_trade_log FROM anon, authenticated;
GRANT ALL ON public.player_trade_log TO service_role;

-- service_role can do anything (matches current scripts/ usage)
CREATE POLICY "player_trade_log: service_role full access"
  ON public.player_trade_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. games_cache
-- ============================================================
ALTER TABLE public.games_cache ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.games_cache FROM anon, authenticated;
GRANT ALL ON public.games_cache TO service_role;

CREATE POLICY "games_cache: service_role full access"
  ON public.games_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. ingest_audit_log
-- ============================================================
ALTER TABLE public.ingest_audit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ingest_audit_log FROM anon, authenticated;
GRANT ALL ON public.ingest_audit_log TO service_role;

CREATE POLICY "ingest_audit_log: service_role full access"
  ON public.ingest_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 4. ingest_verify_failed
-- ============================================================
ALTER TABLE public.ingest_verify_failed ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ingest_verify_failed FROM anon, authenticated;
GRANT ALL ON public.ingest_verify_failed TO service_role;

CREATE POLICY "ingest_verify_failed: service_role full access"
  ON public.ingest_verify_failed
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 5. nhl_team_season_stats
-- ============================================================
ALTER TABLE public.nhl_team_season_stats ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.nhl_team_season_stats FROM anon, authenticated;
GRANT ALL ON public.nhl_team_season_stats TO service_role;

CREATE POLICY "nhl_team_season_stats: service_role full access"
  ON public.nhl_team_season_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Note on spatial_ref_sys:
-- PostGIS internal table, NOT user data. Supabase advisor flags it
-- as rls_disabled_in_public but it's managed by the PostGIS extension
-- itself. We do NOT enable RLS on it — that would break spatial queries
-- across the entire database. The advisor is a false-positive here.
--
-- If Supabase surfaces this in a future email, document the exclusion
-- in _HAND_APPLIED.md rather than enabling RLS.
-- ============================================================

COMMIT;
