-- =============================================================================
-- 2026-11-12_person_identity_phase2b_apply.sql
--
-- PHASE 2B — Production application of the `rinkstop_players` role correction.
--
-- Authorized by Arnel Larracas on 2026-11-12 (Phase 2B: production player
-- role correction ONLY). No merges. No archival. No deletion.
--
-- ATOMICITY
--   The recoverable backup (…_phase2b_backup_roles.sql) and the correction
--   (…_phase2a_player_roles.sql) are applied in ONE transaction. Either both
--   land or neither does. There is no window in which the correction is
--   applied without a backup.
--
-- WHAT IT DOES
--   Adds exactly one `player` role row per `players` source row that does not
--   already have one. 6,352 rows.
--
-- WHAT IT DOES NOT DO
--   • No person is merged, archived, or deleted.
--   • No `persons` or `person_sources` row is created or modified.
--   • No pre-existing role is modified.
--   • No claim, alias, account, verification, or billing data is touched.
--   • No route, URL, sitemap, or SEO change.
--   • No feature flag is enabled.
--   • No unrelated migration is run.
--
-- ROLLBACK
--   BEGIN;
--   DELETE FROM public.person_roles WHERE source = 'rinkstop_players';
--   COMMIT;
--   (restores person_roles to exactly 5,072 rows. The backup table
--    person_roles_backup_20260712 is retained for a full restore if needed.)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Preconditions — refuse to run against an unexpected state.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.persons') IS NULL THEN
    RAISE EXCEPTION 'phase2b: public.persons missing';
  END IF;
  IF to_regclass('public.person_sources') IS NULL THEN
    RAISE EXCEPTION 'phase2b: public.person_sources missing';
  END IF;
  IF to_regclass('public.person_roles') IS NULL THEN
    RAISE EXCEPTION 'phase2b: public.person_roles missing';
  END IF;

  -- The source namespace must exist and be the expected size.
  IF (SELECT count(*) FROM public.person_sources WHERE source='rinkstop_players') <> 6352 THEN
    RAISE EXCEPTION 'phase2b: expected 6352 rinkstop_players sources, found %',
      (SELECT count(*) FROM public.person_sources WHERE source='rinkstop_players');
  END IF;

  -- Every source row must already map to a person. This correction must
  -- never be the thing that creates a mapping.
  IF EXISTS (
    SELECT 1 FROM public.person_sources s
    WHERE s.source='rinkstop_players'
      AND NOT EXISTS (SELECT 1 FROM public.persons p WHERE p.id = s.person_id)
  ) THEN
    RAISE EXCEPTION 'phase2b: some rinkstop_players sources have no person — refusing';
  END IF;

  -- No pre-existing role may already exist for this namespace, or if some do
  -- (a partially-applied prior run), that is still safe: the INSERT below is
  -- guarded and will only fill the gaps.
END $$;

-- -----------------------------------------------------------------------------
-- 1. Recoverable backup of the pre-correction role state.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.person_roles_backup_20260712 (
  id            uuid PRIMARY KEY,
  person_id     uuid NOT NULL,
  role_type     text NOT NULL,
  role_detail   text,
  team_id       uuid,
  league_id     uuid,
  season        text,
  jersey_number text,
  position      text,
  source        text NOT NULL,
  source_id     text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  backed_up_at  timestamptz NOT NULL DEFAULT now(),
  backup_note   text
);

-- The backup captures the PRE-CORRECTION state, so it must exclude the
-- namespace this migration adds. On a first run that is all 5,072 existing
-- roles. On a re-run the table already holds those same 5,072 rows and the
-- NOT EXISTS guard adds nothing, so the snapshot stays a snapshot of the
-- pre-correction state rather than drifting to include the new roles.
INSERT INTO public.person_roles_backup_20260712
  (id, person_id, role_type, role_detail, team_id, league_id, season,
   jersey_number, position, source, source_id, created_at, updated_at, backup_note)
SELECT
  r.id, r.person_id, r.role_type, r.role_detail, r.team_id, r.league_id,
  r.season, r.jersey_number, r.position, r.source, r.source_id,
  r.created_at, r.updated_at, 'pre-phase2b snapshot'
FROM public.person_roles r
WHERE r.source <> 'rinkstop_players'
  AND NOT EXISTS (
    SELECT 1 FROM public.person_roles_backup_20260712 b WHERE b.id = r.id
  );

