#!/usr/bin/env node
/**
 * scripts/_gate-identity-cluster-completeness.mjs
 *
 * Gate 25 — the CLUSTER-COMPLETENESS GATE for the production merge path.
 *
 * WHY THIS GATE EXISTS (2026-07-12)
 *   The Phase 2C-A audit found that 977 of the 1,027 merge-eligible candidate
 *   pairs live inside MULTI-RECORD CLUSTERS — name clusters where more than
 *   two source records share a name. In 182 of those clusters, the SAME
 *   `players` row is a merge candidate for TWO different `nhl_players` rows.
 *
 *   Merging those pairwise is unsafe:
 *     merge A -> players_X.person_id = nhl_A
 *     merge B -> players_X.person_id = nhl_B   <- silently re-points a source
 *                                                  row the first merge moved
 *
 *   The merge function would raise on the duplicate-key check, so it fails
 *   LOUDLY rather than corrupting — but a naive batch just stalls at 182
 *   clusters with no progress, and a "workaround" that skips the guard would
 *   corrupt data.
 *
 *   This gate makes the hazard a PRE-FLIGHT failure instead of a mid-batch
 *   surprise.
 *
 * WHAT IT ASSERTS
 *   1. Every approved decision is in a TWO-RECORD cluster.
 *   2. No two approved decisions share an `nhl_source_id`.
 *   3. No two approved decisions share a `players_source_id`.
 *   4. No two approved decisions share a person id on either side.
 *   5. No approved decision is a protected conflict.
 *   6. Every approved decision's source rows still exist and still resolve.
 *   7. The approved set, applied pairwise, would not move any source row
 *      twice (the direct simulation of the hazard).
 *
 * RUN: node scripts/_gate-identity-cluster-completeness.mjs
 * EXIT: 0 = safe to merge the approved set, 1 = a hazard exists.
 *
 * READ-ONLY. This gate never writes.
 */

import { readFileSync } from 'fs';

const BRANCH_REF = process.env.IDENTITY_TARGET_REF || 'grzhurrryimfylvwmeev';
const PROD_REF = 'yszheonqyyskkjoxoexk';

const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

if (BRANCH_REF === PROD_REF && !process.env.IDENTITY_ALLOW_PRODUCTION) {
  console.error('REFUSED: run this gate against the staging branch.');
  console.error('For production, set IDENTITY_ALLOW_PRODUCTION=1 deliberately.');
  process.exit(1);
}

async function q(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${BRANCH_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_MANAGEMENT_PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    console.error('QUERY FAILED:', text.slice(0, 900));
    process.exit(1);
  }
  return JSON.parse(text);
}

const failures = [];
const notes = [];

// LEFT JOIN, deliberately.
//
// The original version used an INNER JOIN to person_identity_candidates and
// person_identity_clusters, which meant an approval row that had no matching
// candidate row was INVISIBLE to the gate. That is the worst possible
// failure mode for a safety gate: the most anomalous approvals — exactly the
// ones a gate exists to catch — were the ones it could not see.
//
// The gate must examine EVERY approved decision, including any that do not
// correspond to a known candidate. A LEFT JOIN makes those visible as rows
// with NULL cluster data, which the checks below then reject.
const rows = await q(`
  SELECT d.nhl_source_id, d.players_source_id, d.nhl_person_id, d.players_person_id,
         d.decision, d.decided_by, d.decided_at, d.evidence->>'protected' AS protected,
         cl.cluster_size, cl.has_multi_record, cl.cluster_key,
         c.confidence, c.recommended_action,
         (c.id IS NOT NULL) AS has_candidate_row
    FROM public.person_identity_decisions d
    LEFT JOIN public.person_identity_candidates c
      ON (c.nhl_source_id, c.players_source_id) = (d.nhl_source_id, d.players_source_id)
    LEFT JOIN public.person_identity_clusters cl ON cl.cluster_key = c.cluster_key
   WHERE d.decision = 'approved_to_merge'
   ORDER BY d.nhl_source_id
`);

notes.push(`${rows.length} approved decision(s) found`);

if (rows.length === 0) {
  console.log('[gate-cluster] No approved decisions — nothing to merge. PASS.');
  process.exit(0);
}

// ── 1. every approval is in a two-record cluster ────────────────────────────
const inMulti = rows.filter((r) => r.has_multi_record);
if (inMulti.length) {
  failures.push(
    `${inMulti.length} approved decision(s) are inside a MULTI-RECORD cluster ` +
      `(${inMulti.map((r) => r.nhl_source_id + '/' + r.players_source_id).join(', ')}). ` +
      `Those require whole-cluster resolution (Phase 2D), not a pairwise merge.`,
  );
}
const wrongSize = rows.filter((r) => r.cluster_size == null || Number(r.cluster_size) !== 2);
if (wrongSize.length) {
  failures.push(
    `${wrongSize.length} approved decision(s) are not in a 2-record cluster ` +
      `(cluster_size values: ${[...new Set(wrongSize.map((r) => r.cluster_size))].join(', ')})`,
  );
}

