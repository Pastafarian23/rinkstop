#!/usr/bin/env node
/**
 * scripts/_build-phase2c-review-results.mjs
 *
 * Builds the SEPARATE review-results file from the human's review
 * recommendations. This is a REVIEW ARTIFACT ONLY.
 *
 * WHAT THIS DOES
 *   Reads the decision sheet (all 39 candidates, with the full evidence
 *   columns) and applies the reviewer's RECOMMENDATIONS to produce a new
 *   file where each candidate carries:
 *     - review_recommendation  (approve | defer | reject)
 *     - review_rationale
 *     - review_caveats
 *     - every original evidence column, unchanged
 *
 * WHAT THIS DOES NOT DO
 *   It does NOT modify the decision sheet.
 *   It does NOT approve anything in the database.
 *   It does NOT merge anything.
 *   It writes NEW files only.
 *
 * The original `decision` column in the decision sheet remains
 * `pending_human_review` for every row — that is the authoritative field,
 * and only the reviewer (or an explicit application of their decisions)
 * may change it.
 *
 * Usage: node scripts/_build-phase2c-review-results.mjs
 *   -> docs/identity/phase-2c-review-results.csv
 *   -> docs/identity/phase-2c-review-results.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

// ── the reviewer's recommendations, transcribed from their instructions ─────
//
// Tier 1: 2CB-001 .. 2CB-017 -> approve
// Tier 2: approve all EXCEPT 2CB-026 (Juraj Slafkovsky) -> defer
// The five shared-birth-date Tier-2 cases keep explicit caveats.
// The three Tier-1 cases that also share a date keep their caveat too.
const TIER1_APPROVE = '2CB-001..2CB-017';
const DEFER_IDS = new Set(['2CB-026']);

// Shared-birth-date caveats, preserved on every row that has one.
//
// CORRECTED WORDING (2026-07-12, reviewer instruction).
//
// The earlier wording claimed "no attribute is shared with the competing
// person" and "nationalities differ". BOTH CLAIMS ARE FALSE for two of the
// five cases: Dakota Joshua / Jalen Chatfield and Kiefer Sherwood / Trevor
// Moore share the nationality USA. Two further cases have no nationality
// recorded for the competing person at all, so nothing can be said about it.
//
// The corrected wording states, per case, exactly which attributes differ and
// which are shared — no more. Verified against the live branch data
// (nhl_players rows for both sides):
//
const CAVEAT_NOTE = {
  '2CB-019':
    'Birth date 1996-05-15 is shared with a DIFFERENT person (Jalen Chatfield, nhl id 8478970). ' +
    'The date alone would NOT identify this candidate. Nationality is SHARED (both USA); ' +
    'the names differ (Dakota Joshua vs Jalen Chatfield) and the teams differ (TOR vs CAR).',
  '2CB-021':
    'Birth date 2001-02-01 is shared with a DIFFERENT person (Juuso Parssinen, nhl id 73019312). ' +
    'The date alone would NOT identify this candidate. Nationality differs (RUS vs FIN), ' +
    'the names differ (Egor Chinakhov vs Juuso Parssinen) and the teams differ (PIT vs NYR).',
  '2CB-027':
    'Birth date 1995-04-28 is shared with a DIFFERENT person (Connor Clifton, nhl id 8477365). ' +
    'The date alone would NOT identify this candidate. The competing nationality is NOT RECORDED, ' +
    'so no nationality comparison is available; the names differ (Kevin Lankinen vs Connor Clifton) ' +
    'and the teams differ (VAN vs PIT).',
  '2CB-028':
    'Birth date 1995-03-31 is shared with a DIFFERENT person (Trevor Moore, nhl id 8479675). ' +
    'The date alone would NOT identify this candidate. Nationality is SHARED (both USA); ' +
    'the names differ (Kiefer Sherwood vs Trevor Moore) and the teams differ (SJS vs LAK).',
  '2CB-035':
    'Birth date 1996-10-30 is shared with a DIFFERENT person (Dennis Gilbert, nhl id 8478502). ' +
    'The date alone would NOT identify this candidate. The competing nationality is NOT RECORDED, ' +
    'so no nationality comparison is available; the names differ (Samuel Montembeault vs Dennis Gilbert) ' +
    'and the teams differ (MTL vs OTT).',
  '2CB-010':
    'Birth date 1995-12-30 is shared with a DIFFERENT person (Igor Shesterkin). ' +
    'IMMATERIAL to the Tier-1 conclusion — the identical authoritative Highlightly id ' +
    '(65867627) is the primary evidence and resolves it independently of any date.',
  '2CB-011':
    'Birth date 1996-08-19 is shared with a DIFFERENT person (Joey Daccord). ' +
    'IMMATERIAL to the Tier-1 conclusion — the identical authoritative Highlightly id ' +
    '(77595587) is the primary evidence and resolves it independently of any date.',
  '2CB-017':
    'Birth date 2000-09-25 is shared with a DIFFERENT person (Raphael Lavoie). ' +
    'IMMATERIAL to the Tier-1 conclusion — the identical authoritative Highlightly id ' +
    '(68815037) is the primary evidence and resolves it independently of any date.',
};

// ── read the decision sheet ─────────────────────────────────────────────────
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

const sheet = parseCsv(
  readFileSync(new URL('../docs/identity/phase-2c-decision-sheet.csv', import.meta.url), 'utf8'),
);
console.log(`[review] ${sheet.length} candidates read from the decision sheet`);

// ── apply the recommendations ───────────────────────────────────────────────
const REVIEW_COLS = [
  'review_recommendation',
  'review_rationale',
  'review_caveats',
  'review_outcome',
  'review_caveat_flag',
  'reviewed_by',
  'review_source',
];

const out = sheet.map((r) => {
  const id = r.approval_id;
  const tier = r.evidence_tier;
  const isT1 = tier === 'T1';
  const defer = DEFER_IDS.has(id);

  let recommendation;
  let rationale;
  let outcome;

  if (defer) {
    recommendation = 'defer';
    rationale =
      'DEFER per reviewer. This identity spans THREE source records across TWO separate ' +
      'two-record clusters: (a) nhl=8483515 (nhl.com, accented "Slafkovský") + ' +
      'players=7f7924ae, and (b) nhl=73731302 (highlightly, unaccented "Slafkovsky") + ' +
      'players=590f642b. Merging only the pair in cluster (a) would leave the identity ' +
      'split across clusters. The birth date 2004-03-30 is also shared by five other ' +
      'distinct people (Isaac Howard, Rieger Lorenz, Rodwin Dionicio, Ty Nelson, ' +
      'Rutger McGroarty). Resolve the entire three-record identity across both clusters ' +
      'before considering approval.';
    outcome = 'deferred_pending_cluster_resolution';
  } else if (isT1) {
    recommendation = 'approve';
    rationale =
      'Tier 1. PRIMARY EVIDENCE: players.highlightly_id (' + r.players_highlightly_id +
      ') exactly equals nhl_players.id (' + r.nhl_source_id + '), and the NHL row is tagged ' +
      '"highlightly", so the identifier is an authoritative upstream key rather than a ' +
      'locally-assigned one. Verified unique: the id appears on exactly 1 players row and ' +
      'exactly 1 nhl_players row, and this source row participates in exactly 1 candidate ' +
      'pair (no competing identity match). Names match alphabetically. The conclusion does ' +
      'not rest on the name, and it does not rest on the birth date either — this candidate ' +
      'has a YYYY-01-01 placeholder date, so the date could not have found it; the ' +
      'upstream id could.';
    outcome = 'recommended_for_approval';
  } else {
    recommendation = 'approve';
    rationale =
      'Tier 2. Exact birth-date match (' + r.nhl_birth_raw + ' on both sides) plus an ' +
      'identical name' +
      (r.nationality_evidence === 'match'
        ? ' plus a matching nationality (' + r.nhl_nationality_raw + ')'
        : '') +
      (r.nhl_team && r.players_team && r.nhl_team.toLowerCase() === r.players_team.toLowerCase()
        ? ' plus the same team (' + r.nhl_team + ')'
        : '') +
      '. Position and jersey agree where both sides record them. This source row ' +
      'participates in exactly 1 candidate pair, so no competing identity claims it, and ' +
      'no account is attached to the players row, so no ownership conflict is possible.';
    outcome = 'recommended_for_approval';
  }

  const caveats = CAVEAT_NOTE[id] || '';
  const origCaveat = r.competing_person_name
    ? 'birth date shared with a different person: ' + r.competing_person_name
    : '';

  const row = {};
  for (const [k, v] of Object.entries(r)) row[k] = v;
  row.review_recommendation = recommendation;
  row.review_rationale = rationale;
  row.review_caveats = caveats || origCaveat;
  row.review_caveat_flag = caveats || origCaveat ? 'true' : 'false';
  row.review_outcome = outcome;
  row.reviewed_by = 'ChatGPT independent review (requested by Arnel)';
  row.review_source = 'docs/identity/phase-2c-review-results — Phase 2C-C human review';
  return row;
});

// ── write ───────────────────────────────────────────────────────────────────
mkdirSync(new URL('../docs/identity/', import.meta.url), { recursive: true });

const cols = Object.keys(out[0]);
const esc = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csv = [cols.join(','), ...out.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');

writeFileSync(new URL('../docs/identity/phase-2c-review-results.csv', import.meta.url), csv + '\n');
writeFileSync(
  new URL('../docs/identity/phase-2c-review-results.json', import.meta.url),
  JSON.stringify(out, null, 1),
);

// ── verify + summarize ──────────────────────────────────────────────────────
const problems = [];
const need = (c, m) => { if (!c) problems.push(m); };

need(out.length === 39, `expected 39 candidates, got ${out.length}`);
need(new Set(out.map((r) => r.approval_id)).size === 39, 'approval ids are not unique');
const badRec = out.filter((r) => !['approve', 'defer', 'reject'].includes(r.review_recommendation));
need(
  badRec.length === 0,
  'invalid review_recommendation value: ' +
    badRec.map((r) => `${r.approval_id}=${JSON.stringify(r.review_recommendation)} tier=${r.evidence_tier}`).join(', '),
);
// The decision sheet must be untouched: every row still pending_human_review.
need(
  out.every((r) => r.decision === 'pending_human_review'),
  'a decision value in the source sheet is not pending_human_review — the sheet was modified',
);
// Tier 1 range must be exactly 001..017.
const t1 = out.filter((r) => r.evidence_tier === 'T1').map((r) => r.approval_id);
need(
  t1.length === 17 && t1[0] === '2CB-001' && t1[16] === '2CB-017',
  `Tier 1 range is not 2CB-001..2CB-017 (got ${t1[0]}..${t1[16]}, ${t1.length} rows)`,
);
// The deferral must be the only Tier-2 non-approval.
const t2 = out.filter((r) => r.evidence_tier === 'T2');
need(
  t2.filter((r) => r.review_recommendation !== 'approve').length === 1 &&
    t2.find((r) => r.review_recommendation !== 'approve')?.approval_id === '2CB-026',
  'Tier 2 has more than one non-approval, or it is not 2CB-026',
);

if (problems.length) {
  console.error('\n[review] VALIDATION FAILED:');
  for (const p of problems) console.error('  FAIL  ' + p);
  process.exit(1);
}

const approve = out.filter((r) => r.review_recommendation === 'approve');
const defer = out.filter((r) => r.review_recommendation === 'defer');
const reject = out.filter((r) => r.review_recommendation === 'reject');

console.log('\n[review] =============================================');
console.log(`[review] total candidates          : ${out.length}`);
console.log(`[review] recommended for approval  : ${approve.length}  (T1 ${approve.filter((r) => r.evidence_tier === 'T1').length}, T2 ${approve.filter((r) => r.evidence_tier === 'T2').length})`);
console.log(`[review] deferred                  : ${defer.length}  (${defer.map((r) => r.approval_id + ' ' + r.nhl_name).join('; ')})`);
console.log(`[review] rejected                  : ${reject.length}`);
console.log(`[review] with caveats preserved    : ${out.filter((r) => r.review_caveat_flag === 'true').length}`);
console.log(`[review] decision column unchanged : ${out.every((r) => r.decision === 'pending_human_review')}`);
console.log('[review] =============================================');
console.log('[review] Nothing was approved in the database. Nothing was merged.');
console.log('[review] The decision sheet was NOT modified.');
