-- Security audit: create a one-time RLS audit function.
-- Returns all tables with their row-level security status.
-- Called via: POST /rest/v1/rpc/public.rls_audit
-- Then drop after use.

CREATE OR REPLACE FUNCTION public.rls_audit()
RETURNS TABLE(tablename text, rowsecurity boolean, tableowner text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tablename::text,
    t.rowsecurity,
    c.relowner::text
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename !~ '^pg_'
    AND t.tablename !~ '^sql_'
  ORDER BY t.tablename;
END;
$$;
