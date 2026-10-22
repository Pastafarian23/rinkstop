-- 2026-10-22_fixture_dedup_audit_rls.sql
--
-- Fixes Supabase advisor alert `rls_disabled_in_public` (raised 2026-10-17,
-- CRITICAL): "Anyone with your project URL can read, edit, and delete all
-- data in this table because Row-Level Security is not enabled."
--
-- WHY THIS MATTERS
-- public.fixture_dedup_audit has RLS OFF *and* full grants to the anon role:
--   SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
-- The anon key ships in client JS by design, so the anon role is reachable
-- by anyone who loads rinkstop.com. Today the table has 0 rows, but the
-- moment scripts/dedup-fixtures-all-leagues.js runs it begins storing
-- `deleted_row` JSONB snapshots of deleted fixtures — team names, scores,
-- dates, venue ids. That is a free structured dataset for anyone who knows
-- the project URL, and DELETE/TRUNCATE would let an anonymous caller
-- destroy the recovery trail that makes fixture deletions reversible.
--
-- This is the same defect independently found during the 2026-10-22
-- Singapore-traffic analysis. Supabase's advisor and that review converged
-- on this one table.
--
-- WHAT THIS DOES NOT TOUCH
-- spatial_ref_sys also has RLS off and is flagged by the advisor, but it is
-- owned by PostGIS. Enabling RLS on it risks breaking geospatial queries, so
-- it is deliberately left alone.
--
-- WHY service_role STILL WORKS
-- scripts/dedup-fixtures-all-leagues.js writes this table through a
-- service-role client (verified: line 28 uses SUPABASE_SERVICE_ROLE_KEY).
-- service_role BYPASSES RLS, so the audit pipeline keeps working unchanged
-- after this migration. We still GRANT it explicitly so the table survives
-- the Oct 30 Supabase change that stops auto-granting Data API access to
-- new public tables.
--
-- WHY authenticated IS ALSO REVOKED
-- No application code reads this table through a user's session — it is
-- script-only. Granting `authenticated` would widen the blast radius for no
-- benefit. Revoked to match actual usage.
--
-- Idempotent: safe to re-run.

begin;

-- 1. Enable RLS. Without any permissive policy, anon/authenticated get
--    nothing. service_role bypasses RLS entirely, so the pipeline is
--    unaffected.
alter table public.fixture_dedup_audit enable row level security;

-- 2. Revoke the blanket grants that made this table anonymously writable.
revoke all on public.fixture_dedup_audit from anon;
revoke all on public.fixture_dedup_audit from authenticated;

-- 3. Re-grant to service_role explicitly, independent of RLS bypass, so the
--    table is correct after the Oct 30 auto-grant change.
grant select, insert, update, delete on public.fixture_dedup_audit to service_role;

-- 4. Future-proof against an accidental policy being added later that would
--    re-open anon access. No policies exist for this table; this comment
--    documents that the empty policy set is intentional, not an oversight.
comment on table public.fixture_dedup_audit is
  'Audit log of every row deleted by scripts/dedup-fixtures-all-leagues.js. '
  'revert_sql is the INSERT statement that re-creates the deleted row from the '
  'deleted_row JSONB snapshot. reverted_at stays NULL until a human runs the '
  'revert. '
  'SECURITY (2026-10-22): RLS enabled and anon/authenticated grants revoked. '
  'Script-only table — written via service_role, which bypasses RLS. There are '
  'deliberately NO policies, so anon and authenticated get zero rows. Do not add '
  'a permissive policy without confirming there is a real client-side reader.';

commit;

-- Tell PostgREST to drop its cached schema/privilege view so the change is
-- effective immediately rather than after the next cache refresh.
notify pgrst, 'reload schema';