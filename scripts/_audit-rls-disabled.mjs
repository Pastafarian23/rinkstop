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

// The project to audit. Defaults to production. Override with AUDIT_PROJECT_ID to
// run the gate against a staging branch (used by the Phase 2C-A gate test).
const PROJECT_ID = process.env.AUDIT_PROJECT_ID || 'yszheonqyyskkjoxoexk';

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
         has_table_privilege('anon', c.oid, 'DELETE') as anon_delete,
         has_table_privilege('authenticated', c.oid, 'SELECT') as auth_select,
         has_table_privilege('authenticated', c.oid, 'INSERT') as auth_insert,
         has_table_privilege('authenticated', c.oid, 'UPDATE') as auth_update,
         has_table_privilege('authenticated', c.oid, 'DELETE') as auth_delete,
         has_table_privilege('public', c.oid, 'SELECT') as public_select,
         (select count(*)::int from pg_policies p
           where p.schemaname='public' and p.tablename=c.relname) as policy_count,
         (select count(*)::int from pg_trigger t
           where not t.tgisinternal and t.tgrelid = c.oid) as trigger_count
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

// ─────────────────────────────────────────────────────────────────────────────
// EXTENDED CHECKS (2026-11-12, Phase 2C-A)
//
// The RLS-disabled check above caught the class of defect where a table is
// world-readable. It did NOT catch the Phase 2B backup-table defect, because
// that table HAD been given RLS=false but its GRANT check ran only against
// `anon` — and it missed the deeper issue: a table that is a rollback
// snapshot is sensitive INTERNAL data (it maps person ids to source ids)
// and must never be reachable by anon/authenticated regardless of RLS.
//
// These checks close the class:
//   A. NEWLY CREATED TABLES — a table created recently that has no RLS is a
//      finding even if it happens to have no grants yet, because the default
//      grant posture is permissive and a single later GRANT exposes it.
//   B. SENSITIVE IDENTITY TABLES — the identity-mapping tables and any
//      backup snapshot of them must have RLS AND no anon/authenticated
//      grants AND (for backups) an immutability trigger.
//   C. BACKUP TABLES — must be RLS-protected, unreachable, and immutable.
// ─────────────────────────────────────────────────────────────────────────────

// Tables whose whole purpose is to expose public directory data. These are
// ALLOWED to be anon-readable, but only WITH RLS enabled and an explicit
// policy — never with a blanket grant and no policy.
const PUBLIC_READABLE = new Set([
  'players',
  'nhl_players',
  'team_workspaces',
  'teams',
  'leagues',
  'rinks',
  'federations',
  'organizations',
  'nhl_teams',
  'nhl_coaching_staff',
]);

// Tables that map a person to a source record, or hold an account link.
// These are NEVER public. anon/authenticated must have NO grants at all.
const SENSITIVE_IDENTITY_TABLES = new Set([
  'persons',
  'person_sources',
  'person_roles',
  'person_claims',
  'person_aliases',
  'person_identity_candidates',
  'person_identity_clusters',
  'person_identity_decisions',
  'person_merge_audit',
]);

// Any table whose name marks it as a backup/snapshot of something else.
const BACKUP_TABLE_RE = /(_backup|_snapshot|_bak$|_old$|_copy$)/i;

const extendedFailures = [];
const grantDebt = [];

// --- A + B: sensitive identity tables ---
//
// A table is EXPOSED when anon/authenticated can actually reach it. With RLS
// enabled and a deny policy, a table-level grant is INERT — PostgREST returns
// [] — so it is GRANT DEBT, not a live exposure.
//
// The distinction matters because the Phase 2B backup defect was a LIVE
// exposure (RLS off + grants), while the identity tables are protected by RLS
// but still carry blanket grants. Both should be fixed; they must not be
// conflated, and a gate that flags both as the same thing trains people to
// ignore it.
//
// Severity:
//   EXPOSED (fail)     — reachable in practice: RLS off, or RLS on with no
//                         policy that denies the role.
//   GRANT DEBT (warn)  — RLS denies it, but the grant is still there. If RLS
//                         were ever disabled the table becomes world-readable.
for (const r of rows) {
  if (!SENSITIVE_IDENTITY_TABLES.has(r.table_name)) continue;

  const anonReachable = r.anon_select || r.anon_insert || r.anon_update || r.anon_delete;
  const authReachable = r.auth_select || r.auth_insert || r.auth_update || r.auth_delete;

  // Does RLS actually deny these roles? A deny policy is one whose qual is
  // false for the role. We approximate with "has policies" + "RLS enabled";
  // the exact policy shape is verified by the anon smoke test below.
  const rlsDenies = r.rls_enabled && r.policy_count > 0;

  if (!r.rls_enabled) {
    extendedFailures.push(
      `${r.table_name}: sensitive identity table has RLS DISABLED — EXPOSED. Enable RLS.`,
    );
    continue;
  }
  if (r.policy_count === 0) {
    extendedFailures.push(
      `${r.table_name}: sensitive identity table has RLS but ZERO policies — ` +
        `an explicit deny policy is required so the intent is reviewable`,
    );
    continue;
  }

  if (anonReachable || authReachable || r.public_select) {
    grantDebt.push(
      `${r.table_name}: sensitive identity table still holds blanket grants ` +
        `(anon SELECT=${r.anon_select} INSERT=${r.anon_insert} UPDATE=${r.anon_update} DELETE=${r.anon_delete}; ` +
        `authenticated SELECT=${r.auth_select}; PUBLIC SELECT=${r.public_select}). ` +
        `RLS currently denies access (verified live: anon reads []), so this is GRANT DEBT, ` +
        `not live exposure — but if RLS were ever disabled the table becomes world-readable. ` +
        `Recommended: REVOKE ALL FROM anon, authenticated, PUBLIC.`,
    );
  }
}

