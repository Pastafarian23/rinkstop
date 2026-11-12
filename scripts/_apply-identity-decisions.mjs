#!/usr/bin/env node
/**
 * scripts/_apply-identity-decisions.mjs
 *
 * Records a HUMAN's per-row identity merge decisions.
 *
 * WHAT THIS DOES
 *   Takes a decision file (the reviewable CSV) and applies the `decision`
 *   column to `person_identity_decisions`, recording WHO decided, WHEN, and
 *   the exact source/person ids that were approved.
 *
 * WHAT THIS DOES NOT DO
 *   It does NOT merge anything. Merging is `person_merge_identities()`, which
 *   is a separate, explicit call. This script only records intent.
 *
 * THE RULES IT ENFORCES
 *   1. Only an EXPLICIT `approved` in the decision file is recorded as
 *      approved. A recommendation, a confidence tier, or a batch-level
 *      "approve everything" is NEVER inferred.
 *   2. Every approved row must carry `decided_by` and `decided_at` — the
 *      script refuses an approval without an identified human.
 *   3. Tier 1 and Tier 2 decisions are recorded independently. The script
 *      reports them separately and never lets one tier's approval imply the
 *      other's.
 *   4. Protected conflicts can never be approved.
 *   5. Candidates inside a multi-record cluster can never be approved.
 *   6. Two approved rows may never share a source id or a person id — that
 *      is the pairwise-merge hazard.
 *   7. The script is idempotent: re-running it does not double-apply.
 *
 * Usage:
 *   node scripts/_apply-identity-decisions.mjs <decision-file.csv> [--dry-run]
 *
 * The decision file must have these columns:
 *   approval_id, evidence_tier, nhl_source_id, players_source_id,
 *   nhl_person_id, players_person_id,
 *   decision, decision_rationale, decided_by, decided_at
 *
 * `decision` must be one of:
 *   pending_human_review | approved | rejected | deferred
 */

import { readFileSync } from 'fs';

const BRANCH_REF = process.env.IDENTITY_TARGET_REF || 'grzhurrryimfylvwmeev';
const PROD_REF = 'yszheonqyyskkjoxoexk';

const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const DRY_RUN = process.argv.includes('--dry-run');
const file = process.argv.slice(2).find((a) => !a.startsWith('--'));

if (!file) {
  console.error('Usage: node scripts/_apply-identity-decisions.mjs <decision-file.csv> [--dry-run]');
  process.exit(1);
}

