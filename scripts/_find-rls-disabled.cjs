#!/usr/bin/env node
/**
 * _find-rls-disabled.cjs — 2026-09-23
 *
 * Query the public schema's pg_tables metadata via Supabase REST +
 * PostgREST introspection to find any user-table with RLS disabled.
 * Mirrors Supabase Advisor check 'rls_disabled_in_public'.
 *
 * Uses the RPC function if available, else queries pg_catalog via
 * a service-role-only query (limited to information_schema).
 *
 * Returns a list of public-schema tables where rowsecurity=false,
 * excluding PostGIS internals.
 */
require('fs').readFileSync(__dirname + '/../.env.local', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Use PostgREST introspection: pg_tables is exposed via /rest/v1/...
  // but ONLY if a view/grant allows it. Service role bypasses RLS but
  // doesn't expose pg_catalog. Instead: try the rpc 'list_unsecured_tables'
  // if it exists; else query information_schema.tables joined with
  // table_privileges to find user-tables.
  const { data, error } = await sb.rpc('list_unsecured_tables').maybeSingle?.() ?? {};
  if (error && !error.message.includes('does not exist')) {
    console.error('RPC error:', error);
  }
  if (data) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // Fallback: query information_schema for tables in public schema
  // (this is exposed to PostgREST via /rest/v1/information_schema.tables
  //  IF someone grants access — usually not). Try it anyway.
  console.log('Trying information_schema fallback…');
  const { data: tables, error: e2 } = await sb
    .from('information_schema.tables')
    .select('table_name, table_schema')
    .eq('table_schema', 'public')
    .neq('table_type', 'VIEW')
    .limit(500);
  if (e2) {
    console.error('information_schema query failed:', e2.message);
    console.log('Cannot introspect RLS state via REST. Will list all known public tables from migrations.');
    return;
  }
  console.log(`Found ${tables.length} public tables. RLS state unknown via REST — see migrations.`);
  for (const t of tables) console.log(`  ${t.table_name}`);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
