#!/usr/bin/env node
// Phase 1 Dedupe Audit (Strategy B: prefer NHL.com id).
// For each duplicate group, identify the row to KEEP (7-digit id, NHL.com)
// and the row to DELETE (8-digit id, Highlightly).
// Outputs a plan to /tmp/dedupe-plan.json. Does NOT delete — exec step is separate.

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TEAM_ALIAS = {
  NJ: 'NJD', SJS: 'SJS', SJ: 'SJS', LA: 'LAK', TB: 'TBL',
  UTAH: 'UTA', UT: 'UTA', UTA: 'UTA', MON: 'MTL',
  CLB: 'CBJ', PHO: 'UTA', ARI: 'UTA', VEG: 'VGK', NAS: 'NSH',
};
const normalizeAbbrev = (a) => a ? (TEAM_ALIAS[a.toUpperCase().trim()] || a.toUpperCase().trim()) : null;
const normalizeName = (s) => (s || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();

// 7-digit ids (10000000-99999999) = NHL.com imports
// 8-digit ids (100000000+) = Highlightly imports
const isNHLComId = (id) => id >= 1000000 && id <= 9999999;

(async () => {
  let all = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const r = await supabase.from('nhl_players')
      .select('id,full_name,position_abbreviation,jersey_number,is_active,current_team_abbreviation,updated_at,birth_date,height,weight')
      .eq('league_name', 'NHL')
      .range(offset, offset + PAGE - 1);
    all = all.concat(r.data || []);
    if (!r.data || r.data.length < PAGE) break;
    offset += PAGE;
  }
  console.log(`Total NHL rows: ${all.length}`);

  const groups = new Map();
  for (const r of all) {
    const k = `${normalizeAbbrev(r.current_team_abbreviation) || 'NULL'}|${normalizeName(r.full_name)}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const dupGroups = [...groups.entries()].filter(([_, rs]) => rs.length > 1);
  console.log(`Duplicate groups: ${dupGroups.length}`);

  const plan = { keep: [], delete: [], ambiguous: [] };
  for (const [k, rows] of dupGroups) {
    if (rows.length !== 2) {
      plan.ambiguous.push({ key: k, rows });
      continue;
    }
    const [a, b] = rows;
    const aNHL = isNHLComId(a.id);
    const bNHL = isNHLComId(b.id);

    let keep, del;
    if (aNHL && !bNHL) { keep = a; del = b; }
    else if (!aNHL && bNHL) { keep = b; del = a; }
    else {
      // Both NHL.com or both Highlightly. Pick newer (updated_at).
      const newer = a.updated_at > b.updated_at ? a : b;
      const older = a.updated_at > b.updated_at ? b : a;
      keep = newer;
      del = older;
      plan.ambiguous.push({ key: k, reason: 'no NHL.com id found in pair; kept newer', keep: keep.id, delete: del.id });
    }
    plan.keep.push({ id: keep.id, name: keep.full_name, team: keep.current_team_abbreviation });
    plan.delete.push({ id: del.id, name: del.full_name, team: del.current_team_abbreviation });
  }

  console.log(`\n=== DEDUPE PLAN (Strategy B) ===`);
  console.log(`Keep:        ${plan.keep.length}`);
  console.log(`Delete:      ${plan.delete.length}`);
  console.log(`Ambig pairs: ${plan.ambiguous.length} (logged for review)`);

  if (plan.ambiguous.length > 0 && plan.ambiguous.length < 50) {
    console.log(`\nAmbig rows:`);
    for (const a of plan.ambiguous) {
      console.log(`  ${a.key}: ${a.reason || ''}`);
    }
  }

  fs.writeFileSync('/tmp/dedupe-plan.json', JSON.stringify(plan, null, 2));
  console.log('\nPlan saved to /tmp/dedupe-plan.json');
})();
