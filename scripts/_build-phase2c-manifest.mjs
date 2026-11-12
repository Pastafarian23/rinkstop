#!/usr/bin/env node
/**
 * scripts/_build-phase2c-manifest.mjs
 *
 * Builds the Phase 2C-A approval manifest from the ISOLATED STAGING BRANCH.
 *
 * Phase 2C-A is PREPARATION AND STAGING VALIDATION ONLY. This script reads
 * from the branch and writes a local file. It NEVER writes to production and
 * NEVER merges anything.
 *
 * Usage: node scripts/_build-phase2c-manifest.mjs
 *   -> docs/identity/phase-2c-approval-manifest.csv
 *   -> docs/identity/phase-2c-approval-manifest.json
 *
 * WHAT THE MANIFEST CONTAINS
 *   For each of the 50 candidate pairs in clean two-record clusters:
 *     - both source namespaces and source ids
 *     - both person uuids
 *     - names and available identifying attributes
 *     - raw AND normalized birth dates
 *     - nationality, raw and normalized
 *     - the evidence supporting the proposed match
 *     - any conflicting or missing information
 *     - existing roles on both identities
 *     - proposed surviving person uuid and merged person uuid
 *     - a plain-English explanation
 *
 * EVIDENCE TIERS
 *   T1 — identical upstream id on BOTH sides (players.highlightly_id ==
 *        nhl_players.id). The same upstream entity recorded twice. Strongest
 *        possible evidence; independent of any name or date.
 *   T2 — no upstream id, but an EXACT birth date on both sides. Two
 *        independent person-level fields agree.
 *   T3 — no upstream id, and one side's birth date is a YYYY-01-01
 *        placeholder, so only the YEAR agrees. Name + birth year only. This
 *        is an assumption, not a confirmation, and is flagged for human
 *        review rather than recommended for merging.
 *
 * The manifest is a PROPOSAL FOR HUMAN REVIEW. It approves nothing.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const BRANCH_REF = 'grzhurrryimfylvwmeev';
const PROD_REF = 'yszheonqyyskkjoexk';

const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

if (BRANCH_REF === PROD_REF) {
  console.error('REFUSED: the manifest builder must never point at production.');
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
    console.error('QUERY FAILED:', text.slice(0, 800));
    process.exit(1);
  }
  return JSON.parse(text);
}

// ── 1. The candidate set: merge-eligible, outside every multi-record cluster ──
console.log('[manifest] extracting candidates from the staging branch...');

const EXTRACT = `
WITH cluster_multi AS (
  SELECT cluster_key FROM public.person_identity_clusters WHERE has_multi_record
), clean AS (
  SELECT c.*
  FROM public.person_identity_candidates c
  WHERE c.recommended_action = 'merge'
    AND c.cluster_key NOT IN (SELECT cluster_key FROM cluster_multi)
    AND NOT c.protected
)
SELECT
  c.cluster_key,
  c.nhl_source_id, c.nhl_person_id, c.nhl_name,
  c.players_source_id, c.players_person_id, c.players_name,
  c.confidence, c.birth_date_evidence, c.nationality_evidence,
  c.nhl_birth_raw::text AS nhl_birth_raw, c.nhl_birth_date::text AS nhl_birth_normalized,
  c.nhl_birth_is_placeholder AS nhl_birth_placeholder,
  c.players_birth_raw::text AS players_birth_raw, c.players_birth_date::text AS players_birth_normalized,
  c.players_birth_is_placeholder AS players_birth_placeholder,
  c.nhl_nationality, c.players_nationality,
  c.protected, c.explanation,
  np.role AS nhl_role, np.current_team_name, np.current_team_abbreviation,
  np.position AS nhl_position, np.jersey_number AS nhl_jersey_number,
  np.birth_date::text AS nhl_birth_live, np.nationality AS nhl_nationality_live,
  np.birth_place AS nhl_birth_place, np.is_active AS nhl_is_active, np.source AS nhl_source_tag,
  pp.position AS players_position, pp.team_id AS players_team_id,
  pp.jersey_number AS players_jersey_number, pp.birth_date::text AS players_birth_live,
  pp.nationality AS players_nationality_live, pp.claimable AS players_claimable,
  pp.user_id AS players_user_id, pp.highlightly_id AS players_highlightly_id,
  tw.name AS players_team_name, tw.slug AS players_team_slug,
  (SELECT count(*) FROM public.person_roles r WHERE r.person_id = c.nhl_person_id) AS nhl_role_count,
  (SELECT string_agg(r.role_type||':'||coalesce(r.role_detail,''), '|' ORDER BY r.role_type)
     FROM public.person_roles r WHERE r.person_id = c.nhl_person_id) AS nhl_roles,
  (SELECT count(*) FROM public.person_roles r WHERE r.person_id = c.players_person_id) AS players_role_count,
  (SELECT string_agg(r.role_type||':'||coalesce(r.role_detail,''), '|' ORDER BY r.role_type)
     FROM public.person_roles r WHERE r.person_id = c.players_person_id) AS players_roles,
  (SELECT count(*) FROM public.person_aliases a WHERE a.person_id = c.nhl_person_id) AS nhl_alias_count,
  (SELECT count(*) FROM public.person_aliases a WHERE a.person_id = c.players_person_id) AS players_alias_count
FROM clean c
JOIN public.nhl_players np ON np.id::text = c.nhl_source_id
JOIN public.players pp ON pp.id::text = c.players_source_id
LEFT JOIN public.team_workspaces tw ON tw.id = pp.team_id
ORDER BY c.cluster_key;
`;

const pairs = await q(EXTRACT);
console.log(`[manifest] ${pairs.length} candidate pairs extracted`);

// ── 2. Exclusion rules, enforced and asserted ───────────────────────────────
console.log('[manifest] enforcing exclusion rules...');

const problems = [];
const need = (cond, msg) => {
  if (!cond) problems.push(msg);
};

const multiMerge = await q(
  `SELECT nhl_source_id, players_source_id FROM public.person_identity_candidates
   WHERE recommended_action='merge' AND cluster_key IN
     (SELECT cluster_key FROM public.person_identity_clusters WHERE has_multi_record)`,
);
const multiKeys = new Set(multiMerge.map((r) => `${r.nhl_source_id}|${r.players_source_id}`));
const protectedRows = await q(
  `SELECT nhl_source_id, players_source_id FROM public.person_identity_candidates WHERE protected`,
);
const protKeys = new Set(protectedRows.map((r) => `${r.nhl_source_id}|${r.players_source_id}`));

for (const p of pairs) {
  const key = `${p.nhl_source_id}|${p.players_source_id}`;
  need(!multiKeys.has(key), `pair ${key} is inside a multi-record cluster`);
  need(!protKeys.has(key), `pair ${key} is a protected conflict`);
  need(p.confidence !== 'conflict', `pair ${key} has conflicting evidence`);
  need(
    p.birth_date_evidence === 'exact_match' || p.birth_date_evidence === 'placeholder_vs_real',
    `pair ${key} lacks birth-date corroboration`,
  );
}

// independence
const nhlIds = pairs.map((p) => p.nhl_source_id);
const plIds = pairs.map((p) => p.players_source_id);
const nhlPersons = pairs.map((p) => p.nhl_person_id);
const plPersons = pairs.map((p) => p.players_person_id);
need(new Set(nhlIds).size === nhlIds.length, 'duplicate nhl source id');
need(new Set(plIds).size === plIds.length, 'duplicate players source id');
need(new Set([...nhlIds, ...plIds]).size === nhlIds.length + plIds.length, 'source id shared across sides');
need(new Set(nhlPersons).size === nhlPersons.length, 'duplicate nhl person id');
need(new Set(plPersons).size === plPersons.length, 'duplicate players person id');
need(
  new Set([...nhlPersons, ...plPersons]).size === nhlPersons.length + plPersons.length,
  'person id shared across sides',
);
need(new Set(pairs.map((p) => p.cluster_key)).size === pairs.length, 'duplicate cluster key');

if (problems.length) {
  console.error('\n[manifest] EXCLUSION RULES FAILED:');
  for (const p of problems) console.error('  FAIL  ' + p);
  process.exit(1);
}
console.log('[manifest] all exclusion rules PASS');

// ── 3. Build the manifest rows ──────────────────────────────────────────────
const TIER_OF = (p) => {
  if (p.players_highlightly_id && String(p.players_highlightly_id) === p.nhl_source_id) return 'T1';
  if (p.birth_date_evidence === 'exact_match') return 'T2';
  return 'T3';
};

const RECOMMENDATION = {
  T1: 'recommend_merge',
  T2: 'recommend_merge',
  T3: 'manual_review_required',
};

const manifest = pairs.map((p, i) => {
  const tier = TIER_OF(p);
  const evidence = [];
  const conflicts = [];
  const missing = [];

  if (tier === 'T1') {
    evidence.push(
      `IDENTICAL UPSTREAM ID: players.highlightly_id (${p.players_highlightly_id}) equals ` +
        `nhl_players.id (${p.nhl_source_id}). Both rows describe the same upstream entity.`,
    );
  }
  if (p.birth_date_evidence === 'exact_match') {
    evidence.push(
      `EXACT BIRTH DATE MATCH: ${p.nhl_birth_live} on both sides. Two independent person-level fields agree.`,
    );
  } else {
    evidence.push(
      `BIRTH YEAR MATCH ONLY: nhl_players has ${p.nhl_birth_live}; the players row has the ` +
        `placeholder ${p.players_birth_raw} (month/day unknown). Only the year corroborates.`,
    );
    missing.push('players.birth_date is a YYYY-01-01 placeholder — month and day unknown');
  }
  if (p.nationality_evidence === 'match') {
    evidence.push(
      `NATIONALITY MATCH after normalization: ${p.nhl_nationality_live} ≡ ${p.players_nationality_live}.`,
    );
  } else if (p.nationality_evidence === 'unknown') {
    missing.push(`nationality not comparable — nhl=${p.nhl_nationality_live ?? 'NULL'} players=${p.players_nationality_live ?? 'NULL'}`);
  } else {
    conflicts.push(
      `NATIONALITY MISMATCH: ${p.nhl_nationality_live} vs ${p.players_nationality_live} (not normalized away)`,
    );
  }
  if (p.current_team_name && p.players_team_name &&
      p.current_team_name.toLowerCase() === p.players_team_name.toLowerCase()) {
    evidence.push(`SAME TEAM on both sides: ${p.current_team_name}.`);
  }
  if (p.players_position) evidence.push(`players row carries position "${p.players_position}"`);
  if (p.players_team_name) evidence.push(`players row carries team "${p.players_team_name}"`);

  if (tier === 'T3') {
    conflicts.push(
      'WEAK EVIDENCE: the only corroboration is the birth YEAR plus the name. Teams differ ' +
        `between the two records (nhl=${p.current_team_name ?? 'unknown'} vs players=${p.players_team_name ?? 'unknown'}), ` +
        'which is consistent with a career move but also with two different people.',
    );
  }

  // The survivor: the identity with MORE corroborating attributes.
  // Both sides carry a 'player' role, so the tiebreak is attribute richness.
  const nhlScore =
    (p.nhl_birth_live ? 2 : 0) + (p.nhl_nationality_live ? 1 : 0) + (p.nhl_position ? 1 : 0) +
    (p.current_team_name ? 1 : 0);
  const plScore =
    (p.players_birth_live ? 2 : 0) + (p.players_nationality_live ? 1 : 0) + (p.players_position ? 1 : 0) +
    (p.players_team_name ? 1 : 0) + (p.players_highlightly_id ? 2 : 0);

  const survivor = plScore > nhlScore ? 'players' : 'nhl';
  const survivorId = survivor === 'players' ? p.players_person_id : p.nhl_person_id;
  const mergedId = survivor === 'players' ? p.nhl_person_id : p.players_person_id;

  const explanation =
    tier === 'T1'
      ? `The two records carry the SAME upstream identifier (${p.players_highlightly_id}), so they are ` +
        `the same entity recorded in two tables. Name and birth year agree as well. This does not rely on ` +
        `the name at all — the upstream key is the evidence.`
      : tier === 'T2'
        ? `Both records carry the identical birth date ${p.nhl_birth_live}, and the normalized ` +
          `nationality agrees. A full birth date is a person-level field that names do not imply, so ` +
          `these are one human recorded twice.`
        : `The only corroboration is that the names match and the birth YEARs agree (${p.nhl_birth_live?.slice(0, 4)}); ` +
          `the players row's birth date is a YYYY-01-01 placeholder, and the teams differ. This MAY be one ` +
          `person whose career moved leagues, but the evidence is an ASSUMPTION rather than a confirmation. ` +
          `Human review required — do not merge on this basis alone.`;

  return {
    manifest_id: `2C-${String(i + 1).padStart(3, '0')}`,
    cluster_key: p.cluster_key,
    evidence_tier: tier,
    recommendation: RECOMMENDATION[tier],
    requires_human_review: tier === 'T3' ? 'true' : 'false',
    // source namespaces + ids
    nhl_source_namespace: 'nhl_players',
    nhl_source_id: p.nhl_source_id,
    nhl_person_id: p.nhl_person_id,
    nhl_name: p.nhl_name,
    players_source_namespace: 'rinkstop_players',
    players_source_id: p.players_source_id,
    players_person_id: p.players_person_id,
    players_name: p.players_name,
    // birth dates
    nhl_birth_raw: p.nhl_birth_live,
    nhl_birth_normalized: p.nhl_birth_normalized,
    nhl_birth_is_placeholder: p.nhl_birth_placeholder,
    players_birth_raw: p.players_birth_live,
    players_birth_normalized: p.players_birth_normalized,
    players_birth_is_placeholder: p.players_birth_placeholder,
    birth_date_evidence: p.birth_date_evidence,
    // nationality
    nhl_nationality_raw: p.nhl_nationality_live,
    players_nationality_raw: p.players_nationality_live,
    nationality_evidence: p.nationality_evidence,
    // upstream key
    players_highlightly_id: p.players_highlightly_id ?? '',
    upstream_id_matches: p.players_highlightly_id && String(p.players_highlightly_id) === p.nhl_source_id ? 'true' : 'false',
    // attributes
    nhl_team: p.current_team_name ?? '',
    nhl_team_abbr: p.current_team_abbreviation ?? '',
    nhl_position: p.nhl_position ?? '',
    nhl_jersey_number: p.nhl_jersey_number ?? '',
    nhl_birth_place: p.nhl_birth_place ?? '',
    nhl_is_active: p.nhl_is_active,
    players_team: p.players_team_name ?? '',
    players_team_slug: p.players_team_slug ?? '',
    players_position: p.players_position ?? '',
    players_jersey_number: p.players_jersey_number ?? '',
    players_claimable: p.players_claimable,
    players_user_id: p.players_user_id ?? '',
    // roles
    nhl_roles: p.nhl_roles ?? '',
    nhl_role_count: p.nhl_role_count,
    players_roles: p.players_roles ?? '',
    players_role_count: p.players_role_count,
    // aliases
    nhl_alias_count: p.nhl_alias_count,
    players_alias_count: p.players_alias_count,
    // proposal
    proposed_survivor_person_id: survivorId,
    proposed_merged_person_id: mergedId,
    proposed_survivor_side: survivor,
    survivor_attribute_score: survivor === 'players' ? plScore : nhlScore,
    merged_attribute_score: survivor === 'players' ? nhlScore : plScore,
    // narrative
    supporting_evidence: evidence.join(' '),
    conflicting_information: conflicts.join(' ') || 'none identified',
    missing_information: missing.join('; ') || 'none identified',
    explanation,
    // state
    decision: 'pending_human_review',
    decided_by: '',
    decided_at: '',
    applied_at: '',
  };
});

// ── 4. Write the manifest ───────────────────────────────────────────────────
mkdirSync(new URL('../docs/identity/', import.meta.url), { recursive: true });

const csvPath = new URL('../docs/identity/phase-2c-approval-manifest.csv', import.meta.url);
const jsonPath = new URL('../docs/identity/phase-2c-approval-manifest.json', import.meta.url);

function toCsv(rows) {
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

writeFileSync(csvPath, toCsv(manifest) + '\n');
writeFileSync(jsonPath, JSON.stringify(manifest, null, 1));

// ── 5. Summary ──────────────────────────────────────────────────────────────
const tierCount = {};
for (const m of manifest) tierCount[m.evidence_tier] = (tierCount[m.evidence_tier] ?? 0) + 1;

console.log('\n[manifest] ============================================');
console.log(`[manifest] candidate pairs          : ${manifest.length}`);
console.log(`[manifest] by evidence tier         : ${JSON.stringify(tierCount)}`);
console.log(`[manifest] recommend_merge           : ${manifest.filter((m) => m.recommendation === 'recommend_merge').length}`);
console.log(`[manifest] manual_review_required    : ${manifest.filter((m) => m.requires_human_review === 'true').length}`);
console.log(`[manifest] approved (by a human)     : ${manifest.filter((m) => m.decision === 'approved_to_merge').length}`);
console.log(`[manifest] written                  : docs/identity/phase-2c-approval-manifest.csv`);
console.log(`[manifest] written                  : docs/identity/phase-2c-approval-manifest.json`);
console.log('[manifest] ============================================');
console.log('[manifest] NOTE: nothing is approved. decision=pending_human_review for all rows.');
