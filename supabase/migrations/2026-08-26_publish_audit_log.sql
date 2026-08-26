-- 2026-08-26_publish_audit_log.sql
--
-- OWASP A05 audit 2026-08-26: /api/blog/publish uses a shared x-api-secret.
-- If the secret leaks, anyone can publish content to the live site. This
-- migration adds an audit log so we can trace every publish back to the
-- caller IP, user agent, and which secret was used (API_SECRET vs
-- ADMIN_SECRET).
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS publish_audit_log (
  id           BIGSERIAL PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  action       TEXT NOT NULL CHECK (action IN ('insert','update','reject')),
  slug         TEXT,
  post_id      TEXT,
  secret_kind  TEXT NOT NULL CHECK (secret_kind IN ('api_secret','admin_secret','none')),
  caller_ip    TEXT,
  user_agent   TEXT,
  status_code  INTEGER NOT NULL,
  error        TEXT,
  metadata     JSONB
);

CREATE INDEX IF NOT EXISTS publish_audit_log_created_at_idx
  ON publish_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS publish_audit_log_slug_idx
  ON publish_audit_log (slug);

-- RLS: write-only via service role; readable by super_admin only.
ALTER TABLE publish_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "publish_audit_log_admin_read" ON publish_audit_log;
CREATE POLICY "publish_audit_log_admin_read" ON publish_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()::text
        AND p.role IN ('super_admin','admin')
    )
  );

-- Service role bypasses RLS, so inserts from /api/blog/publish work
-- without a separate INSERT policy.