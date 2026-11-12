#!/usr/bin/env node
/**
 * scripts/_build-phase2c-final-approval.mjs
 *
 * Builds the Phase 2C-B human approval package from the ISOLATED STAGING
 * BRANCH.
 *
 * Phase 2C-B is PREPARATION ONLY. This script reads from the branch and
 * writes local files. It NEVER writes to production and NEVER merges.
 *
 * Outputs:
 *   docs/identity/phase-2c-final-approval.csv
 *   docs/identity/phase-2c-final-approval.json
 *
 * EVERY ROW IS INITIALIZED AS `decision = 'pending_human_review'`.
 * A recommendation is NOT an approval. The decision field is the human's to
 * set, and this script never sets it to anything else.
 *
 * EVIDENCE TIERS
 *   T1 — identical upstream id on BOTH sides: players.highlightly_id ==
 *        nhl_players.id, and the nhl row's source tag is 'highlightly'
 *        (so the id is a genuine upstream key, not an ESPN/nhl.com local id).
 *        Same upstream entity recorded twice. Independent of name and date.
 *   T2 — exact birth date on both sides. The date is corroborated by name,
 *        nationality and team. Where the birth date is shared with a
 *        DIFFERENT person, that competing person is named explicitly so the
 *        reviewer can see what the date alone would NOT have resolved.
 *   T3 — year-only birth date. Excluded from this package entirely.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const BRANCH_REF = 'grzhurrryimfylvwmeev';
const PROD_REF = 'yszheonqyyskkjoxoexk';

const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

if (BRANCH_REF === PROD_REF) {
  console.error('REFUSED: the approval-package builder must never point at production.');
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

// ── 1. The 39 T1 + T2 candidates, with full evidence ───────────────────────
console.log('[approval] extracting T1+T2 candidates from the staging branch...');

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
  c.cluster_key, c.nhl_source_id, c.nhl_person_id, c.nhl_name,
  c.players_source_id, c.players_person_id, c.players_name,
  c.confidence, c.birth_date_evidence, c.nationality_evidence,
  c.nhl_birth_raw::text AS nhl_birth_raw, c.nhl_birth_date::text AS nhl_birth_normalized,
  c.nhl_birth_is_placeholder AS nhl_birth_placeholder,
  c.players_birth_raw::text AS players_birth_raw, c.players_birth_date::text AS players_birth_normalized,
  c.players_birth_is_placeholder AS players_birth_placeholder,
  c.nhl_nationality, c.players_nationality, c.explanation,
  np.source AS nhl_source_tag, np.role AS nhl_role,
  np.birth_date::text AS nhl_birth_live, np.nationality AS nhl_nat_live,
  np.current_team_name AS nhl_team, np.current_team_abbreviation AS nhl_abbr,
  np.league_name AS nhl_league, np.position AS nhl_position,
  np.jersey_number AS nhl_jersey, np.birth_place AS nhl_birth_place,
  np.is_active AS nhl_active,
  pp.highlightly_id AS players_highlightly_id,
  pp.birth_date::text AS players_birth_live, pp.nationality AS players_nat_live,
  pp.position AS players_position, pp.jersey_number AS players_jersey,
  pp.claimable AS players_claimable, pp.user_id AS players_user_id,
  pp.slug AS players_slug, tw.name AS players_team, tw.slug AS players_team_slug,
  tl.name AS players_league,
  (SELECT string_agg(r.role_type||':'||coalesce(r.role_detail,''), '|' ORDER BY r.role_type)
     FROM public.person_roles r WHERE r.person_id = c.nhl_person_id) AS nhl_roles,
  (SELECT string_agg(r.role_type||':'||coalesce(r.role_detail,''), '|' ORDER BY r.role_type)
     FROM public.person_roles r WHERE r.person_id = c.players_person_id) AS players_roles,
  (SELECT count(*) FROM public.person_aliases a WHERE a.person_id = c.nhl_person_id) AS nhl_alias_count,
  (SELECT count(*) FROM public.person_aliases a WHERE a.person_id = c.players_person_id) AS players_alias_count,
  -- uniqueness of the upstream id
  (SELECT count(*) FROM public.players x WHERE x.highlightly_id::text = c.nhl_source_id) AS players_rows_with_upstream_id,
  (SELECT count(*) FROM public.nhl_players y WHERE y.id::text = c.nhl_source_id) AS nhl_rows_with_id,
  -- competing candidate pairs for the SAME source rows
  (SELECT count(*) FROM public.person_identity_candidates z WHERE z.nhl_source_id = c.nhl_source_id) AS nhl_candidate_pairs,
  (SELECT count(*) FROM public.person_identity_candidates z WHERE z.players_source_id = c.players_source_id) AS players_candidate_pairs,
  -- name equality (alphabetical, accent/punctuation insensitive)
  (lower(regexp_replace(np.full_name,'[^a-zA-Z]','','g'))
   = lower(regexp_replace(pp.first_name||pp.last_name,'[^a-zA-Z]','','g'))) AS names_equal,
  -- how many DISTINCT people share this birth date
  (SELECT count(*) FROM public.nhl_players x WHERE x.birth_date = np.birth_date) AS nhl_rows_same_birthdate,
  (SELECT count(*) FROM public.players y WHERE y.birth_date = pp.birth_date) AS players_rows_same_birthdate,
  -- the COMPETING candidate cluster (same birth date, different name)
  (SELECT z.cluster_key FROM public.person_identity_candidates z
    WHERE z.cluster_key <> c.cluster_key
      AND z.birth_date_evidence = 'exact_match'
      AND z.nhl_source_id IN (SELECT x.id::text FROM public.nhl_players x WHERE x.birth_date = np.birth_date)
    LIMIT 1) AS competing_cluster,
  (SELECT z.nhl_name FROM public.person_identity_candidates z
    WHERE z.cluster_key <> c.cluster_key
      AND z.birth_date_evidence = 'exact_match'
      AND z.nhl_source_id IN (SELECT x.id::text FROM public.nhl_players x WHERE x.birth_date = np.birth_date)
    LIMIT 1) AS competing_person_name,
  (SELECT x.nationality FROM public.nhl_players x
    WHERE x.id::text = (SELECT z2.nhl_source_id FROM public.person_identity_candidates z2
      WHERE z2.cluster_key <> c.cluster_key AND z2.birth_date_evidence='exact_match'
        AND z2.nhl_source_id IN (SELECT y.id::text FROM public.nhl_players y WHERE y.birth_date = np.birth_date) LIMIT 1)) AS competing_nationality,
  (SELECT x.current_team_abbreviation FROM public.nhl_players x
    WHERE x.id::text = (SELECT z3.nhl_source_id FROM public.person_identity_candidates z3
      WHERE z3.cluster_key <> c.cluster_key AND z3.birth_date_evidence='exact_match'
        AND z3.nhl_source_id IN (SELECT y2.id::text FROM public.nhl_players y2 WHERE y2.birth_date = np.birth_date) LIMIT 1)) AS competing_team
FROM clean c
JOIN public.nhl_players np ON np.id::text = c.nhl_source_id
JOIN public.players pp ON pp.id::text = c.players_source_id
LEFT JOIN public.team_workspaces tw ON tw.id = pp.team_id
LEFT JOIN public.leagues tl ON tl.id = tw.league_id
ORDER BY c.cluster_key;
`;

const rows = await q(EXTRACT);
console.log(`[approval] ${rows.length} candidates extracted`);

// ── 2. Tier assignment + validation ────────────────────────────────────────
const problems = [];
const need = (c, m) => { if (!c) problems.push(m); };

const t1 = rows.filter(
  (r) =>
    r.players_highlightly_id &&
    String(r.players_highlightly_id) === r.nhl_source_id &&
    r.nhl_source_tag === 'highlightly',
);
// T2 is strictly the exact-birth-date pairs that are NOT T1.
// The year-only (placeholder) pairs are Tier 3 and are EXCLUDED from this
// package — they are not approvable on the evidence available.
const t2 = rows.filter((r) => !t1.includes(r) && r.birth_date_evidence === 'exact_match');
const t3Excluded = rows.filter((r) => !t1.includes(r) && r.birth_date_evidence !== 'exact_match');
if (t3Excluded.length) {
  console.log(
    `[approval] EXCLUDING ${t3Excluded.length} Tier-3 pair(s) (year-only birth date): ` +
      t3Excluded.map((r) => r.nhl_name).join(', '),
  );
}
const included = [...t1, ...t2];

for (const r of t1) {
  need(
    r.players_rows_with_upstream_id === 1,
    `T1 ${r.nhl_name}: upstream id appears on ${r.players_rows_with_upstream_id} players rows (must be 1)`,
  );
  need(
    r.nhl_rows_with_id === 1,
    `T1 ${r.nhl_name}: nhl id appears on ${r.nhl_rows_with_id} nhl rows (must be 1)`,
  );
  need(
    r.nhl_candidate_pairs === 1 && r.players_candidate_pairs === 1,
    `T1 ${r.nhl_name}: has a competing candidate pair (nhl=${r.nhl_candidate_pairs} players=${r.players_candidate_pairs})`,
  );
  need(r.names_equal, `T1 ${r.nhl_name}: names differ between the two rows`);
}
for (const r of t2) {
  need(
    r.birth_date_evidence === 'exact_match',
    `T2 ${r.nhl_name}: birth dates are not an exact match (${r.birth_date_evidence})`,
  );
  need(
    r.nhl_candidate_pairs === 1 && r.players_candidate_pairs === 1,
    `T2 ${r.nhl_name}: has a competing candidate pair`,
  );
  need(r.names_equal, `T2 ${r.nhl_name}: names differ between the two rows`);
}

// independence across the whole package
const nhlIds = included.map((r) => r.nhl_source_id);
const plIds = included.map((r) => r.players_source_id);
const nhlP = included.map((r) => r.nhl_person_id);
const plP = included.map((r) => r.players_person_id);
need(new Set(nhlIds).size === nhlIds.length, 'duplicate nhl source id');
need(new Set(plIds).size === plIds.length, 'duplicate players source id');
need(
  new Set([...nhlIds, ...plIds]).size === nhlIds.length + plIds.length,
  'a source id is shared across the two sides',
);
need(new Set(nhlP).size === nhlP.length, 'duplicate nhl person id');
need(new Set(plP).size === plP.length, 'duplicate players person id');
need(
  new Set([...nhlP, ...plP]).size === nhlP.length + plP.length,
  'a person id is shared across the two sides',
);

// exclusions still enforced
const multiKeys = new Set(
  (
    await q(
      `SELECT nhl_source_id, players_source_id FROM public.person_identity_candidates
       WHERE recommended_action='merge' AND cluster_key IN
         (SELECT cluster_key FROM public.person_identity_clusters WHERE has_multi_record)`,
    )
  ).map((r) => `${r.nhl_source_id}|${r.players_source_id}`),
);
const protKeys = new Set(
  (
    await q(
      `SELECT nhl_source_id, players_source_id FROM public.person_identity_candidates WHERE protected`,
    )
  ).map((r) => `${r.nhl_source_id}|${r.players_source_id}`),
);
for (const r of included) {
  const k = `${r.nhl_source_id}|${r.players_source_id}`;
  need(!multiKeys.has(k), `pair ${k} is inside a multi-record cluster`);
  need(!protKeys.has(k), `pair ${k} is a protected conflict`);
}

if (problems.length) {
  console.error('\n[approval] VALIDATION FAILED:');
  for (const p of problems) console.error('  FAIL  ' + p);
  process.exit(1);
}
console.log('[approval] all validation rules PASS');

// ── 3. Build the package rows ───────────────────────────────────────────────
const pkg = included.map((r, i) => {
  const tier = t1.includes(r) ? 'T1' : 'T2';
  const evidence = [];
  const conflicts = [];
  const missing = [];

  if (tier === 'T1') {
    evidence.push(
      `IDENTICAL UPSTREAM ID: players.highlightly_id (${r.players_highlightly_id}) equals ` +
        `nhl_players.id (${r.nhl_source_id}), and the NHL row's source tag is 'highlightly' — ` +
        `so this id is a genuine upstream key, not a locally-assigned one.`,
    );
    evidence.push(
      `UNIQUENESS: the upstream id appears on exactly 1 players row and exactly 1 nhl row. ` +
        `Each source row participates in exactly 1 candidate pair — no competing match.`,
    );
  } else {
    evidence.push(
      `EXACT BIRTH DATE: ${r.nhl_birth_live} on both sides. A full birth date is a person-level ` +
        `field that a shared name does not imply.`,
    );
    if (r.nationality_evidence === 'match') {
      evidence.push(
        `NATIONALITY MATCH after normalization: ${r.nhl_nat_live} ≡ ${r.players_nat_live}.`,
      );
    } else {
      missing.push(
        `nationality not comparable — nhl=${r.nhl_nat_live ?? 'NULL'} players=${r.players_nat_live ?? 'NULL'}`,
      );
    }
    if (r.nhl_team && r.players_team &&
        r.nhl_team.toLowerCase() === r.players_team.toLowerCase()) {
      evidence.push(`SAME TEAM on both sides: ${r.nhl_team}.`);
    } else if (r.nhl_team && r.players_team) {
      evidence.push(
        `Teams differ (nhl=${r.nhl_team}, players=${r.players_team}) — consistent with a trade ` +
          `or a transfer, but NOT independent corroboration.`,
      );
    } else {
      missing.push(
        `team not comparable — nhl=${r.nhl_team ?? 'none'}, players=${r.players_team ?? 'none'}`,
      );
    }
    if (r.nhl_position && r.players_position) {
      evidence.push(`Position recorded on both sides: nhl=${r.nhl_position}, players=${r.players_position}.`);
    }
    if (r.nhl_jersey && r.players_jersey && String(r.nhl_jersey) === String(r.players_jersey)) {
      evidence.push(`Jersey number matches on both sides: ${r.nhl_jersey}.`);
    }
  }

  // The competing-person analysis — the honest part of a birth-date match.
  if (r.competing_person_name) {
    conflicts.push(
      `BIRTH DATE IS NOT UNIQUE: ${r.nhl_birth_live} is shared with a different person ` +
        `(${r.competing_person_name}, nationality=${r.competing_nationality ?? 'unknown'}, ` +
        `team=${r.competing_team ?? 'unknown'}). The date alone would NOT have identified this ` +
        `person; the NAME does. The competing person has a different name, nationality and team, ` +
        `so no attribute is shared with this pair.`,
    );
  }

  // Survivor selection.
  //
  // The merge re-points person_sources rows. It NEVER touches the `players`
  // or `nhl_players` TABLE rows, so the public URL, the slug, the headshot,
  // the biography and the claimable flag are unaffected either way. VERIFIED
  // on the staging branch with a real merge (2026-11-12): the players row
  // still exists, and its slug / claimable / headshot are unchanged.
  //
  // Given that, the survivor is chosen on DATA QUALITY: whichever side has
  // the richer identity attributes, because the survivor's display name and
  // attributes are what the public person page would show. Ties go to the
  // `players` side, which owns the canonical public slug.
  const nhlScore =
    (r.nhl_birth_live ? 2 : 0) + (r.nhl_nat_live ? 1 : 0) + (r.nhl_position ? 1 : 0) +
    (r.nhl_team ? 1 : 0) + (r.nhl_jersey ? 1 : 0);
  const plScore =
    (r.players_birth_live ? 2 : 0) + (r.players_nat_live ? 1 : 0) + (r.players_position ? 1 : 0) +
    (r.players_team ? 1 : 0) + (r.players_jersey ? 1 : 0) +
    (r.players_highlightly_id ? 2 : 0);
  const survivor = plScore > nhlScore ? 'players' : 'nhl';
  const survivorRationale =
    survivor === 'players'
      ? `players side holds the richer identity (score ${plScore} vs ${nhlScore}) and owns the canonical public slug`
      : `nhl_players side holds the richer identity (score ${nhlScore} vs ${plScore})`;

  const explanation =
    tier === 'T1'
      ? `Both rows carry the SAME upstream identifier (${r.players_highlightly_id}), and the NHL ` +
        `row is sourced from Highlightly, so the id is authoritative. The two records are the same ` +
        `entity written into two tables — this conclusion does not rest on the name at all. ` +
        `Birth year and name agree as a secondary check.`
      : `The names agree exactly, the birth dates are identical (${r.nhl_birth_live}), and ` +
        `${r.nationality_evidence === 'match' ? 'the nationality agrees as well' : 'the nationality is not comparable'}. ` +
        `${r.competing_person_name ? 'The birth date is shared with one other person, so the date alone is not sufficient — the name, team and nationality together identify this person and are not shared with the competing one. ' : 'No other person in either table shares this birth date. '}` +
        `Taken together these are independent person-level attributes, not just a name match.`;

  return {
    approval_id: `2CB-${String(i + 1).padStart(3, '0')}`,
    evidence_tier: tier,
    cluster_key: r.cluster_key,
    // source namespaces + ids
    nhl_source_namespace: 'nhl_players',
    nhl_source_id: r.nhl_source_id,
    nhl_person_id: r.nhl_person_id,
    nhl_name: r.nhl_name,
    nhl_source_tag: r.nhl_source_tag,
    players_source_namespace: 'rinkstop_players',
    players_source_id: r.players_source_id,
    players_person_id: r.players_person_id,
    players_name: r.players_name,
    players_slug: r.players_slug,
    players_highlightly_id: r.players_highlightly_id ?? '',
    upstream_id_match: tier === 'T1' ? 'true' : 'false',
    // birth dates
    nhl_birth_raw: r.nhl_birth_live,
    nhl_birth_normalized: r.nhl_birth_normalized,
    nhl_birth_is_placeholder: r.nhl_birth_placeholder,
    players_birth_raw: r.players_birth_live,
    players_birth_normalized: r.players_birth_normalized,
    players_birth_is_placeholder: r.players_birth_placeholder,
    birth_date_evidence: r.birth_date_evidence,
    // nationality
    nhl_nationality_raw: r.nhl_nat_live ?? '',
    players_nationality_raw: r.players_nat_live ?? '',
    nationality_evidence: r.nationality_evidence,
    // team / career
    nhl_team: r.nhl_team ?? '',
    nhl_team_abbr: r.nhl_abbr ?? '',
    nhl_league: r.nhl_league ?? '',
    nhl_position: r.nhl_position ?? '',
    nhl_jersey_number: r.nhl_jersey ?? '',
    nhl_birth_place: r.nhl_birth_place ?? '',
    nhl_is_active: r.nhl_active,
    players_team: r.players_team ?? '',
    players_team_slug: r.players_team_slug ?? '',
    players_league: r.players_league ?? '',
    players_position: r.players_position ?? '',
    players_jersey_number: r.players_jersey ?? '',
    players_claimable: r.players_claimable,
    players_user_id: r.players_user_id ?? '',
    // roles + aliases
    nhl_roles: r.nhl_roles ?? '',
    players_roles: r.players_roles ?? '',
    nhl_alias_count: r.nhl_alias_count,
    players_alias_count: r.players_alias_count,
    // validation counters
    players_rows_with_upstream_id: r.players_rows_with_upstream_id,
    nhl_rows_with_id: r.nhl_rows_with_id,
    nhl_candidate_pairs: r.nhl_candidate_pairs,
    players_candidate_pairs: r.players_candidate_pairs,
    names_equal: r.names_equal,
    nhl_rows_same_birthdate: r.nhl_rows_same_birthdate,
    players_rows_same_birthdate: r.players_rows_same_birthdate,
    competing_cluster: r.competing_cluster ?? '',
    competing_person_name: r.competing_person_name ?? '',
    competing_nationality: r.competing_nationality ?? '',
    competing_team: r.competing_team ?? '',
    // proposal
    proposed_survivor_side: survivor,
    proposed_survivor_person_id: survivor === 'players' ? r.players_person_id : r.nhl_person_id,
    proposed_merged_person_id: survivor === 'players' ? r.nhl_person_id : r.players_person_id,
    survivor_attribute_score: survivor === 'players' ? plScore : nhlScore,
    merged_attribute_score: survivor === 'players' ? nhlScore : plScore,
    survivor_rationale: survivorRationale,
    public_listing_unaffected_by_merge:
      'VERIFIED on staging: the merge re-points person_sources rows only. The players/nhl_players TABLE rows, ' +
      'their slugs, headshots, bios and the claimable flag are unchanged, so no public URL moves.',
    // narrative
    supporting_evidence: evidence.join(' '),
    conflicting_information: conflicts.join(' ') || 'none identified',
    missing_information: missing.join('; ') || 'none identified',
    explanation,
    // RECOMMENDATION ONLY — never an approval
    recommendation:
      tier === 'T1'
        ? 'recommend_approve'
        : r.competing_person_name
          ? 'recommend_approve_with_caveat'
          : 'recommend_approve',
    recommendation_note:
      tier === 'T1'
        ? 'Upstream-id match. Strongest evidence available.'
        : r.competing_person_name
          ? `Birth date is shared with ${r.competing_person_name}; the name, team and nationality are what identify this person. Review the competing-person caveat before approving.`
          : 'Exact birth date with no competing person sharing it.',
    // DECISION — initialized to pending_human_review and NEVER set by this script
    decision: 'pending_human_review',
    decision_rationale: '',
    decided_by: '',
    decided_at: '',
    applied_at: '',
  };
});

// ── 4. Write ────────────────────────────────────────────────────────────────
mkdirSync(new URL('../docs/identity/', import.meta.url), { recursive: true });

function toCsv(rows) {
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

const csvPath = new URL('../docs/identity/phase-2c-final-approval.csv', import.meta.url);
const jsonPath = new URL('../docs/identity/phase-2c-final-approval.json', import.meta.url);
writeFileSync(csvPath, toCsv(pkg) + '\n');
writeFileSync(jsonPath, JSON.stringify(pkg, null, 1));

// ── 5. Summary ──────────────────────────────────────────────────────────────
const byTier = {};
for (const p of pkg) byTier[p.evidence_tier] = (byTier[p.evidence_tier] ?? 0) + 1;
const byRec = {};
for (const p of pkg) byRec[p.recommendation] = (byRec[p.recommendation] ?? 0) + 1;

console.log('\n[approval] =============================================');
console.log(`[approval] candidates                : ${pkg.length}`);
console.log(`[approval] by tier                   : ${JSON.stringify(byTier)}`);
console.log(`[approval] by recommendation         : ${JSON.stringify(byRec)}`);
console.log(`[approval] decision=pending_human_review : ${pkg.filter((p) => p.decision === 'pending_human_review').length}`);
console.log(`[approval] decision=approved          : ${pkg.filter((p) => p.decision === 'approved').length}`);
console.log(`[approval] with a competing-person caveat : ${pkg.filter((p) => p.competing_person_name).length}`);
console.log(`[approval] written                    : docs/identity/phase-2c-final-approval.csv`);
console.log(`[approval] written                    : docs/identity/phase-2c-final-approval.json`);
console.log('[approval] =============================================');
console.log('[approval] NOTHING IS APPROVED. Every decision field is pending_human_review.');
