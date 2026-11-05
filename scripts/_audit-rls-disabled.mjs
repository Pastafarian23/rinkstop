#!/usr/bin/env node
/**
 * RLS-disabled audit — finds any table in the `public` schema that is exposed
 * to PostgREST but does NOT have Row-Level Security enabled.
 *
 * WHY THIS EXISTS (2026-11-05):
 *   Supabase emailed Arnel on 2026-10-31:
 *
 *     "Table publicly accessible — Anyone with your project URL can read,
 *      edit, and delete all data in this table because Row-Level Security is
 *      not enabled. ... rls_disabled_in_public ... Table public.spatial_ref_sys
 *      is public, but RLS has not been enabled."
 *
 *   The existing `scripts/_audit-rls-pii.mjs` (added 2026-10-30) audits a
 *   DIFFERENT thing: whether the anon role can read captured submitter PII.
 *   It never looked at `relrowsecurity`. So the RLS-DISABLED class of finding
 *   had no automated guard, and a fix written on 2026-10-10
 *   (`2026-10-10_security_advisor_fix.sql`, which revokes on spatial_ref_sys)
 *   was never actually applied — because a REVOKE that the executing role is
 *   not permitted to perform fails SILENTLY inside a committed transaction.
 *
 *   This script closes that gap. It reads the LIVE database through the
 *   Supabase Management API and reports any public table without RLS.
 *
 *   A table that genuinely needs an exemption can be listed in ALLOWED_NO_RLS
 *   with a reason.
 *
 * RUN: node scripts/_audit-rls-disabled.mjs
 * EXIT: 0 = clean, 1 = a table is exposed without RLS.
 */
import { readFileSync } from 'node:fs';

const PROJECT_ID = 'yszheonqyyskkjoxoexk';

function envFrom(file, name) {
  try {
    const txt = readFileSync(file, 'utf8');
    const m = txt.split('\n').find((l) => l.startsWith(name + '='));
    return m ? m.split('=').slice(1).join('=').trim() : null;
  } catch {
    return null;
  }
}

// The credential store is JSON, not KEY=VALUE.
function patFromJson(file) {
  try {
    const d = JSON.parse(readFileSync(file, 'utf8'));
    return d.pat || null;
  } catch {
    return null;
  }
}

const PAT =
  process.env.SUPABASE_PAT ||
  patFromJson('/root/.openclaw/credentials/supabase.json') ||
  envFrom('.env', 'SUPABASE_PAT');

if (!PAT) {
  console.error('Missing SUPABASE_PAT (management API token)');
  process.exit(1);
}

// Tables that legitimately have RLS disabled. Each needs a reason.
// Tables that are allowed to have RLS disabled. This is an EXEMPTION LIST,
// not a waiver of the grant check below — a table listed here is still
// reported as a FAILURE if anon/authenticated can read or write it.
const ALLOWED_NO_RLS = {
  // PostGIS internal reference table (SRID codes). Owned by supabase_admin;
  // the anon/authenticated grants are revoked by hand in the Dashboard SQL
  // editor because the Management API executes as `postgres`, which cannot
  // revoke on a table it does not own. See
  // supabase/migrations/2026-11-05_security_advisor_rls_fix.sql.
  spatial_ref_sys:
    'PostGIS internal (SRID reference data). Grants must be revoked manually as supabase_admin.',
};

async function sql(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL failed (${res.status}): ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const rows = await sql(`
  select c.relname as table_name,
         pg_get_userbyid(c.relowner) as owner,
         c.relrowsecurity as rls_enabled,
         has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
         has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
         has_table_privilege('anon', c.oid, 'UPDATE') as anon_update,
         has_table_privilege('anon', c.oid, 'DELETE') as anon_delete
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
   order by c.relname`);

console.log(`Checked ${rows.length} public tables.`);

// A table is a FINDING when RLS is disabled AND the anon role can reach it.
// RLS-disabled + no grants = unreachable, which is harmless.
// RLS-disabled + anon grants = readable/writable by anyone with the public key.
const offenders = rows.filter(
  (r) =>
    !r.rls_enabled &&
    (r.anon_select || r.anon_insert || r.anon_update || r.anon_delete),
);

const rlsDisabledButSafe = rows.filter(
  (r) => !r.rls_enabled && !(r.anon_select || r.anon_insert || r.anon_update || r.anon_delete),
);

for (const r of rlsDisabledButSafe) {
  console.log(
    `  · ${r.table_name}: RLS disabled, but anon has NO grants (unreachable) — ` +
      `${ALLOWED_NO_RLS[r.table_name] || 'no exemption recorded'}`,
  );
}

if (offenders.length === 0) {
  console.log('\n✓ No public table is readable or writable by the anon role without RLS.');
  process.exit(0);
}

console.log(`\n✗ ${offenders.length} public table(s) reachable by anon WITHOUT RLS:`);
for (const r of offenders) {
  const ops = [
    r.anon_select && 'SELECT',
    r.anon_insert && 'INSERT',
    r.anon_update && 'UPDATE',
    r.anon_delete && 'DELETE',
  ].filter(Boolean);
  console.log(`  · ${r.table_name}  (owner: ${r.owner}, anon can: ${ops.join(', ')})`);
  console.log(`      → Fix A — enable RLS:`);
  console.log(`        ALTER TABLE public.${r.table_name} ENABLE ROW LEVEL SECURITY;`);
  console.log(`      → Fix B — if it is extension-owned and should be invisible:`);
  console.log(`        REVOKE ALL ON TABLE public.${r.table_name} FROM anon, authenticated;`);
  console.log(`        REVOKE ALL ON TABLE public.${r.table_name} FROM PUBLIC;`);
}
console.log('\n  If the table is owned by `supabase_admin` (not `postgres`), the REVOKE');
console.log('  must be run in the Supabase Dashboard SQL Editor — it executes as');
console.log('  `supabase_admin` and can revoke on tables it owns. A REVOKE the');
console.log('  executing role cannot perform fails SILENTLY inside a transaction.');
process.exit(1);