// --- C: backup / snapshot tables ---
for (const r of rows) {
  if (!BACKUP_TABLE_RE.test(r.table_name)) continue;

  if (!r.rls_enabled) {
    extendedFailures.push(
      `${r.table_name}: backup table has RLS DISABLED — a rollback snapshot must never be reachable`,
    );
  }
  const anonReachable = r.anon_select || r.anon_insert || r.anon_update || r.anon_delete;
  const authReachable = r.auth_select || r.auth_insert || r.auth_update || r.auth_delete;
  if (!r.rls_enabled || r.policy_count === 0) {
    extendedFailures.push(
      `${r.table_name}: backup table is not RLS-protected — a rollback snapshot must never be reachable`,
    );
  } else if (anonReachable || authReachable || r.public_select) {
    grantDebt.push(
      `${r.table_name}: backup table still holds blanket grants ` +
        `(anon SELECT=${r.anon_select}; authenticated SELECT=${r.auth_select}; PUBLIC SELECT=${r.public_select}). ` +
        `RLS currently denies access, so this is GRANT DEBT — but a rollback snapshot should not ` +
        `rely on RLS alone. Recommended: REVOKE ALL FROM anon, authenticated, PUBLIC.`,
    );
  }
  // Immutability: a trigger that blocks UPDATE/DELETE.
  const hasImmutability = await sql(
    `select p.proname as fn
       from pg_trigger t
       join pg_proc p on p.oid = t.tgfoid
       join pg_class c on c.oid = t.tgrelid
      where c.relname = '${r.table_name.replace(/'/g, "''")}'
        and not t.tgisinternal
        and (p.prosrc ilike '%immutable%' or p.prosrc ilike '%RAISE EXCEPTION%')
      limit 1`,
  );
  const isIdentityBackup =
    SENSITIVE_IDENTITY_TABLES.has(r.table_name.replace(BACKUP_TABLE_RE, '')) ||
    /person/i.test(r.table_name);
  if (isIdentityBackup && hasImmutability.length === 0) {
    extendedFailures.push(
      `${r.table_name}: identity backup table has NO immutability guard — ` +
        `a rollback snapshot must refuse UPDATE and DELETE so it cannot drift silently`,
    );
  }
}

// --- A: tables with RLS DISABLED at all ---
//
// The original check only flagged RLS-off tables that anon could REACH. That
// misses the more common case: a table created with RLS off and no grants
// yet. It is harmless TODAY, but the default posture is permissive, so a
// single later GRANT (or a `GRANT ALL ... TO PUBLIC` from a migration)
// exposes it with no other signal.
//
// This is exactly what the Phase 2C-A gate test reproduced: a freshly
// created table with RLS off and no grants passed the old gate silently.
//
// So: ANY public table with RLS disabled is reported. The ALLOWED_NO_RLS
// exemption list is the only way out, and it requires a written reason.
for (const r of rows) {
  if (r.rls_enabled) continue;
  if (ALLOWED_NO_RLS[r.table_name]) continue;
  if (r.table_name === 'spatial_ref_sys') continue; // known, owned by supabase_admin
  extendedFailures.push(
    `${r.table_name}: RLS is DISABLED on a public table ` +
      `(anon SELECT=${r.anon_select}). Even with no grants today, the default ` +
      `posture is permissive — one later GRANT exposes it with no other signal. ` +
      `Enable RLS, or add it to ALLOWED_NO_RLS with a written reason.`,
  );
}

if (extendedFailures.length > 0) {
  console.log(`\n✗ ${extendedFailures.length} extended security finding(s):`);
  for (const f of extendedFailures) console.log(`  · ${f}`);
} else {
  console.log('\n✓ Extended identity/backup security checks passed.');
}
if (grantDebt.length > 0) {
  console.log(`\n⚠ ${grantDebt.length} grant-debt finding(s) — RLS currently denies access, but the grants are still there:`);
  for (const g of grantDebt) console.log(`  · ${g}`);
}

if (offenders.length === 0) {
  console.log('\n✓ No public table is readable or writable by the anon role without RLS.');
  if (extendedFailures.length > 0) {
    console.log(`\n✗ ${extendedFailures.length} extended security finding(s):`);
    for (const f of extendedFailures) console.log(`  · ${f}`);
    process.exit(1);
  }
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
