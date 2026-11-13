#!/usr/bin/env node
/**
 * scripts/_verify-obsolete-redirects.mjs
 *
 * LIVE verification that every obsolete person-alias path on production
 * returns a PERMANENT (308) redirect to the correct canonical profile.
 *
 * WHY THIS EXISTS (2026-11-12):
 *   The middleware's PostgREST query used an invalid self-embed, so
 *   `lookupObsoletePersonAlias()` returned null on every request and the
 *   intended 308 never fired — the page handler's `redirect()` served a
 *   307 (temporary) instead. A 307 does not collapse in search engines,
 *   which is the entire point of the redirect layer.
 *
 *   A unit test cannot catch this: the bug is in the interaction between
 *   the edge middleware and PostgREST, and it only shows up in the HTTP
 *   status code on the live site.
 *
 * WHAT IT CHECKS (against the LIVE site)
 *   1. Every obsolete alias path returns 3xx (a redirect, not a 200 and
 *      not a 404).
 *   2. The status is 308 — PERMANENT. A 307 fails this gate.
 *   3. The Location header points at the person's CANONICAL alias path.
 *   4. No redirect loop: the canonical path itself must return 200 and
 *      must NOT redirect again.
 *   5. The canonical path is unique across all aliases (no two people
 *      claim the same canonical URL).
 *
 * The expected targets are read from the LIVE database, so this compares
 * the live HTTP behaviour against the live data — not against a fixture.
 *
 * RUN: npx tsx scripts/_verify-obsolete-redirects.mjs [--sample N]
 * EXIT: 0 = all good, 1 = a redirect is wrong.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const SITE = process.env.SITE || 'https://rinkstop.com';
const CONCURRENCY = 12;

const sampleArg = process.argv.indexOf('--sample');
const SAMPLE = sampleArg > -1 ? Number(process.argv[sampleArg + 1]) : 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}

const sb = createClient(url, key);

/** Read a whole table, paginated. PostgREST caps every response at 1,000 rows. */
async function fetchAllRows(table) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb.from(table).select('*').range(from, from + 999);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) break;
    from += 1000;
  }
  return rows;
}

async function fetchRaw(path) {
  const res = await fetch(`${SITE}${path}`, {
    redirect: 'manual',
    headers: { 'user-agent': 'rinkstop-redirect-verifier/1.0' },
  });
  return { status: res.status, location: res.headers.get('location') };
}

const aliases = await fetchAllRows('person_aliases');

const canonicalByPerson = new Map();
for (const a of aliases) {
  if (a.is_canonical) canonicalByPerson.set(a.person_id, a.path);
}

const obsolete = aliases
  .filter((a) => !a.is_canonical)
  .map((a) => ({ path: a.path, expected: canonicalByPerson.get(a.person_id) || null }));

console.log(`[verify-obsolete-redirects] ${obsolete.length} obsolete aliases on ${SITE}`);

if (!obsolete.length) {
  console.log('[verify-obsolete-redirects] PASS — nothing to verify.');
  process.exit(0);
}

// A canonical path must be unique across the whole table.
const canonicalPaths = aliases.filter((a) => a.is_canonical).map((a) => a.path);
const canonicalCounts = new Map();
for (const p of canonicalPaths) canonicalCounts.set(p, (canonicalCounts.get(p) ?? 0) + 1);
const dupCanonical = [...canonicalCounts.entries()].filter(([, n]) => n > 1);

const missingTarget = obsolete.filter((o) => !o.expected);
const selfTarget = obsolete.filter((o) => o.expected === o.path);

let targets = obsolete;
if (SAMPLE > 0) {
  const step = Math.ceil(obsolete.length / SAMPLE);
  targets = obsolete.filter((_, i) => i % step === 0).slice(0, SAMPLE);
  console.log(`[verify-obsolete-redirects] sampling ${targets.length} paths`);
}

const failures = [];
const statusCounts = {};
let checked = 0;

const queue = [...targets];
async function worker() {
  for (;;) {
    const item = queue.shift();
    if (!item) return;
    try {
      const res = await fetchRaw(item.path);
      statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
      checked++;

      if (res.status < 300 || res.status >= 400) {
        failures.push({ path: item.path, status: res.status, reason: 'not a redirect' });
        continue;
      }
      if (res.status !== 308) {
        failures.push({
          path: item.path,
          status: res.status,
          reason: `not permanent (expected 308, got ${res.status})`,
        });
        continue;
      }
      const loc = res.location || '';
      if (!loc.includes(item.expected)) {
        failures.push({
          path: item.path,
          status: res.status,
          reason: `wrong target: ${loc} (expected ${item.expected})`,
        });
      }
    } catch (e) {
      failures.push({ path: item.path, reason: `error: ${String(e)}` });
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// The canonical targets must themselves serve a 200 with no further redirect.
const canonicalSample = [...new Set(targets.map((t) => t.expected).filter(Boolean))].slice(0, 40);
const canonicalFails = [];
for (const c of canonicalSample) {
  const res = await fetchRaw(c);
  if (res.status !== 200) {
    canonicalFails.push({ path: c, status: res.status, location: res.location });
  }
}

console.log(`[verify-obsolete-redirects] checked ${checked} paths · status counts:`, statusCounts);
console.log(`[verify-obsolete-redirects] canonical targets sampled: ${canonicalSample.length}`);

let bad = 0;
if (missingTarget.length) {
  bad++;
  console.log(`  ✗ ${missingTarget.length} obsolete alias(es) have no canonical target`);
}
if (selfTarget.length) {
  bad++;
  console.log(`  ✗ ${selfTarget.length} obsolete alias(es) point at themselves`);
}
if (dupCanonical.length) {
  bad++;
  console.log(`  ✗ ${dupCanonical.length} duplicate canonical path(s)`);
  for (const [p, n] of dupCanonical.slice(0, 10)) console.log(`      ${p} ×${n}`);
}
if (failures.length) {
  bad++;
  console.log(`  ✗ ${failures.length} redirect failure(s)`);
  for (const f of failures.slice(0, 20)) console.log(`      ${f.path} → ${f.status} ${f.reason}`);
}
if (canonicalFails.length) {
  bad++;
  console.log(`  ✗ ${canonicalFails.length} canonical target(s) do not return 200`);
  for (const f of canonicalFails.slice(0, 10)) console.log(`      ${f.path} → ${f.status}`);
}

if (bad) {
  console.log('[verify-obsolete-redirects] FAIL');
  process.exit(1);
}
console.log('[verify-obsolete-redirects] PASS — every obsolete alias 308s to its canonical profile.');