-- -----------------------------------------------------------------------------
-- 2. THE CORRECTION.
--
--    The join is on `person_sources (source, source_id)` — the origin key —
--    NEVER on a name. nhl_players contains 314 duplicate-name groups, so a
--    name join would fan out and attach a role to the wrong person.
--
--    `team_id` comes straight from `players.team_id` (already a UUID FK to
--    team_workspaces). `position` and `jersey_number` are carried over as
--    attributes of the role.
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
-- 3. Reconcile — the invariants that must hold after the correction.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  added       bigint;
  total       bigint;
  missing     bigint;
  dupes       bigint;
  orphans     bigint;
  other_ns    bigint;
  backup_n    bigint;
  extra       bigint;
BEGIN
  SELECT count(*) INTO added FROM public.person_roles WHERE source='rinkstop_players';
  SELECT count(*) INTO total FROM public.person_roles;
  SELECT count(*) INTO backup_n FROM public.person_roles_backup_20260712;

  -- Exactly 6,352 rinkstop_players roles must now exist.
  IF added <> 6352 THEN
    RAISE EXCEPTION 'phase2b: expected 6352 rinkstop_players roles, found %', added;
  END IF;

  -- The backup must hold the pre-correction rows. On a FIRST run that is
  -- exactly 5,072. On a re-run the table already exists and already holds
  -- those same 5,072 rows (the INSERT below is NOT EXISTS-guarded, so it adds
  -- nothing new) — but the live table now has 11,424 rows, so a naive
  -- "live = backup" comparison would fail.
  --
  -- The correct invariant is: the backup holds exactly the rows that existed
  -- BEFORE this migration first ran. That is checked as "every backed-up row
  -- is still live, and the backup contains no `rinkstop_players` rows"
  -- (the correction only ever ADDED that namespace).
  IF backup_n <> 5072 THEN
    RAISE EXCEPTION 'phase2b: backup holds % rows, expected 5072 (the pre-correction snapshot)', backup_n;
  END IF;

  -- No source row may still lack a role.
  SELECT count(*) INTO missing
  FROM public.person_sources s
  WHERE s.source='rinkstop_players'
    AND NOT EXISTS (SELECT 1 FROM public.person_roles r
                    WHERE r.source='rinkstop_players' AND r.source_id=s.source_id);
  IF missing > 0 THEN
    RAISE EXCEPTION 'phase2b: % source rows still have no role', missing;
  END IF;

  -- The backup must still cover every role that existed before the
  -- correction. Every backed-up row must still be present live — the
  -- correction never modified or deleted a pre-existing role.
  SELECT count(*) INTO extra FROM public.person_roles_backup_20260712 b
  WHERE NOT EXISTS (SELECT 1 FROM public.person_roles r WHERE r.id = b.id);
  IF extra > 0 THEN
    RAISE EXCEPTION 'phase2b: % backed-up roles are missing from person_roles — a pre-existing role was modified', extra;
  END IF;

  -- No duplicate (person, source, source_id).
  SELECT count(*) INTO dupes FROM (
    SELECT person_id, source, source_id FROM public.person_roles
    GROUP BY 1,2,3 HAVING count(*) > 1
  ) x;
  IF dupes > 0 THEN
    RAISE EXCEPTION 'phase2b: % duplicate (person,source,source_id) role rows', dupes;
  END IF;

  -- No role may point at a nonexistent person.
  SELECT count(*) INTO orphans FROM public.person_roles r
  WHERE NOT EXISTS (SELECT 1 FROM public.persons p WHERE p.id = r.person_id);
  IF orphans > 0 THEN
    RAISE EXCEPTION 'phase2b: % role rows point at a nonexistent person', orphans;
  END IF;

  -- Every OTHER namespace must be untouched: 4,917 + 152 + 2 + 1 = 5,072.
  SELECT count(*) INTO other_ns FROM public.person_roles WHERE source <> 'rinkstop_players';
  IF other_ns <> 5072 THEN
    RAISE EXCEPTION 'phase2b: non-rinkstop_players roles changed: % (expected 5072)', other_ns;
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
--   Restores person_roles to exactly 5,072 rows.
--
--   Full restore (only if person_roles was damaged by another cause):
--   BEGIN;
--   TRUNCATE public.person_roles;
--   INSERT INTO public.person_roles
--     (id, person_id, role_type, role_detail, team_id, league_id, season,
--      jersey_number, position, source, source_id, created_at, updated_at)
--   SELECT id, person_id, role_type, role_detail, team_id, league_id, season,
--          jersey_number, position, source, source_id, created_at, updated_at
--   FROM public.person_roles_backup_20260712;
--   COMMIT;
-- =============================================================================
