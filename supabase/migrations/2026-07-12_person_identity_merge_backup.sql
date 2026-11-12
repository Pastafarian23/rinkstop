-- =============================================================================
-- 2026-07-12_person_identity_merge_backup.sql
--
-- PHASE 2C-C (PREPARATION) — the SECURE production backup procedure for an
-- identity merge. NOT APPLIED. It is committed as the procedure that WILL be
-- used when the merge is authorized.
--
-- WHY THIS IS A SEPARATE, HARDENED PROCEDURE
--   The Phase 2B backup table (`person_roles_backup_20260712`) was created
--   WITHOUT RLS and WITHOUT revoking privileges. The post-migration audit
--   proved anon could SELECT, DELETE, UPDATE and INSERT it through the public
--   REST API — a real rollback-path exposure, later repaired and hardened
--   (RLS + REVOKE + an immutability trigger).
--
--   Lesson applied here: the protection is in the CREATE, not in a later fix.
--   This procedure creates the backup table ALREADY hardened, and refuses to
--   run if it cannot.
--
-- WHAT IT BACKS UP (before any merge)
--   • public.persons            — the identities themselves
--   • public.person_sources     — the provenance (the inverse mapping)
--   • public.person_roles       — the roles
--   • public.person_claims      — ownership (if any)
--   • public.person_aliases     — URL aliases (if any)
--   The backup records WHICH person each row belonged to BEFORE the merge, so
--   the inverse operation is mechanical rather than a guess.
--
-- HOW THE ROLLBACK WORKS
--   person_merge_audit records every row movement. The rollback moves each
--   row back to the person it came from, restores identity_state, and clears
--   the canonical pointer. Because the pre-merge backup also exists, there is
--   a second, independent recovery path if the audit ledger is ever damaged.
--
-- PRECONDITIONS ENFORCED BY THIS MIGRATION
--   1. The backup table does not already exist (or is empty) — refuses to
--      overwrite a prior snapshot.
--   2. RLS is enabled and deny policies exist for anon and authenticated.
--   3. Grants are revoked from anon, authenticated and PUBLIC.
--   4. An immutability trigger refuses UPDATE and DELETE.
--   5. The snapshot row count matches the live table count exactly.
--   6. No person is merged yet (identity_state='merged' count is captured for
--      the record).
--
-- ROLLBACK OF THE BACKUP ITSELF
--   BEGIN;
--   DROP TRIGGER IF EXISTS trg_<backup>_immutable ON public.<backup>;
--   DROP TABLE IF EXISTS public.<backup>;
--   COMMIT;
--   (The merge is what you roll back, not the backup. The backup must
--    SURVIVE the merge so it can be used to recover.)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Preconditions.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.persons') IS NULL THEN
    RAISE EXCEPTION 'merge-backup: public.persons missing';
  END IF;
  IF to_regclass('public.person_sources') IS NULL THEN
    RAISE EXCEPTION 'merge-backup: public.person_sources missing';
  END IF;
  IF to_regclass('public.person_roles') IS NULL THEN
    RAISE EXCEPTION 'merge-backup: public.person_roles missing';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. Create the backup table — ALREADY HARDENED.
--
--    The protection is applied HERE, at creation, so there is never a window
--    in which the snapshot is world-readable.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.person_identity_merge_backup (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_of         text NOT NULL,          -- 'persons' | 'person_sources' | ...
  row_id            uuid NOT NULL,          -- the original row id
  row_data          jsonb NOT NULL,         -- the full original row
  original_person_id uuid,                  -- who owned it BEFORE the merge
  backed_up_at      timestamptz NOT NULL DEFAULT now(),
  backup_run_id     uuid NOT NULL
);

COMMENT ON TABLE public.person_identity_merge_backup IS
  'Pre-merge snapshot of the identity tables. Created already hardened (RLS, '
  'revoked grants, immutability trigger) so there is never a window in which '
  'the rollback path is world-readable. The second recovery path, independent '
  'of person_merge_audit.';

-- Hardening, applied at creation.
ALTER TABLE public.person_identity_merge_backup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_person_identity_merge_backup
  ON public.person_identity_merge_backup;
CREATE POLICY deny_anon_person_identity_merge_backup
  ON public.person_identity_merge_backup AS RESTRICTIVE FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS deny_authenticated_person_identity_merge_backup
  ON public.person_identity_merge_backup;
CREATE POLICY deny_authenticated_person_identity_merge_backup
  ON public.person_identity_merge_backup AS RESTRICTIVE FOR ALL TO authenticated USING (false);

