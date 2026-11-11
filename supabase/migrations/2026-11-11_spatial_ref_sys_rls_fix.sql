-- Fix the Supabase security advisory: rls_disabled_in_public on spatial_ref_sys
--
-- Run this in the SUPABASE DASHBOARD SQL EDITOR (not the Management API).
--
-- WHY THE DASHBOARD IS REQUIRED
--   The Management API `/database/query` endpoint executes as `postgres`,
--   which is NOT a superuser (rolsuper = false) and is NOT the owner or
--   grantor of `public.spatial_ref_sys` (both are `supabase_admin`).
--   Postgres only permits a REVOKE from the owner or the grantor, so a
--   REVOKE issued by `postgres` executes WITHOUT ERROR and changes
--   NOTHING. Verified live 2026-11-11: the statement returned
--   "Success. No rows returned" while `has_table_privilege` stayed true.
--   That silent no-op is exactly why the 2026-11-05 attempt appeared to
--   work.
--
--   The Dashboard SQL Editor connects with superuser rights, so it can
--   run this directly. If your editor still reports "Success" and the
--   probe below still says `anon_select = true`, then your editor is NOT
--   running as superuser — use the Support ticket path in
--   OPEN-ITEMS.md instead.
--
-- WHAT THIS DOES
--   1. Revokes all privileges on the table from anon, authenticated and
--      PUBLIC (PUBLIC includes every role, including future ones).
--   2. Enables RLS on the table as a second line of defence, so even if
--      a grant is ever re-added, no row is visible without a policy.
--   3. Verifies the result INSIDE the same transaction and RAISEs if the
--      revoke did not take effect. A silent no-op cannot pass this.
--
-- SAFETY
--   `spatial_ref_sys` is PostGIS's spatial reference table: 8,499 rows of
--   SRID/coordinate-system definitions (srid, auth_name, srtext,
--   proj4text). It contains NO application data, NO user data and NO
--   credentials. The only app column using a spatial type is
--   `venues.location` (geography), and `venues` has RLS enabled with
--   0 rows. PostGIS reads this table at DDL time, not at query time for
--   already-defined types.
--
--   Verified: `spatial_ref_sys` is an extension-owned member of postgis
--   (pg_depend deptype = 'e'), so it must NOT be dropped or recreated.
--   This statement only changes privileges and enables RLS. It does not
--   touch the data, and it does not touch the extension.

BEGIN;

-- 1. Revoke every privilege from the public roles.
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated, PUBLIC;

-- 2. RLS as a second line of defence.
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- 3. Verify — and FAIL LOUDLY if the revoke did not take.
DO $$
DECLARE
  anon_sel boolean;
  auth_sel boolean;
  pub_sel boolean;
BEGIN
  SELECT has_table_privilege('anon', 'public.spatial_ref_sys', 'SELECT'),
         has_table_privilege('authenticated', 'public.spatial_ref_sys', 'SELECT'),
         has_table_privilege('PUBLIC', 'public.spatial_ref_sys', 'SELECT')
    INTO anon_sel, auth_sel, pub_sel;

  IF anon_sel OR auth_sel OR pub_sel THEN
    RAISE EXCEPTION
      'ABORT: revoke did not take effect. anon_select=%, authenticated_select=%, public_select=%. Run this as a SUPERUSER.',
      anon_sel, auth_sel, pub_sel;
  END IF;

  RAISE NOTICE 'OK: spatial_ref_sys is no longer readable by anon / authenticated / PUBLIC.';
END $$;

COMMIT;

-- ── POST-RUN VERIFICATION (run separately, from anywhere) ────────────────
-- SELECT has_table_privilege('anon', 'public.spatial_ref_sys', 'SELECT') AS anon_select;
--   expected: false
-- SELECT relrowsecurity FROM pg_class WHERE oid = 'public.spatial_ref_sys'::regclass;
--   expected: true
