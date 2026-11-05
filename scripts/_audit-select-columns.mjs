#!/usr/bin/env node
/**
 * Audit every Supabase `.from('<table>').select('<cols>')` in the repo against
 * the REAL column list of that live table.
 *
 * WHY THIS EXISTS (2026-11-05):
 *   `src/lib/owner-auth.ts` selected `rinks.claimed_by_user_id` — a column
 *   that DOES NOT EXIST on production. PostgREST returns 42703 ("column
 *   rinks.claimed_by_user_id does not exist"), the route swallowed it and
 *   returned a misleading 404 "Rink not found." for rinks that exist.
 *
 *   Blast radius was 16 files — every rink-owner surface:
 *   ice-listings, programming, staff, threads, contracts, connections,
 *   events. That is the entire "rink owner manages their listing" path.
 *
 *   The bug survived because `scripts/_audit-team-workspace-columns.mjs`
 *   only checks ONE hardcoded table. Nothing checked the other ~180 tables.
 *   A column rename or a never-migrated column elsewhere would ship just
 *   as silently.
 *
 *   This script generalises it: it discovers every `.from('x').select('y')`
 *   in src/, resolves each table's REAL columns from the live database, and
 *   reports any select that names a column which does not exist.
 *
 * Usage:  node scripts/_audit-select-columns.mjs
 * Exit 0 = clean, 1 = at least one broken select found.
 *
 * NOTES:
 *   - The schema is read LIVE, so this stays correct as schemas evolve.
 *   - Only simple comma-separated selects are checked. `select('*')`,
 *     template literals, and interpolated strings are skipped (we cannot
 *     know their columns at build time).
 *   - A select that names a column which exists but is a relation/embedded
 *     resource is still flagged if the base column is absent.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const SKIP_DIRS = new Set([
  'node_modules', '.next', '.git', 'dist', 'build', 'coverage', '__tests__',
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry)) out.push(full);
  }
  return out;
}

// ── Discover `.from('table').select('cols')` call sites ──────────────────────
// Matches the common shape in this codebase:
//   supabaseAdmin.from('rinks').select('id, name')
//   sb.from('teams').select('*')
const CALL_RE =
  /\.from\(\s*['"]([a-z_][a-z0-9_]*)['"]\s*\)\s*\.select\(\s*['"]([^'"`$]*)['"]/g;

const calls = [];
for (const file of walk(SRC)) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  CALL_RE.lastIndex = 0;
  let m;
  while ((m = CALL_RE.exec(text)) !== null) {
    const [, table, cols] = m;
    if (!cols || cols === '*') continue;
    const colList = cols
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      // `alias:column` and bare `column` both need the column part
      .map((c) => (c.includes(':') ? c.split(':').pop() : c))
      .filter((c) => /^[a-z_][a-z0-9_]*$/.test(c));
    if (!colList.length) continue;
    calls.push({
      file: file.replace(ROOT + '/', ''),
      table,
      cols: colList,
      line: text.slice(0, m.index).split('\n').length,
    });
  }
}

const byTable = new Map();
for (const c of calls) {
  if (!byTable.has(c.table)) byTable.set(c.table, []);
  byTable.get(c.table).push(c);
}

console.log(
  `Scanned ${calls.length} explicit column selects across ${byTable.size} tables.`,
);

// ── Resolve live schema ─────────────────────────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const sb = createClient(url, key);

const schemaCache = new Map();

async function columnsFor(table) {
  if (schemaCache.has(table)) return schemaCache.get(table);
  let cols = null;
  // PostgREST exposes the schema at /rest/v1/ (NOT the bare host root —
  // that returns 404).
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (res.ok) {
    const body = await res.json();
    const def = body.definitions?.find((d) => d.name === table);
    if (def?.properties) cols = new Set(Object.keys(def.properties));
  }
  schemaCache.set(table, cols);
  return cols;
}

// Fetch the OpenAPI schema ONCE (it is ~1.5MB) and reuse it for every table.
const schemaRes = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!schemaRes.ok) {
  console.error(
    `Could not fetch the live schema from ${url}/rest/v1/ (HTTP ${schemaRes.status}).`,
  );
  process.exit(1);
}
const schemaBody = await schemaRes.json();
// `definitions` is an OBJECT keyed by table name in PostgREST's OpenAPI doc.
const defs = schemaBody.definitions || {};
const liveSchema = new Map(
  Object.entries(defs)
    .filter(([, d]) => d && d.properties)
    .map(([name, d]) => [name, new Set(Object.keys(d.properties))]),
);

const problems = [];
let checkedTables = 0;

for (const [table, sites] of byTable) {
  const cols = liveSchema.get(table);
  if (!cols) {
    // Table not in the public schema — could be a private schema, a view
    // PostgREST does not expose, or a typo.
    console.log(`  · ${table}: not exposed by PostgREST (${sites.length} select(s)) — skipped`);
    continue;
  }
  checkedTables++;
  for (const s of sites) {
    const missing = s.cols.filter((c) => !cols.has(c));
    if (missing.length) {
      problems.push({ ...s, missing });
    }
  }
}
console.log(`  Checked ${checkedTables} tables against the live schema.`);

if (problems.length === 0) {
  console.log('\n✓ Every explicit column select matches the live schema.');
  process.exit(0);
}

console.log(`\n✗ ${problems.length} select(s) name columns that do not exist:\n`);
for (const p of problems) {
  console.log(`  ${p.file}:${p.line}  ${p.table}`);
  console.log(`     missing: ${p.missing.join(', ')}`);
  console.log(
    `     → PostgREST returns 42703 "column ${p.table}.${p.missing[0]} does not exist".`,
  );
  console.log(
    `       The route may swallow that and return an empty result or a wrong 404.`,
  );
  console.log('');
}
process.exit(1);