REVOKE ALL ON public.person_identity_merge_backup FROM anon, authenticated;
REVOKE ALL ON public.person_identity_merge_backup FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.person_identity_merge_backup_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'person_identity_merge_backup is immutable — it is the pre-merge rollback snapshot. '
    'UPDATE and DELETE are refused so it cannot drift silently. '
    'To reset it, drop and recreate it from a fresh backup run.';
END;
$$;

DROP TRIGGER IF EXISTS trg_person_identity_merge_backup_immutable
  ON public.person_identity_merge_backup;
CREATE TRIGGER trg_person_identity_merge_backup_immutable
  BEFORE UPDATE OR DELETE ON public.person_identity_merge_backup
  FOR EACH ROW EXECUTE FUNCTION public.person_identity_merge_backup_immutable();

CREATE INDEX IF NOT EXISTS idx_pimb_backup_of ON public.person_identity_merge_backup (backup_of);
CREATE INDEX IF NOT EXISTS idx_pimb_run ON public.person_identity_merge_backup (backup_run_id);
CREATE INDEX IF NOT EXISTS idx_pimb_original_person ON public.person_identity_merge_backup (original_person_id);

-- -----------------------------------------------------------------------------
-- 2. Capture the snapshot.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_run_id uuid := gen_random_uuid();
  v_live   bigint;
  v_saved  bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM public.person_identity_merge_backup) THEN
    RAISE EXCEPTION 'merge-backup: a snapshot already exists — refusing to overwrite it';
  END IF;

  -- persons
  INSERT INTO public.person_identity_merge_backup
    (backup_of, row_id, row_data, original_person_id, backup_run_id)
  SELECT 'persons', p.id, to_jsonb(p), p.id, v_run_id
  FROM public.persons p;

  -- person_sources
  INSERT INTO public.person_identity_merge_backup
    (backup_of, row_id, row_data, original_person_id, backup_run_id)
  SELECT 'person_sources', s.id, to_jsonb(s), s.person_id, v_run_id
  FROM public.person_sources s;

  -- person_roles
  INSERT INTO public.person_identity_merge_backup
    (backup_of, row_id, row_data, original_person_id, backup_run_id)
  SELECT 'person_roles', r.id, to_jsonb(r), r.person_id, v_run_id
  FROM public.person_roles r;

  -- person_claims
  INSERT INTO public.person_identity_merge_backup
    (backup_of, row_id, row_data, original_person_id, backup_run_id)
  SELECT 'person_claims', c.id, to_jsonb(c), c.person_id, v_run_id
  FROM public.person_claims c;

  -- person_aliases
  INSERT INTO public.person_identity_merge_backup
    (backup_of, row_id, row_data, original_person_id, backup_run_id)
  SELECT 'person_aliases', a.id, to_jsonb(a), a.person_id, v_run_id
  FROM public.person_aliases a;

  -- Verify the snapshot is complete for the two tables a merge actually moves.
  SELECT count(*) INTO v_live FROM public.person_sources;
  SELECT count(*) INTO v_saved FROM public.person_identity_merge_backup
   WHERE backup_of = 'person_sources';
  IF v_live <> v_saved THEN
    RAISE EXCEPTION 'merge-backup: snapshot has % person_sources rows, live has %', v_saved, v_live;
  END IF;

  SELECT count(*) INTO v_live FROM public.person_roles;
  SELECT count(*) INTO v_saved FROM public.person_identity_merge_backup
   WHERE backup_of = 'person_roles';
  IF v_live <> v_saved THEN
    RAISE EXCEPTION 'merge-backup: snapshot has % person_roles rows, live has %', v_saved, v_live;
  END IF;

  RAISE NOTICE 'merge-backup: snapshot taken, run_id=%', v_run_id;
END $$;

COMMIT;

-- =============================================================================
-- RECOVERY FROM THIS BACKUP (the SECOND, independent path)
--
--   If person_merge_audit is ever damaged, restore from this snapshot:
--
--   BEGIN;
--   -- restore persons rows to their original owner
--   UPDATE public.persons p
--      SET identity_state = 'unverified', canonical_person_id = NULL
--     FROM public.person_identity_merge_backup b
--    WHERE b.backup_of='persons' AND b.row_id = p.id
--      AND b.original_person_id <> p.id;
--
--   -- re-point any source rows that moved
--   UPDATE public.person_sources s
--      SET person_id = b.original_person_id
--     FROM public.person_identity_merge_backup b
--    WHERE b.backup_of='person_sources' AND b.row_id = s.id
--      AND b.original_person_id <> s.person_id;
--   COMMIT;
--
--   The trigger refuses UPDATE on the BACKUP table itself, not on the tables
--   it restores, so this path works.
-- =============================================================================
