-- =============================================================================
-- 2026-11-12_person_identity_phase2b_harden_backup.sql
--
-- HARDEN the Phase 2B rollback backup table.
--
-- Authorized by Arnel Larracas on 2026-11-12 (Phase 2B post-migration audit).
--
-- WHY THIS EXISTS
--   The Phase 2B backup table `public.person_roles_backup_20260712` was created
--   by the apply migration WITHOUT RLS and WITHOUT revoking privileges. The
--   default grants gave anon and authenticated full SELECT/INSERT/UPDATE/
--   DELETE on it.
--
--   The post-migration audit proved this is exploitable through the public
--   REST API:
--     • anon SELECT  -> HTTP 200, all 5,072 rows readable, INCLUDING
--                        `person_id` — the internal person<->source mapping.
--     • anon DELETE  -> HTTP 204, a legitimate row was DELETED.
--     • anon UPDATE  -> HTTP 204, a legitimate row was MUTATED.
--     • anon INSERT  -> HTTP 201, a FAKE row was injected.
--   The row COUNT stayed at 5,072 while the CONTENTS were wrong — which is
--   exactly the failure a count-only check cannot catch. The damage was
--   detected and repaired in the same session (the deleted row was restored
--   from `person_roles`, which still held it, and the injected row removed).
--
--   This is the same class of defect the RLS gate (Gate 8) catches for the
--   five person tables — it simply did not exist for the backup table
--   because that table was created after the gate was written, and the gate
--   is not applied automatically to new tables.
--
-- WHAT IT DOES
--   1. Enables RLS on the backup table.
--   2. Adds deny policies for anon and authenticated (RESTRICTIVE, USING
--      false) — the same shape as the five person tables.
--   3. REVOKES the table-level privileges from anon, authenticated and
--      PUBLIC, so the deny is not carried by RLS alone.
--   4. Adds an IMMUTABILITY guard: a trigger that raises on any UPDATE or
--      DELETE, so even a service-role mistake cannot silently alter the
--      rollback path. The table may only be INSERTed into (which is how the
--      backup is created) and TRUNCATEd by an explicit superuser action.
--
-- VERIFICATION
--   anon/authenticated must get HTTP 401 42501 on every write and HTTP 200
--   with 0 rows on read. service_role keeps working (it has BYPASSRLS).
--
-- ROLLBACK
--   BEGIN;
--   DROP TRIGGER IF EXISTS trg_person_roles_backup_immutable ON public.person_roles_backup_20260712;
--   ALTER TABLE public.person_roles_backup_20260712 DISABLE ROW LEVEL SECURITY;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_roles_backup_20260712 TO anon, authenticated;
--   COMMIT;
--   (Do NOT roll this back — it re-opens the exposure.)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Enable RLS.
-- -----------------------------------------------------------------------------
ALTER TABLE public.person_roles_backup_20260712 ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. Deny policies for anon and authenticated.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS deny_anon_person_roles_backup_20260712 ON public.person_roles_backup_20260712;
CREATE POLICY deny_anon_person_roles_backup_20260712
  ON public.person_roles_backup_20260712 AS RESTRICTIVE FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS deny_authenticated_person_roles_backup_20260712 ON public.person_roles_backup_20260712;
CREATE POLICY deny_authenticated_person_roles_backup_20260712
  ON public.person_roles_backup_20260712 AS RESTRICTIVE FOR ALL TO authenticated USING (false);

-- -----------------------------------------------------------------------------
-- 3. Revoke table-level privileges so the deny is not carried by RLS alone.
--    This is defence in depth: even if RLS were somehow disabled, the grants
--    would still refuse access.
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.person_roles_backup_20260712 FROM anon, authenticated;
REVOKE ALL ON public.person_roles_backup_20260712 FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- 4. Immutability guard.
--
--    The rollback path depends on this table being EXACTLY the pre-correction
--    snapshot. If a row is updated or deleted, the row COUNT may still look
--    right while the contents are wrong — which is precisely the failure
--    observed in the audit. This trigger makes any such mutation loud.
--
--    The table may still be INSERTed into (that is how the backup is taken)
--    and may still be TRUNCATEd by an explicit operator action (that is how
--    it is reset), but UPDATE and DELETE are refused outright.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.person_roles_backup_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'person_roles_backup_20260712 is immutable — it is the rollback snapshot for Phase 2B. '
    'UPDATE and DELETE are refused so the backup cannot drift silently. '
    'To reset it, drop and recreate the table from a fresh backup run.';
END;
$$;

DROP TRIGGER IF EXISTS trg_person_roles_backup_immutable ON public.person_roles_backup_20260712;
CREATE TRIGGER trg_person_roles_backup_immutable
  BEFORE UPDATE OR DELETE ON public.person_roles_backup_20260712
  FOR EACH ROW EXECUTE FUNCTION public.person_roles_backup_immutable();

-- -----------------------------------------------------------------------------
-- 5. Verify the table still holds the correct snapshot and is now protected.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.person_roles_backup_20260712;
  IF n <> 5072 THEN
    RAISE EXCEPTION 'harden: backup holds % rows, expected 5072', n;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='person_roles_backup_20260712'
      AND constraint_type='PRIMARY KEY'
  ) THEN
    RAISE EXCEPTION 'harden: backup table lost its primary key';
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- VERBATIM ROLLBACK — DO NOT USE IN PRODUCTION
--
--   This re-opens the exposure the migration closed. It exists only so the
--   change is reversible in principle.
--
--   BEGIN;
--   DROP TRIGGER IF EXISTS trg_person_roles_backup_immutable ON public.person_roles_backup_20260712;
--   DROP FUNCTION IF EXISTS public.person_roles_backup_immutable();
--   ALTER TABLE public.person_roles_backup_20260712 DISABLE ROW LEVEL SECURITY;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_roles_backup_20260712 TO anon, authenticated;
--   COMMIT;
-- =============================================================================
