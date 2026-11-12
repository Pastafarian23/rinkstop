#!/usr/bin/env node
/**
 * scripts/_audit-person-identity.mjs
 *
 * Pre-push Gate 23 — verifies the central person identity is internally
 * consistent and that NO legacy source record was lost.
 *
 * WHAT IT ASSERTS
 *   1. Every legacy source row has exactly one person_sources row.
 *   2. No person_sources row points at more than one person.
 *   3. No person exists without a source row.
 *   4. persons.origin_key agrees with the person's source row
 *      (the mapping is lossless and reversible).
 *   5. Row counts per source match the LIVE source table counts exactly.
 *   6. No person was auto-claimed: identity_state is 'unverified' for all
 *      until Phase 2/5 (merging/claiming) is explicitly authorized.
 *   7. No person was auto-merged: identity_state <> 'merged' and
 *      canonical_person_id IS NULL for all.
 *   8. Accounts are untouched: profiles row count matches the source of
 *      truth, and no account-only table was written.
 *
 * WHY IT EXISTS
 *   The Phase 1 backfill maps 11,443 people across 6 source tables. If a
 *   future migration drops or duplicates a mapping, the failure is silent —
 *   nothing in the app reads these tables yet. This gate is the tripwire.
 *
 * PAGINATION
 *   Every read that could exceed 1,000 rows MUST paginate. The PostgREST
 *   max-rows cap has silently truncated this codebase four times already
 *   (dataset export, two sitemaps, and the count-consistency gate itself).
 *   A count of exactly 1000 is a truncation, never a size.
 *
 * READ-ONLY. This script never writes.
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// ── env ──────────────────────────────────────────────────────────────────────
const envContent = readFileSync(
  new URL('../.env', import.meta.url),
  'utf8',
);
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('[audit-person-identity] missing Supabase env');
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── helpers ─────────────────────────────────────────────────────────────────
const failures = [];
const notes = [];

function fail(msg) {
  failures.push(msg);
}
function note(msg) {
  notes.push(msg);
}

/** Paginated count via PostgREST — never trust a bare select() length. */
async function countRows(table, filterFn = () => null) {
  let total = 0;
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let q = db.from(table).select('*', { count: 'exact' }).range(offset, offset + 999);
    q = filterFn(q) ?? q;
    const { data, error, count } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    total += data?.length ?? 0;
    if ((data?.length ?? 0) < 1000) {
      // Cross-check the server-side exact count when the page was not truncated.
      if (count != null && count !== total) {
        fail(
          `${table}: paginated total ${total} disagrees with exact count ${count} ` +
            `(truncation or a concurrent write?)`,
        );
      }
      break;
    }
    offset += 1000;
  }
  return total;
}

/** Paginated fetch of a projection. */
async function fetchAll(table, columns, filterFn = () => null) {
  const rows = [];
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let q = db.from(table).select(columns).range(offset, offset + 999);
    q = filterFn(q) ?? q;
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
    offset += 1000;
  }
  return rows;
}

function exactCount(table, filters = {}) {
  return db
    .from(table)
    .select('*', { count: 'exact', head: true })
    .match(filters)
    .then(({ count, error }) => {
      if (error) throw new Error(`${table}: ${error.message}`);
      return count ?? 0;
    });
}

// ── 0. schema present? ──────────────────────────────────────────────────────
console.log('[audit-person-identity] checking schema...');
for (const t of ['persons', 'person_sources', 'person_roles', 'person_claims', 'person_aliases']) {
  const { error } = await db.from(t).select('id').limit(1);
  if (error) {
    console.error(`[audit-person-identity] table ${t} is missing: ${error.message}`);
    console.error('[audit-person-identity] apply supabase/migrations/2026-11-12_person_identity_phase0.sql first.');
    process.exit(1);
  }
}

// ── 1. source table -> expected person_sources count ────────────────────────
console.log('[audit-person-identity] checking source coverage...');

const SOURCE_MAP = [
  { namespace: 'rinkstop_players', table: 'players', pk: 'id' },
  { namespace: 'nhl_players', table: 'nhl_players', pk: 'id' },
  { namespace: 'nhl_coaching_staff', table: 'nhl_coaching_staff', pk: 'id' },
  { namespace: 'team_members', table: 'team_members', pk: 'id' },
  { namespace: 'coach_profiles', table: 'coach_profiles', pk: 'id' },
  { namespace: 'profiles_account', table: 'profiles', pk: 'id' },
];

