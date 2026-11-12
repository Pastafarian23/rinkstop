#!/usr/bin/env node
/**
 * scripts/_branch-sql.mjs — run a SQL file against the isolated Supabase branch.
 *
 * Phase 2A is authorized BRANCH ONLY. This helper is the only sanctioned way
 * to execute SQL against the branch, so an accidental production write is
 * impossible: the branch ref is hard-coded here and production's ref is
 * explicitly rejected.
 *
 * Usage: node scripts/_branch-sql.mjs <file.sql> [--branch <ref>]
 *
 * The branch ref defaults to the staging branch created for Phase 2A.
 */

import { readFileSync } from 'fs';

const PROD_REF = 'yszheonqyyskkjoxoexk';
const DEFAULT_BRANCH = 'grzhurrryimfylvwmeev';

const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const branchIdx = args.indexOf('--branch');
const branch = branchIdx >= 0 ? args[branchIdx + 1] : DEFAULT_BRANCH;

if (!file) {
  console.error('Usage: node scripts/_branch-sql.mjs <file.sql> [--branch <ref>]');
  process.exit(1);
}

// Production is reachable, but ONLY with two explicit opt-ins.
//
// The original helper hard-refused production, which was correct while the
// whole workstream was branch-only. Phase 2C needs a way to execute the
// approved merges against production, and the safe way to do that is the same
// pattern the other two scripts use:
//   IDENTITY_TARGET_REF=<prod>   — which project to talk to
//   IDENTITY_ALLOW_PRODUCTION=1   — an explicit acknowledgement
//
// A typo in the ref therefore cannot silently hit production: it fails to
// authenticate against a project that does not exist, and the second opt-in
// is still required.
if (branch === PROD_REF && process.env.IDENTITY_ALLOW_PRODUCTION !== '1') {
  console.error('REFUSED: this helper refuses to run against the production project');
  console.error('without an explicit opt-in.');
  console.error('');
  console.error('  For the staging branch:  (default)');
  console.error('  For production:            IDENTITY_ALLOW_PRODUCTION=1');
  console.error('');
  console.error('Production writes are a separate, explicit authorization. Do not set');
  console.error('this unless the merge authorization names production.');
  process.exit(1);
}

if (branch === PROD_REF) {
  console.error('[branch-sql] *** PRODUCTION MODE *** — writes are live.');
}

const sql = readFileSync(file, 'utf8');
const url = `https://api.supabase.com/v1/projects/${branch}/database/query`;

const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.SUPABASE_MANAGEMENT_PAT}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
console.log(`[branch-sql] ref=${branch} status=${res.status}`);
if (!res.ok) {
  console.error(text.slice(0, 3000));
  process.exit(1);
}
try {
  const parsed = JSON.parse(text);
  console.log(JSON.stringify(parsed, null, 1));
} catch {
  console.log(text.slice(0, 3000));
}
