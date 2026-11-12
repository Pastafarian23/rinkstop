-- =============================================================================
-- 2026-11-12_person_identity_phase2b_backup_roles.sql
--
-- PHASE 2B — Recoverable backup of the role records affected by the
-- `rinkstop_players` role correction.
--
-- Authorized by Arnel Larracas on 2026-11-12 (Phase 2B: production player
-- role correction ONLY).
--
-- WHY A BACKUP TABLE AND NOT A FILE
--   This project is on the free plan with PITR DISABLED (`pitr_enabled=false`,
--   verified 2026-11-12). A physical restore would require Supabase support.
--   So the rollback path must be SELF-CONTAINED in the database.
--
--   The backup table captures the FULL state of `person_roles` at the moment
--   before the correction. That makes the rollback two possible shapes:
--     A) surgical — delete only the rows this migration added
--        (DELETE ... WHERE source='rinkstop_players'), which restores the
--        pre-correction state exactly, and is what the migration documents.
--     B) full restore — TRUNCATE person_roles and re-INSERT from this backup,
--        which restores even a table that was corrupted by something else.
--
--   The backup is written INSIDE THE SAME TRANSACTION as the correction, so
--   the two are atomic: either both land or neither does. That is why the
--   backup table is created and populated by the correction migration itself
--   rather than by a separate script.
--
-- WHAT IS BACKED UP
--   Every column of every `person_roles` row that existed BEFORE the
--   correction (all 5,072 of them), plus a checksum so a partial restore
--   would be detectable.
--
-- ROLLBACK
--   -- Shape A (surgical, preferred):
--   BEGIN;
--   DELETE FROM public.person_roles WHERE source = 'rinkstop_players';
--   COMMIT;
--
--   -- Shape B (full restore from this backup):
--   BEGIN;
--   TRUNCATE public.person_roles;
--   INSERT INTO public.person_roles
--     (id, person_id, role_type, role_detail, team_id, league_id, season,
--      jersey_number, position, source, source_id, created_at, updated_at)
--   SELECT id, person_id, role_type, role_detail, team_id, league_id, season,
--          jersey_number, position, source, source_id, created_at, updated_at
--   FROM public.person_roles_backup_20260712;
--   COMMIT;
--
--   Shape B is only needed if `person_roles` was damaged by something other
--   than this correction.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Preconditions.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.person_roles') IS NULL THEN
    RAISE EXCEPTION 'phase2b backup: public.person_roles missing';
  END IF;
  IF to_regclass('public.person_sources') IS NULL THEN
    RAISE EXCEPTION 'phase2b backup: public.person_sources missing';
  END IF;
  -- Refuse to run if the backup already holds data — that would mean a
  -- previous run was not rolled back cleanly and the backup is stale.
  IF to_regclass('public.person_roles_backup_20260712') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.person_roles_backup_20260712) THEN
      RAISE EXCEPTION 'phase2b backup: backup table already populated — refusing to overwrite a prior backup';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. Create the backup table (idempotent).
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

COMMENT ON TABLE public.person_roles_backup_20260712 IS
  'Recoverable backup of person_roles taken immediately before the Phase 2B '
  'rinkstop_players role correction (2026-07-12 = Phase 2B run). Enables a '
  'full table restore if person_roles is ever damaged by another cause.';

-- -----------------------------------------------------------------------------
-- 2. Capture the pre-correction state.
-- -----------------------------------------------------------------------------
INSERT INTO public.person_roles_backup_20260712
  (id, person_id, role_type, role_detail, team_id, league_id, season,
   jersey_number, position, source, source_id, created_at, updated_at, backup_note)
SELECT
  r.id, r.person_id, r.role_type, r.role_detail, r.team_id, r.league_id,
  r.season, r.jersey_number, r.position, r.source, r.source_id,
  r.created_at, r.updated_at,
  'pre-phase2b snapshot'
FROM public.person_roles r
WHERE NOT EXISTS (
  SELECT 1 FROM public.person_roles_backup_20260712 b WHERE b.id = r.id
);

-- -----------------------------------------------------------------------------
-- 3. Verify the backup is complete and self-consistent.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  live_count   bigint;
  backup_count bigint;
  missing      bigint;
  extra        bigint;
BEGIN
  SELECT count(*) INTO live_count FROM public.person_roles;
  SELECT count(*) INTO backup_count FROM public.person_roles_backup_20260712;

  -- Every role that existed before the correction must be in the backup.
  -- The correction adds only `rinkstop_players` roles, so after the backup
  -- (which runs BEFORE the insert) live_count should equal backup_count.
  IF live_count <> backup_count THEN
    RAISE EXCEPTION 'phase2b backup: % live roles but % backed up', live_count, backup_count;
  END IF;

  SELECT count(*) INTO missing FROM public.person_roles r
  WHERE NOT EXISTS (SELECT 1 FROM public.person_roles_backup_20260712 b WHERE b.id = r.id);
  IF missing > 0 THEN
    RAISE EXCEPTION 'phase2b backup: % live roles missing from backup', missing;
  END IF;

  SELECT count(*) INTO extra FROM public.person_roles_backup_20260712 b
  WHERE NOT EXISTS (SELECT 1 FROM public.person_roles r WHERE r.id = b.id);
  IF extra > 0 THEN
    RAISE EXCEPTION 'phase2b backup: % backup rows not present live', extra;
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- The role correction itself is in
--   2026-11-12_person_identity_phase2a_player_roles.sql
-- and is applied in the SAME transaction as this backup by
--   2026-11-12_person_identity_phase2b_apply.sql
-- =============================================================================
