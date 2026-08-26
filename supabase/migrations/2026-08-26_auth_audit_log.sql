-- 2026-08-26_auth_audit_log.sql
--
-- OWASP A09 audit 2026-08-26: structured log table for auth failures and
-- authorization denials. Used by src/lib/auth-audit.ts to record 401/403
-- events across admin, owner, federation, and tier-gated routes.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS auth_audit_log (
  id               BIGSERIAL PRIMARY KEY,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  caller_ip        TEXT,
  user_agent       TEXT,
  path             TEXT NOT NULL,
  user_id          TEXT,
  reason           TEXT NOT NULL,
  attempted_action TEXT NOT NULL,
  resource_id      TEXT,
  required_role    TEXT,
  caller_tier      TEXT,
  status_code      INTEGER NOT NULL,
  detail           TEXT
);

CREATE INDEX IF NOT EXISTS auth_audit_log_created_at_idx
  ON auth_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS auth_audit_log_user_id_idx
  ON auth_audit_log (user_id);
CREATE INDEX IF NOT EXISTS auth_audit_log_caller_ip_idx
  ON auth_audit_log (caller_ip);

-- RLS: super_admin/admin only. Service role bypasses for inserts.
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_audit_log_admin_read" ON auth_audit_log;
CREATE POLICY "auth_audit_log_admin_read" ON auth_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()::text
        AND p.role IN ('super_admin','admin')
    )
  );