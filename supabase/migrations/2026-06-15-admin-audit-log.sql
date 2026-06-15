-- 2026-06-15: Central admin audit log
--
-- Goal: one place for "who changed what, when, and why" across admin actions.
-- Existing audit sources:
--   - post_review_edits: append-only field diffs from /api/admin/articles/[id] review path
--   - fixtures_audit: stats fetch status audit (system-level, not admin user action)
--   - game_stats_audit: stats fetch status audit (system-level, not admin user action)
--
-- This table records explicit admin writes that were previously invisible:
--   - bulk actions on /api/admin/bulk/[entity]
--   - listing submission approve/reject
--   - user role changes
--   - article hard deletes
--
-- Design choice:
--   - Keep post_review_edits as the source of truth for field-level article diffs.
--   - Use admin_audit_log for coarse-grained action history (entity/action/params/diff).
--   - Do not duplicate every post_review_edits row into admin_audit_log. Instead,
--     the admin UI combines both sources into a unified timeline.
--
-- RLS:
--   - service_role full access only
--   - no policies (admin UI uses supabaseAdmin)

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  actor_email TEXT,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('user', 'admin', 'super_admin')),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  diff JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
  ON public.admin_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor
  ON public.admin_audit_log (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity
  ON public.admin_audit_log (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action
  ON public.admin_audit_log (action, created_at DESC);

COMMENT ON TABLE public.admin_audit_log IS
  'Coarse-grained admin action log. Combines with post_review_edits in /admin/audit-log for a unified timeline.';

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
-- No policies. Only service_role bypasses RLS. Admin UI uses supabaseAdmin.