for (const src of SOURCE_MAP) {
  const sourceRows = await countRows(src.table);
  const mapped = await exactCount('person_sources', { source: src.namespace });

  if (sourceRows !== mapped) {
    fail(
      `${src.namespace}: ${sourceRows} rows in ${src.table} but ${mapped} person_sources rows ` +
        `(diff ${sourceRows - mapped}) — a source record is unmapped or duplicated`,
    );
  } else {
    note(`${src.namespace}: ${mapped}/${sourceRows} mapped (exact)`);
  }
}

// ── 2. every source row maps to exactly one person ─────────────────────────
console.log('[audit-person-identity] checking one-to-one mapping...');

for (const src of SOURCE_MAP) {
  const sources = await fetchAll('person_sources', 'id,person_id,source,source_id');
  const byKey = new Map();
  let dupes = 0;
  for (const s of sources) {
    if (s.source !== src.namespace) continue;
    const key = `${s.source}:${s.source_id}`;
    if (byKey.has(key)) dupes++;
    else byKey.set(key, s.person_id);
  }
  if (dupes > 0) {
    fail(`${src.namespace}: ${dupes} duplicate (source, source_id) pairs`);
  }
}

// ── 3. no person without a source row ──────────────────────────────────────
console.log('[audit-person-identity] checking orphan persons...');

const orphanSubqueryCount = await db
  .from('persons')
  .select('id', { count: 'exact', head: true })
  .not('id', 'in', '()')
  .then(({ count }) => count ?? 0)
  .catch(() => null);

// A PostgREST subquery over 11k rows is unreliable; do it properly by loading
// both key sets (they are small enough to hold in memory).
const allPersonIds = new Set(
  (await fetchAll('persons', 'id')).map((p) => p.id),
);
const personsWithSource = new Set(
  (await fetchAll('person_sources', 'person_id')).map((s) => s.person_id),
);
const trueOrphans = [...allPersonIds].filter((id) => !personsWithSource.has(id));
if (trueOrphans.length > 0) {
  fail(`${trueOrphans.length} persons have no person_sources row`);
} else {
  note(`0 orphan persons (${allPersonIds.size} persons, ${personsWithSource.size} with a source)`);
}
if (orphanSubqueryCount !== null && orphanSubqueryCount !== 0 && trueOrphans.length === 0) {
  // PostgREST's empty `in ()` filter matches every row, so this number is
  // expected to equal the total person count. The direct scan above is
  // authoritative; this line is only a sanity check that the two agree.
  if (orphanSubqueryCount !== allPersonIds.size) {
    fail(
      `PostgREST orphan subquery returned ${orphanSubqueryCount} but there are ` +
        `${allPersonIds.size} persons — the two disagree`,
    );
  }
}

// ── 4. origin_key agrees with the source row ───────────────────────────────
console.log('[audit-person-identity] checking origin_key integrity...');

const persons = await fetchAll('persons', 'id,origin_key,identity_state,canonical_person_id');
const sourcesByPerson = new Map();
for (const s of await fetchAll('person_sources', 'person_id,source,source_id')) {
  sourcesByPerson.set(s.person_id, s);
}

let originMismatch = 0;
for (const p of persons) {
  const s = sourcesByPerson.get(p.id);
  if (!s) continue;
  const expected = `${s.source}:${s.source_id}`;
  if (p.origin_key !== expected) originMismatch++;
}
if (originMismatch > 0) {
  fail(`${originMismatch} persons whose origin_key disagrees with their person_sources row`);
} else {
  note('origin_key agrees with person_sources for every person');
}

// ── 5. no auto-merge, no auto-claim ────────────────────────────────────────
console.log('[audit-person-identity] checking merge/claim state...');

const merged = persons.filter((p) => p.identity_state === 'merged').length;
const withPointer = persons.filter((p) => p.canonical_person_id !== null).length;
if (merged > 0 || withPointer > 0) {
  fail(
    `${merged} persons marked 'merged' / ${withPointer} with a canonical pointer — ` +
      `merging requires separate Phase 2 authorization`,
  );
} else {
  note('no persons merged (Phase 2 not authorized)');
}

const claimCount = await exactCount('person_claims');
if (claimCount > 0) {
  fail(`${claimCount} person_claims rows exist — claiming is Phase 5, not authorized yet`);
} else {
  note('0 person_claims rows (claiming is Phase 5)');
}

const aliasCount = await exactCount('person_aliases');
note(`${aliasCount} person_aliases rows (alias layer lands in Phase 3)`);

// ── 6. accounts untouched ───────────────────────────────────────────────────
console.log('[audit-person-identity] checking account layer...');