// ── 2/3/4. no shared source id or person id ─────────────────────────────────
for (const key of ['nhl_source_id', 'players_source_id', 'nhl_person_id', 'players_person_id']) {
  const seen = new Map();
  for (const r of rows) {
    const v = r[key];
    if (!v) continue;
    if (seen.has(v)) {
      failures.push(
        `TWO APPROVED DECISIONS SHARE ${key}=${v} ` +
          `(${seen.get(v)} and ${r.nhl_source_id}/${r.players_source_id}). ` +
          `Merging them pairwise would re-point a source row twice.`,
      );
    } else seen.set(v, r.nhl_source_id + '/' + r.players_source_id);
  }
}

// ── 4b. every approval must correspond to a known candidate ─────────────────
//
// An approval with no matching candidate row is anomalous by definition: it
// was recorded against a pair the candidate table does not know about. That
// is either a typo, a stale row, or something that was injected directly.
const noCandidate = rows.filter((r) => r.has_candidate_row !== true);
if (noCandidate.length) {
  failures.push(
    `${noCandidate.length} approval(s) have NO matching candidate row ` +
      `(${noCandidate.map((r) => `${r.nhl_source_id}/${r.players_source_id}`).join(', ')}). ` +
      `An approval must reference a pair the candidate table knows about.`,
  );
}

// ── 5. no protected conflict approved ───────────────────────────────────────
const prot = rows.filter((r) => r.protected === 'true');
if (prot.length) {
  failures.push(
    `${prot.length} PROTECTED conflict(s) are approved ` +
      `(${prot.map((r) => r.nhl_source_id).join(', ')}). Protected conflicts can NEVER be merged.`,
  );
}

// ── 6. approved source rows still exist and still resolve ───────────────────
const missing = rows.filter(
  (r) => !r.nhl_person_id || !r.players_person_id || !r.nhl_source_id || !r.players_source_id,
);
if (missing.length) {
  failures.push(
    `${missing.length} approved decision(s) have missing source or person ids ` +
      `(${missing.map((r) => r.nhl_source_id).join(', ')})`,
  );
}

const resolved = await q(`
  SELECT count(*)::text AS total,
         count(*) FILTER (WHERE s.person_id IS NOT NULL)::text AS resolving
    FROM public.person_sources s
   WHERE (s.source, s.source_id) IN (
     SELECT 'nhl_players', nhl_source_id FROM public.person_identity_decisions WHERE decision='approved_to_merge'
     UNION ALL
     SELECT 'rinkstop_players', players_source_id FROM public.person_identity_decisions WHERE decision='approved_to_merge'
   )
`);
const srcTotal = Number(resolved[0].total);
const srcResolving = Number(resolved[0].resolving);
if (srcTotal !== srcResolving) {
  failures.push(
    `${srcTotal - srcResolving} of ${srcTotal} approved source rows do not resolve to a person — ` +
      `the mapping is broken`,
  );
} else {
  notes.push(`all ${srcTotal} approved source rows resolve to a person`);
}

// ── 7. SIMULATE the pairwise merge and detect double-moves ─────────────────
// For each source row that the approved set touches, count how many approved
// decisions would want to move it. More than one = the hazard.
const moved = await q(`
  WITH approved AS (
    SELECT nhl_source_id, players_source_id FROM public.person_identity_decisions
     WHERE decision='approved_to_merge'
  ), touches AS (
    SELECT 'nhl_players' AS src, nhl_source_id AS sid FROM approved
    UNION ALL
    SELECT 'rinkstop_players', players_source_id FROM approved
  )
  SELECT t.src, t.sid, count(*)::text AS times
    FROM touches t
   GROUP BY t.src, t.sid
  HAVING count(*) > 1
`);
if (moved.length) {
  failures.push(
    `HAZARD: ${moved.length} source row(s) would be moved by MORE THAN ONE approved merge ` +
      `(${moved.map((m) => `${m.src}:${m.sid} x${m.times}`).join(', ')}). ` +
      `The second merge would silently re-point a row the first merge already moved.`,
  );
} else {
  notes.push('no source row is touched by more than one approved merge');
}

// ── 8. every approval has a named human ────────────────────────────────────
const unattributed = rows.filter((r) => !r.decided_by || !r.decided_at);
if (unattributed.length) {
  failures.push(
    `${unattributed.length} approval(s) have no decided_by / decided_at — ` +
      `an approval must be attributable to a named human`,
  );
}

// ── report ──────────────────────────────────────────────────────────────────
console.log('');
for (const n of notes) console.log(`  ok  ${n}`);

if (failures.length) {
  console.log('');
  console.log(`[gate-cluster] ${failures.length} HAZARD(S):`);
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log('');
  console.log('[gate-cluster] DO NOT MERGE. Fix the approved set, or move the affected');
  console.log('[gate-cluster] clusters to Phase 2D whole-cluster resolution.');
  process.exit(1);
}

console.log('');
console.log(`[gate-cluster] PASS — ${rows.length} approved decision(s) are safe to merge pairwise.`);
console.log('[gate-cluster] Reminder: recording a decision is not a merge; the merge itself');
console.log('[gate-cluster] is a separate explicit call, one transaction per batch.');
process.exit(0);
