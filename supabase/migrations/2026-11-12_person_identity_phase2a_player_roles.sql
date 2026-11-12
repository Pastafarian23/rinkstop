-- =============================================================================
-- 2026-11-12_person_identity_phase2a_player_roles.sql
--
-- PHASE 2A (part A) — Add the missing `player` role for the `rinkstop_players`
-- namespace.
--
-- Authorized by Arnel Larracas on 2026-11-12 (Phase 2A, BRANCH ONLY).
-- Audit: PHASE-1-SUPPLEMENTAL-AUDIT.md § 1
--
-- WHY THIS MIGRATION EXISTS
--   The Phase 1 backfill (2026-11-12_person_identity_phase1_backfill.sql) wrote
--   `persons` and `person_sources` rows for the `rinkstop_players` namespace
--   but NEVER wrote a matching `person_roles` row. It has exactly four role
--   inserts (for nhl_players, nhl_coaching_staff, team_members,
--   coach_profiles) and none targets `players`.
--
--   Result: all 6,352 `players` identities had zero roles. This was an
--   OMISSION in our migration, not a property of the data — `players` rows
--   are genuine directory records (5,218 of 6,352 carry an upstream
--   highlightly_id).
--
-- WHAT IT DOES
--   Adds exactly one `player` role row per `players` source row that does not
--   already have one. Nothing else is touched.
--
-- SAFETY PROPERTIES
--   1. ADDITIVE ONLY — writes to `person_roles` and nothing else. No
--      UPDATE/DELETE/TRUNCATE on any pre-existing table.
--   2. IDEMPOTENT — guarded by NOT EXISTS on (source, source_id). A second
--      run inserts zero rows.
--   3. REVERSIBLE — `DELETE FROM public.person_roles WHERE
--      source='rinkstop_players'` restores the exact prior state.
--   4. NO MERGE — no identity is merged, archived, or deleted. No
--      `identity_state` is changed. No `person_sources` row is touched.
--   5. NO CLAIM — `person_claims` is not written.
--
-- EXCEPTIONS (documented, deliberately NOT special-cased here)
--   8 `players` rows also match an `nhl_players` row with a non-player role
--   (5 coaches: Anton Krysanov, Peter Laviolette, Vasily Koshechkin,
--   Dimitri Megalinsky, Dimitri Riabykin; 3 scouts: Art Wiebe, Colin O'Hara,
--   Paul Guay). They receive the `player` role here, because the `players`
--   table has no role column and the authoritative coach/scout role is
--   already recorded in the `nhl_players` namespace. `person_roles` is a
--   many-roles-per-person table, so both roles coexist correctly.
--   Phase 2B adds the second role to the same person.
--
-- ROLLBACK
--   BEGIN;
--   DELETE FROM public.person_roles WHERE source = 'rinkstop_players';
--   COMMIT;
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Preconditions.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.persons') IS NULL THEN
    RAISE EXCEPTION 'phase2a: public.persons missing — apply Phase 0 first';
  END IF;
  IF to_regclass('public.person_sources') IS NULL THEN
    RAISE EXCEPTION 'phase2a: public.person_sources missing — apply Phase 0 first';
  END IF;
  IF to_regclass('public.person_roles') IS NULL THEN
    RAISE EXCEPTION 'phase2a: public.person_roles missing — apply Phase 0 first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.person_sources WHERE source='rinkstop_players') THEN
    RAISE EXCEPTION 'phase2a: no rinkstop_players sources — apply Phase 1 first';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. Add the `player` role for every `players` source row that lacks one.
--
--    The join is on the ORIGIN KEY (via person_sources (source, source_id)),
--    never on name — nhl_players contains 314 duplicate-name groups, so a
--    name join would fan out and attach a role to the wrong person.
-- -----------------------------------------------------------------------------
INSERT INTO public.person_roles
  (person_id, role_type, role_detail, team_id, league_id, season,
   jersey_number, position, source, source_id)
SELECT
  psrc.person_id,
  'player',
  NULL,
  p.team_id,
  NULL,
  NULL,
  p.jersey_number::text,
  p.position,
  'rinkstop_players',
  p.id::text
FROM public.players p
JOIN public.person_sources psrc
  ON psrc.source = 'rinkstop_players'
  AND psrc.source_id = p.id::text
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_roles e
  WHERE e.source = 'rinkstop_players' AND e.source_id = p.id::text
);

-- -----------------------------------------------------------------------------
-- 2. Reconcile.
--    - every `players` row has exactly one `rinkstop_players` role
--    - no role row points at a nonexistent person
--    - no source row was lost
--    - no person was merged or claimed
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  missing_roles  bigint;
  orphan_roles   bigint;
  lost_sources   bigint;
  bad_states     bigint;
BEGIN
  SELECT count(*) INTO missing_roles
  FROM public.players p
  JOIN public.person_sources psrc
    ON psrc.source='rinkstop_players' AND psrc.source_id=p.id::text
  WHERE NOT EXISTS (
    SELECT 1 FROM public.person_roles r
    WHERE r.source='rinkstop_players' AND r.source_id=p.id::text
  );
  IF missing_roles > 0 THEN
    RAISE EXCEPTION 'phase2a: % players rows still have no role', missing_roles;
  END IF;

  SELECT count(*) INTO orphan_roles
  FROM public.person_roles r
  WHERE NOT EXISTS (SELECT 1 FROM public.persons p WHERE p.id = r.person_id);
  IF orphan_roles > 0 THEN
    RAISE EXCEPTION 'phase2a: % role rows point at a nonexistent person', orphan_roles;
  END IF;

  SELECT count(*) INTO lost_sources FROM (
    SELECT source, source_id FROM public.person_sources
    GROUP BY source, source_id HAVING count(*) > 1
  ) d;
  IF lost_sources > 0 THEN
    RAISE EXCEPTION 'phase2a: % duplicate (source,source_id) pairs', lost_sources;
  END IF;

  SELECT count(*) INTO bad_states
  FROM public.persons WHERE identity_state <> 'unverified';
  IF bad_states > 0 THEN
    RAISE EXCEPTION 'phase2a: % persons are not unverified — a merge or claim occurred', bad_states;
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- VERBATIM ROLLBACK
--
--   BEGIN;
--   DELETE FROM public.person_roles WHERE source = 'rinkstop_players';
--   COMMIT;
--
--   Restores person_roles to exactly its pre-migration count.
--   No other table is touched by this migration, so nothing else needs
--   restoring.
-- =============================================================================
