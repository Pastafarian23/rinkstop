-- 2026-10-16-fixture-dedup-audit.sql
-- Part 1.6 (Arnel 01:16): audit log for the weekly fixtures dedup.
--
-- Before scripts/dedup-fixtures-all-leagues.js deletes any row, it inserts a
-- row here with: the deleted row's id + content, the surviving row's id + content,
-- the rule applied, the run id, and a generated revert_sql snippet.
--
-- This makes the deletion reversible (point-in-time recovery of any deleted row
-- from the audit table) and provides an audit trail for compliance.

CREATE TABLE IF NOT EXISTS public.fixture_dedup_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_by TEXT NOT NULL DEFAULT current_user,
  league_slug TEXT NOT NULL,
  rule TEXT NOT NULL,
  deleted_id UUID NOT NULL,
  deleted_row JSONB NOT NULL,
  survivor_id UUID,
  survivor_row JSONB,
  revert_sql TEXT NOT NULL,
  reverted_at TIMESTAMPTZ,
  reverted_by TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_fixture_dedup_audit_run_id
  ON public.fixture_dedup_audit (run_id);
CREATE INDEX IF NOT EXISTS idx_fixture_dedup_audit_deleted_id
  ON public.fixture_dedup_audit (deleted_id);
CREATE INDEX IF NOT EXISTS idx_fixture_dedup_audit_league_slug
  ON public.fixture_dedup_audit (league_slug);
CREATE INDEX IF NOT EXISTS idx_fixture_dedup_audit_reverted
  ON public.fixture_dedup_audit (reverted_at) WHERE reverted_at IS NULL;

COMMENT ON TABLE public.fixture_dedup_audit IS
  'Audit log of every row deleted by scripts/dedup-fixtures-all-leagues.js. '
  'revert_sql is the INSERT statement that re-creates the deleted row from the '
  'deleted_row JSONB snapshot. reverted_at stays NULL until a human runs the '
  'revert.';
