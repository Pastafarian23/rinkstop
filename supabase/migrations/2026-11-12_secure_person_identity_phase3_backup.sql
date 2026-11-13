-- =============================================================================
-- 2026-11-12_secure_person_identity_phase3_backup.sql
--
-- Close a pre-existing exposure on the Phase 3 rollback snapshot.
--
-- WHY THIS EXISTS
--   `person_identity_phase3_backup` was created BY HAND during Phase 3 (it is
--   in no migration file). Unlike every other backup table in this schema,
--   it was left with:
--     • ROW LEVEL SECURITY DISABLED, and
--     • blanket grants: `anon=arwdDxtm`, `authenticated=arwdDxtm`.
--
--   The grants are live: `has_table_privilege('anon', …, 'SELECT')` is TRUE.
--   The table happens to hold 0 rows today, so anon currently reads nothing —
--   but the exposure is the GRANT, not the row count. The moment a row lands
--   in it, it becomes world-readable, silently.
--
--   Pre-push Gate 8 (`scripts/_audit-rls-disabled.mjs`) caught this:
--     ✗ person_identity_phase3_backup: backup table has RLS DISABLED
--     ✗ person_identity_phase3_backup: not RLS-protected
--     ✗ person_identity_phase3_backup: NO immutability guard
--     ✗ person_identity_phase3_backup: RLS is DISABLED on a public table
--       (anon SELECT=true)
--
--   It is NOT in the gate's ALLOWED_NO_RLS list, and per the standing
--   procedure in MEMORY.md ("If gate 8 fails on anything OTHER than
--   spatial_ref_sys, stop and investigate"), the push was blocked.
--
-- THE FIX
--   Mirror EXACTLY what `person_identity_merge_backup` and
--   `person_roles_backup_20260712` already do:
--     1. REVOKE the blanket anon/authenticated/PUBLIC grants.
--     2. ENABLE ROW LEVEL SECURITY.
--     3. Add deny_anon / deny_authenticated policies (service_role bypasses
--        RLS, so the service role keeps full access).
--     4. Add an immutability trigger so the snapshot cannot drift silently.
--
-- WHAT IT DOES NOT DO
--   • It does NOT delete or truncate the table.
--   • It does NOT modify any row. (The table is currently empty.)
--   • It does NOT touch `persons`, `person_aliases`, `person_sources`,
--     `person_roles`, `person_claims`, `person_slug_renames`, or any other
--     table.
--   • It does NOT change application behaviour — no code reads this table.
--
-- IDEMPOTENT
--   Every statement is safe to re-run.
-- =============================================================================

BEGIN;

-- 1. Revoke the blanket grants. This is the actual exposure.
REVOKE ALL ON TABLE public.person_identity_phase3_backup FROM anon;
REVOKE ALL ON TABLE public.person_identity_phase3_backup FROM authenticated;
REVOKE ALL ON TABLE public.person_identity_phase3_backup FROM PUBLIC;

-- 2. Enable RLS. With no permissive policy, anon and authenticated get
--    nothing even if a grant is ever re-added by mistake.
ALTER TABLE public.person_identity_phase3_backup ENABLE ROW LEVEL SECURITY;

-- 3. Deny policies for anon and authenticated, exactly as the sibling
--    backup tables have them. `ALL` covers SELECT/INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS deny_anon_person_identity_phase3_backup ON public.person_identity_phase3_backup;
CREATE POLICY deny_anon_person_identity_phase3_backup
  ON public.person_identity_phase3_backup
  FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS deny_authenticated_person_identity_phase3_backup ON public.person_identity_phase3_backup;
CREATE POLICY deny_authenticated_person_identity_phase3_backup
  ON public.person_identity_phase3_backup
  FOR ALL TO authenticated USING (false);

-- 4. Immutability guard: a rollback snapshot must refuse UPDATE and DELETE
--    so it cannot drift silently. Mirrors
--    `person_identity_merge_backup_immutable()`.
CREATE OR REPLACE FUNCTION public.person_identity_phase3_backup_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'person_identity_phase3_backup is immutable — it is the Phase 3 rollback snapshot. '
    'UPDATE and DELETE are refused so it cannot drift silently. '
    'To reset it, drop and recreate it from a fresh backup run.';
END;
$$;

DROP TRIGGER IF EXISTS trg_person_identity_phase3_backup_immutable ON public.person_identity_phase3_backup;
CREATE TRIGGER trg_person_identity_phase3_backup_immutable
  BEFORE DELETE OR UPDATE ON public.person_identity_phase3_backup
  FOR EACH ROW EXECUTE FUNCTION public.person_identity_phase3_backup_immutable();

-- 5. Verification. Any failure RAISEs and aborts the whole transaction.
DO $$
DECLARE
  v_rls        boolean;
  v_anon_sel   boolean;
  v_auth_sel   boolean;
  v_policies   integer;
  v_triggers   integer;
  v_rows       bigint;
BEGIN
  SELECT relrowsecurity INTO v_rls
    FROM pg_class WHERE relname = 'person_identity_phase3_backup';
  IF v_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'verify: RLS is not enabled on person_identity_phase3_backup';
  END IF;

  SELECT has_table_privilege('anon', 'public.person_identity_phase3_backup', 'SELECT')
    INTO v_anon_sel;
  IF v_anon_sel THEN
    RAISE EXCEPTION 'verify: anon can still SELECT person_identity_phase3_backup';
  END IF;

  SELECT has_table_privilege('authenticated', 'public.person_identity_phase3_backup', 'SELECT')
    INTO v_auth_sel;
  IF v_auth_sel THEN
    RAISE EXCEPTION 'verify: authenticated can still SELECT person_identity_phase3_backup';
  END IF;

  SELECT count(*) INTO v_policies
    FROM pg_policies WHERE tablename = 'person_identity_phase3_backup';
  IF v_policies < 2 THEN
    RAISE EXCEPTION 'verify: expected 2 deny policies, found %', v_policies;
  END IF;

  SELECT count(*) INTO v_triggers
    FROM pg_trigger
   WHERE tgrelid = 'public.person_identity_phase3_backup'::regclass
     AND NOT tgisinternal;
  IF v_triggers < 1 THEN
    RAISE EXCEPTION 'verify: the immutability trigger is missing';
  END IF;

  -- No row was lost or changed.
  SELECT count(*) INTO v_rows FROM public.person_identity_phase3_backup;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'verify: expected the table to still hold 0 rows, found %', v_rows;
  END IF;

  RAISE NOTICE 'verify OK: person_identity_phase3_backup secured — rls=on, anon/auth denied, % deny policies, % trigger, % rows',
    v_policies, v_triggers, v_rows;
END $$;

COMMIT;
