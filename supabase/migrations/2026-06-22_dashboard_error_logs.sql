-- dashboard_error_logs
-- Temporary debug aid: captures the real error name+message+stack from
-- the dashboard's error boundary so we can diagnose production errors
-- that Next.js strips from the client.
--
-- Removed in a follow-up migration once the underlying bug is fixed
-- and the /api/debug/log-error endpoint is deleted.

CREATE TABLE IF NOT EXISTS dashboard_error_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT,
  pathname      TEXT,
  digest        TEXT,
  error_name    TEXT,
  error_message TEXT,
  error_stack   TEXT,
  user_agent    TEXT,
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dashboard_error_logs_digest_idx
  ON dashboard_error_logs (digest, captured_at DESC);

-- Open RLS (server-role writes only via service_role key from the API endpoint).
-- Reads gated to super_admin (or service role) so we can query from the agent.
ALTER TABLE dashboard_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboard_error_logs_select_super_admin" ON dashboard_error_logs;
CREATE POLICY "dashboard_error_logs_select_super_admin" ON dashboard_error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()::text
        AND profiles.role = 'super_admin'
    )
  );

-- No INSERT/UPDATE/DELETE policies — writes go through service_role only.