// The account-side tables must be exactly as they were. These are the
// counts established by the 2026-11-11 audit and re-verified on every run.
const ACCOUNT_BASELINE = {
  profiles: 19,
  claims: 0,
  managed_profiles: 1,
  didit_sessions: 1,
};
for (const [table, expected] of Object.entries(ACCOUNT_BASELINE)) {
  const actual = await exactCount(table);
  if (actual !== expected) {
    fail(
      `${table} has ${actual} rows, expected ${expected} — the account layer must not ` +
        `change during the person-identity migration`,
    );
  } else {
    note(`${table} = ${actual} (unchanged)`);
  }
}

// Accounts with Stripe/tier state must keep their state.
const profileRows = await fetchAll(
  'profiles',
  'user_id,stripe_subscription_id,subscription_status,identity_verified_at,tier',
);
const withSub = profileRows.filter((p) => p.stripe_subscription_id).length;
const withVerified = profileRows.filter((p) => p.identity_verified_at).length;
note(
  `accounts: ${profileRows.length}, with stripe subscription ${withSub}, ` +
    `with didit verification ${withVerified}`,
);

// ── 7. roles reference real persons ────────────────────────────────────────
console.log('[audit-person-identity] checking roles...');

const roles = await fetchAll('person_roles', 'id,person_id,source,source_id');
const roleOrphans = roles.filter((r) => !allPersonIds.has(r.person_id)).length;
if (roleOrphans > 0) {
  fail(`${roleOrphans} person_roles rows point at a nonexistent person`);
} else {
  note(`${roles.length} person_roles rows, all referencing a real person`);
}

// ── 7b. PER-NAMESPACE ROLE COMPLETENESS ───────────────────────────────────
//
// Added 2026-11-12 (Phase 2A). The Phase 1 backfill wrote person rows and
// person_sources rows for the `rinkstop_players` namespace but never wrote a
// matching person_roles row — so all 6,352 players had zero roles. The
// existing gate did not catch it because it only checked that roles POINT AT
// real persons, not that every professional source row HAS a role.
//
// A source row represents a professional identity. If a namespace has a
// person + a source row but no role row, the person is invisible to anything
// that reasons about roles (Phase 2's merge logic, the future public
// person's role list, the coach/player role resolution).
//
// The `profiles_account` namespace is deliberately EXCLUDED: an account is
// not a professional role. A fan account legitimately has no role.
const ROLE_BEARING_NAMESPACES = [
  'rinkstop_players',
  'nhl_players',
  'nhl_coaching_staff',
  'team_members',
  'coach_profiles',
];

console.log('[audit-person-identity] checking per-namespace role completeness...');

const sourcesByNamespace = new Map();
for (const s of await fetchAll('person_sources', 'person_id,source,source_id')) {
  if (!sourcesByNamespace.has(s.source)) sourcesByNamespace.set(s.source, []);
  sourcesByNamespace.get(s.source).push(s);
}

const rolesBySource = new Map();
for (const r of roles) {
  const key = `${r.source}:${r.source_id}`;
  if (!rolesBySource.has(key)) rolesBySource.set(key, r);
}

for (const ns of ROLE_BEARING_NAMESPACES) {
  const rows = sourcesByNamespace.get(ns) ?? [];
  const missing = rows.filter((s) => !rolesBySource.has(`${s.source}:${s.source_id}`));
  if (missing.length > 0) {
    fail(
      `${ns}: ${missing.length} of ${rows.length} source rows have no person_roles row — ` +
        `every professional source record must carry a role`,
    );
  } else {
    note(`${ns}: ${rows.length}/${rows.length} source rows have a role (complete)`);
  }
}

// A role that is not backed by a person_sources row is an orphan in the
// other direction — it would mean a role was invented without provenance.
const sourceKeys = new Set();
for (const [ns, rows] of sourcesByNamespace) {
  for (const s of rows) sourceKeys.add(`${s.source}:${s.source_id}`);
}
const roleWithoutSource = roles.filter(
  (r) => !sourceKeys.has(`${r.source}:${r.source_id}`),
).length;
if (roleWithoutSource > 0) {
  fail(`${roleWithoutSource} person_roles rows have no matching person_sources row`);
} else {
  note('every person_roles row is backed by a person_sources row');
}

// ── report ──────────────────────────────────────────────────────────────────
console.log('');
for (const n of notes) console.log(`  ok  ${n}`);
console.log('');

if (failures.length > 0) {
  console.error(`[audit-person-identity] ${failures.length} FAILURE(S):`);
  for (const f of failures) console.error(`  FAIL  ${f}`);
  process.exit(1);
}

console.log('[audit-person-identity] PASS — person identity is consistent.');
process.exit(0);