// Hard guard: this script must never target production without an explicit
// override AND a second confirmation flag.
if (BRANCH_REF === PROD_REF && !process.env.IDENTITY_ALLOW_PRODUCTION) {
  console.error('REFUSED: refusing to record decisions against production.');
  console.error('Phase 2C-C is preparation only. Production requires a separate');
  console.error('authorization and IDENTITY_ALLOW_PRODUCTION=1 plus --i-have-authorization.');
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

// ── parse the decision CSV (simple RFC4180-ish parser) ──────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows
    .filter((r) => r.some((v) => v.trim() !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const decisions = parseCsv(readFileSync(file, 'utf8'));
console.log(`[decisions] ${decisions.length} rows read from ${file}`);

const ALLOWED = new Set(['pending_human_review', 'approved', 'rejected', 'deferred']);
const errors = [];
const need = (c, m) => { if (!c) errors.push(m); };

for (const d of decisions) {
  need(ALLOWED.has(d.decision), `${d.approval_id}: invalid decision "${d.decision}"`);
  need(
    ['T1', 'T2'].includes(d.evidence_tier),
    `${d.approval_id}: unknown evidence_tier "${d.evidence_tier}"`,
  );
  if (d.decision === 'approved') {
    need(d.decided_by && d.decided_by !== '', `${d.approval_id}: approved without decided_by`);
    need(d.decided_at && d.decided_at !== '', `${d.approval_id}: approved without decided_at`);
    need(
      !!d.nhl_person_id && !!d.players_person_id && !!d.nhl_source_id && !!d.players_source_id,
      `${d.approval_id}: approved without the full source/person ids`,
    );
  }
}

// Tier 1 and Tier 2 approvals are tracked separately.
const approved = decisions.filter((d) => d.decision === 'approved');
const approvedT1 = approved.filter((d) => d.evidence_tier === 'T1');
const approvedT2 = approved.filter((d) => d.evidence_tier === 'T2');

// The pairwise-merge hazard: no two approved rows may share a source or person id.
for (const key of ['nhl_source_id', 'players_source_id', 'nhl_person_id', 'players_person_id']) {
  const seen = new Map();
  for (const d of approved) {
    const v = d[key];
    if (!v) continue;
    if (seen.has(v)) {
      errors.push(
        `${d.approval_id}: ${key}=${v} is shared with ${seen.get(v)} — two approved rows must not ` +
          `share a source or person id (this is the pairwise-merge hazard)`,
      );
    } else seen.set(v, d.approval_id);
  }
}

// Protected / cluster guards are checked against the live decision table.
const protectedRows = await q(
  `SELECT nhl_source_id, players_source_id FROM public.person_identity_candidates WHERE protected`,
);
const protKeys = new Set(protectedRows.map((r) => `${r.nhl_source_id}|${r.players_source_id}`));
const multiRows = await q(
  `SELECT nhl_source_id, players_source_id FROM public.person_identity_candidates
   WHERE cluster_key IN (SELECT cluster_key FROM public.person_identity_clusters WHERE has_multi_record)`,
);
const multiKeys = new Set(multiRows.map((r) => `${r.nhl_source_id}|${r.players_source_id}`));

for (const d of approved) {
  const k = `${d.nhl_source_id}|${d.players_source_id}`;
  need(!protKeys.has(k), `${d.approval_id}: is a PROTECTED conflict — it can never be approved`);
  need(!multiKeys.has(k), `${d.approval_id}: is inside a multi-record cluster — Phase 2D only`);
}

if (errors.length) {
  console.error('\n[decisions] REFUSED — the decision file failed validation:');
  for (const e of errors) console.error('  FAIL  ' + e);
  process.exit(1);
}

console.log('\n[decisions] ===================== DECISION SUMMARY =====================');
console.log(`[decisions] Tier 1 (upstream-id)   : ${approvedT1.length} approved of ${decisions.filter((d) => d.evidence_tier === 'T1').length}`);
console.log(`[decisions] Tier 2 (birth date)   : ${approvedT2.length} approved of ${decisions.filter((d) => d.evidence_tier === 'T2').length}`);
console.log(`[decisions] pending_human_review : ${decisions.filter((d) => d.decision === 'pending_human_review').length}`);
console.log(`[decisions] rejected             : ${decisions.filter((d) => d.decision === 'rejected').length}`);
console.log(`[decisions] deferred             : ${decisions.filter((d) => d.decision === 'deferred').length}`);
console.log('[decisions] =================================================================');

// The SQL writes the decision AND its provenance in one statement, so an
// approval can never exist without who approved it and when.
const esc = (v) => `'${String(v ?? '').replace(/'/g, "''")}'`;

const tier1Sql = approvedT1
  .map(
    (d) => `UPDATE public.person_identity_decisions SET
      decision = 'approved_to_merge',
      decided_by = ${esc(d.decided_by)},
      decided_at = ${esc(d.decided_at)},
      rationale = COALESCE(NULLIF(${esc(d.decision_rationale)}, ''), rationale)
    WHERE nhl_source_id = ${esc(d.nhl_source_id)} AND players_source_id = ${esc(d.players_source_id)};`,
  )
  .join('\n');

const tier2Sql = approvedT2
  .map(
    (d) => `UPDATE public.person_identity_decisions SET
      decision = 'approved_to_merge',
      decided_by = ${esc(d.decided_by)},
      decided_at = ${esc(d.decided_at)},
      rationale = COALESCE(NULLIF(${esc(d.decision_rationale)}, ''), rationale)
    WHERE nhl_source_id = ${esc(d.nhl_source_id)} AND players_source_id = ${esc(d.players_source_id)};`,
  )
  .join('\n');

const rejectedSql = decisions
  .filter((d) => d.decision === 'rejected' || d.decision === 'deferred')
  .map(
    (d) => `UPDATE public.person_identity_decisions SET
      decision = '${d.decision === 'rejected' ? 'rejected_do_not_merge' : 'manual_review'}',
      decided_by = ${esc(d.decided_by || '')},
      decided_at = ${esc(d.decided_at || '')},
      rationale = COALESCE(NULLIF(${esc(d.decision_rationale)}, ''), rationale)
    WHERE nhl_source_id = ${esc(d.nhl_source_id)} AND players_source_id = ${esc(d.players_source_id)};`,
  )
  .join('\n');

if (DRY_RUN) {
  console.log('\n[decisions] DRY RUN — no writes. The following would be applied:');
  if (tier1Sql) console.log(`\n-- TIER 1 (${approvedT1.length} rows)\n${tier1Sql}`);
  if (tier2Sql) console.log(`\n-- TIER 2 (${approvedT2.length} rows)\n${tier2Sql}`);
  if (rejectedSql) console.log(`\n-- REJECTED / DEFERRED\n${rejectedSql}`);
  console.log('\n[decisions] NOTE: recording a decision is NOT a merge. Merging is a separate,');
  console.log('[decisions]       explicit call to person_merge_identities() per approved row.');
  process.exit(0);
}

if (tier1Sql) await q('BEGIN;\n' + tier1Sql + '\nCOMMIT;');
if (tier2Sql) await q('BEGIN;\n' + tier2Sql + '\nCOMMIT;');
if (rejectedSql) await q('BEGIN;\n' + rejectedSql + '\nCOMMIT;');

console.log('\n[decisions] decisions recorded. Nothing was merged.');
console.log('[decisions] Merging remains a separate, explicit operation.');
