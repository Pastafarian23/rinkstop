-- =============================================================================
-- 2026-07-12_person_identity_phase2a_harden_candidate_tables.sql
--
-- PHASE 2C — Harden the three Phase 2A candidate tables in production.
--
-- Authorized by Arnel Larracas on 2026-07-12 (Phase 2C: execute the 38
-- approved identity merges in production).
--
-- WHY THIS EXISTS
--   The Phase 2A candidate migration (2026-07-12_person_identity_phase2a_
--   candidate_pairs.sql) created `person_identity_candidates`,
--   `person_identity_clusters` and `person_identity_decisions` WITHOUT
--   enabling RLS and WITHOUT revoking privileges. The default grant posture
--   is permissive, so anon and authenticated inherited full
--   SELECT/INSERT/UPDATE/DELETE on all three.
--
--   Proven live against production immediately after that migration was
--   applied: an anonymous REST request to `person_identity_candidates` and
--   `person_identity_decisions` returned rows.
--
--   This is the SAME defect class as the Phase 2B backup table, where the
--   post-migration audit proved anon could SELECT, DELETE, UPDATE and INSERT
--   the rollback path through the public REST API. The lesson from that
--   incident is applied here as a STRUCTURAL fix: the protection belongs in
--   the CREATE TABLE, so this migration also patches the Phase 2A migration
--   file itself (see the note at the bottom) rather than only repairing the
--   live database.
--
-- WHY THESE TABLES MUST NOT BE PUBLIC
--   `person_identity_candidates` maps a source row to a proposed person and
--   carries the evidence (birth dates, nationalities) plus the recommended
--   action. `person_identity_decisions` carries the decision and WHO made it.
--   `person_identity_clusters` exposes the internal name-cluster structure
--   used for merge planning. None of this is public data, and none of it
--   should be reachable by an anonymous visitor.
--
-- WHAT IT DOES
--   1. Enables RLS on all three tables.
--   2. Adds deny policies for anon and authenticated (RESTRICTIVE, false).
--   3. Revokes all table privileges from anon, authenticated and PUBLIC.
--   4. Verifies the result and refuses to complete otherwise.
--
-- ROLLBACK
--   BEGIN;
--   ALTER TABLE public.person_identity_candidates DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.person_identity_clusters  DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.person_identity_decisions  DISABLE ROW LEVEL SECURITY;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_identity_candidates TO anon, authenticated;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_identity_clusters  TO anon, authenticated;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_identity_decisions  TO anon, authenticated;
--   COMMIT;
--   (DO NOT roll this back — it re-opens the exposure.)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. person_identity_candidates
-- -----------------------------------------------------------------------------
ALTER TABLE public.person_identity_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_person_identity_candidates
  ON public.person_identity_candidates;
CREATE POLICY deny_anon_person_identity_candidates
  ON public.person_identity_candidates AS RESTRICTIVE FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS deny_authenticated_person_identity_candidates
  ON public.person_identity_candidates;
CREATE POLICY deny_authenticated_person_identity_candidates
  ON public.person_identity_candidates AS RESTRICTIVE FOR ALL TO authenticated USING (false);

REVOKE ALL ON public.person_identity_candidates FROM anon, authenticated;
REVOKE ALL ON public.person_identity_candidates FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- 2. person_identity_clusters
-- -----------------------------------------------------------------------------
ALTER TABLE public.person_identity_clusters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_person_identity_clusters
  ON public.person_identity_clusters;
CREATE POLICY deny_anon_person_identity_clusters
  ON public.person_identity_clusters AS RESTRICTIVE FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS deny_authenticated_person_identity_clusters
  ON public.person_identity_clusters;
CREATE POLICY deny_authenticated_person_identity_clusters
  ON public.person_identity_clusters AS RESTRICTIVE FOR ALL TO authenticated USING (false);

REVOKE ALL ON public.person_identity_clusters FROM anon, authenticated;
REVOKE ALL ON public.person_identity_clusters FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- 3. person_identity_decisions
-- -----------------------------------------------------------------------------
ALTER TABLE public.person_identity_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_person_identity_decisions
  ON public.person_identity_decisions;
CREATE POLICY deny_anon_person_identity_decisions
  ON public.person_identity_decisions AS RESTRICTIVE FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS deny_authenticated_person_identity_decisions
  ON public.person_identity_decisions;
CREATE POLICY deny_authenticated_person_identity_decisions
  ON public.person_identity_decisions AS RESTRICTIVE FOR ALL TO authenticated USING (false);

REVOKE ALL ON public.person_identity_decisions FROM anon, authenticated;
REVOKE ALL ON public.person_identity_decisions FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- 4. Verify. Refuse to complete unless the tables are actually locked down.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  rls_bad   text[] := '{}';
  pol_bad   text[] := '{}';
  grt_bad   text[] := '{}';
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'person_identity_candidates','person_identity_clusters','person_identity_decisions'
  ] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = ('public.'||t)::regclass) THEN
      rls_bad := rls_bad || t;
    END IF;
    IF (SELECT count(*) FROM pg_policies
         WHERE schemaname='public' AND tablename=t) < 2 THEN
      pol_bad := pol_bad || t;
    END IF;
    IF has_table_privilege('anon', 'public.'||t, 'SELECT')
       OR has_table_privilege('anon', 'public.'||t, 'INSERT')
       OR has_table_privilege('anon', 'public.'||t, 'UPDATE')
       OR has_table_privilege('anon', 'public.'||t, 'DELETE')
       OR has_table_privilege('authenticated', 'public.'||t, 'SELECT')
       OR has_table_privilege('authenticated', 'public.'||t, 'INSERT')
       OR has_table_privilege('authenticated', 'public.'||t, 'UPDATE')
       OR has_table_privilege('authenticated', 'public.'||t, 'DELETE')
       OR has_table_privilege('public', 'public.'||t, 'SELECT') THEN
      grt_bad := grt_bad || t;
    END IF;
  END LOOP;

  IF array_length(rls_bad,1) > 0 THEN
    RAISE EXCEPTION 'harden: RLS not enabled on: %', rls_bad;
  END IF;
  IF array_length(pol_bad,1) > 0 THEN
    RAISE EXCEPTION 'harden: fewer than 2 policies on: %', pol_bad;
  END IF;
  IF array_length(grt_bad,1) > 0 THEN
    RAISE EXCEPTION 'harden: privileges still granted to anon/authenticated/PUBLIC on: %', grt_bad;
  END IF;
END $$;

COMMIT;
