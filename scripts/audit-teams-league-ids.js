require('./load-secrets.cjs');
/**
 * AUDIT teams.league_id against Highlightly's source-of-truth.
 *
 * Recurring bug: teams were inserted with wrong league_id (e.g., Newfoundland
 * Regiment -> Asia League instead of QMJHL; Stonehill -> Friendly International
 * instead of NCAAH; AHL/KHL teams pointed at a UUID that was actually a different
 * league).
 *
 * For each tracked league, this script:
 *  1. Fetches ALL teams from Highlightly for that league's HL id
 *  2. Normalizes team names
 *  3. Finds matching teams in our DB (any league)
 *  4. If a matching team is assigned to a DIFFERENT league, reports (and optionally fixes)
 *
 * Run: node scripts/audit-teams-league-ids.js [--fix] [--league=whl]
 *   --fix: UPDATE teams.league_id to match Highlightly's truth
 *   --league=X: only audit one league
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SB_KEY);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const API_KEY = process.env.HIGHLIGHTLY_API_KEY;

// Tracked leagues with their actual HL ids + verified SB ids
// HL ids fetched from /leagues endpoint 2026-06-08
const TRACKED_LEAGUES = [
  { key: 'whl', sb: '46f49db9-e63d-407d-a99c-802f87576ab2', host: 'hockey-highlights-api.p.rapidapi.com', base: 'https://hockey.highlightly.net', hl: 4188, name: 'WHL' },
  { key: 'ohl', sb: 'd767362d-c13b-4c7a-8c8c-27ec33990882', host: 'hockey-highlights-api.p.rapidapi.com', base: 'https://hockey.highlightly.net', hl: 3337, name: 'OHL' },
  { key: 'qmjhl', sb: 'deb6816a-ccaf-48bf-9f5e-5a7c3387f922', host: 'hockey-highlights-api.p.rapidapi.com', base: 'https://hockey.highlightly.net', hl: 5039, name: 'QMJHL' },
  { key: 'ahl', sb: 'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611', host: 'hockey-highlights-api.p.rapidapi.com', base: 'https://hockey.highlightly.net', hl: 50142, name: 'AHL' },
  { key: 'khl', sb: 'a08f6dac-eb1f-48b6-a11b-56fbb5642752', host: 'hockey-highlights-api.p.rapidapi.com', base: 'https://hockey.highlightly.net', hl: 30569, name: 'KHL' },
  { key: 'nhl', sb: '2b5f2b9d-84b9-4edb-8373-a732b72f4e40', host: 'hockey-highlights-api.p.rapidapi.com', base: 'https://hockey.highlightly.net', hl: 49291, name: 'NHL' },
  // NCAAH + PWHL use different endpoints, skip for now
  { key: 'ncaah', sb: '498c6b36-a83a-4e81-9829-a2f9ca3a03f8', host: null, base: null, hl: null, name: 'NCAAH', skip: true, reason: 'NCAAH on nhl.highlightly.net uses different schema' },
  { key: 'pwhl', sb: '425ae95a-db13-499a-96f4-a859a437b15c', host: null, base: null, hl: null, name: 'PWHL', skip: true, reason: 'PWHL endpoint not found' },
];

const args = process.argv.slice(2);
const doFix = args.includes('--fix');
const leagueArg = args.find(a => a.startsWith('--league='))?.split('=')[1];
const logFile = args.find(a => a.startsWith('--log='))?.split('=')[1];
if (logFile) fs.writeFileSync(logFile, `=== Team League Audit started ${new Date().toISOString()} ===\nMode: ${doFix ? 'FIX' : 'DRY RUN'}\n\n`);
function log(m) { console.log(m); if (logFile) fs.appendFileSync(logFile, m + '\n'); }

function norm(s) {
  return (s || '').toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ').trim();
}

async function fetchHlTeams(league, season) {
  if (league.skip) {
    log(`  (skipped: ${league.reason})`);
    return [];
  }
  const url = `${league.base}/standings?leagueId=${league.hl}&season=${season}`;
  const r = await fetch(url, {
    headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': league.host, 'User-Agent': UA }
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`HL fetch failed: ${r.status} ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  // standings format: { groups: [{ standings: [{ team: { id, name }, ... }] }] }
  // Same teams appear in multiple division groups — dedupe by team id
  const byId = new Map();
  for (const g of (j.groups || [])) {
    for (const row of (g.standings || [])) {
      if (row.team?.name && !byId.has(row.team.id)) {
        byId.set(row.team.id, { hlId: row.team.id, name: row.team.name, norm: norm(row.team.name) });
      }
    }
  }
  return Array.from(byId.values());
}

async function auditLeague(league, season) {
  log(`\n=== ${league.name} (${league.sb}) - season ${season} ===`);
  if (league.skip) {
    log(`  (skipped: ${league.reason})`);
    return { checked: 0, mismatches: 0, missing: 0, skipped: true };
  }
  const hlTeams = await fetchHlTeams(league, season);
  log(`  Highlightly: ${hlTeams.length} teams`);
  
  // Get ALL teams in our DB (need to paginate, 1000 row default cap)
  const hlNorms = new Set(hlTeams.map(t => t.norm));
  let allOurTeams = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from('teams').select('id, name, slug, league_id').range(page * pageSize, (page + 1) * pageSize - 1);
    if (error || !data || data.length === 0) break;
    allOurTeams = allOurTeams.concat(data);
    if (data.length < pageSize) break;
    page++;
  }
  
  const { data: leagues } = await supabase.from('leagues').select('id, name, slug');
  const leagueMap = new Map(leagues.map(l => [l.id, l]));
  
  // Find any of our teams that match a HL name but have wrong league_id
  const mismatches = [];
  const correct = [];
  for (const t of allOurTeams || []) {
    if (!hlNorms.has(norm(t.name))) continue;
    if (t.league_id === league.sb) {
      correct.push(t);
    } else {
      const wrongLg = leagueMap.get(t.league_id);
      mismatches.push({ team: t, wrongLeagueName: wrongLg ? wrongLg.name : t.league_id });
    }
  }
  
  log(`  Correct assignments: ${correct.length}`);
  log(`  Wrong assignments (in our DB but not in ${league.name}): ${mismatches.length}`);
  
  if (mismatches.length > 0) {
    for (const m of mismatches) {
      log(`    ❌ ${m.team.name} (slug: ${m.team.slug}) → currently in [${m.wrongLeagueName}], should be in [${league.name}]`);
      if (doFix) {
        const { error } = await supabase.from('teams')
          .update({ league_id: league.sb, updated_at: new Date().toISOString() })
          .eq('id', m.team.id);
        if (error) log(`      FIX FAILED: ${error.message}`);
        else log(`      ✅ FIXED`);
      }
    }
  }
  
  // Also: find HL teams that DON'T have any match in our DB
  const ourNorms = new Set((allOurTeams || []).map(t => norm(t.name)));
  const missingInDb = hlTeams.filter(t => !ourNorms.has(t.norm));
  log(`  HL teams with no DB match: ${missingInDb.length}`);
  for (const t of missingInDb.slice(0, 5)) log(`    + ${t.name}`);
  if (missingInDb.length > 5) log(`    ... and ${missingInDb.length - 5} more`);
  
  return { mismatches: mismatches.length, missing: missingInDb.length };
}

async function main() {
  log('Team League Audit');
  log('Mode: ' + (doFix ? 'FIX (will update teams.league_id)' : 'DRY RUN'));
  log('');
  
  const leaguesToAudit = leagueArg
    ? TRACKED_LEAGUES.filter(l => l.key === leagueArg)
    : TRACKED_LEAGUES;
  
  // Use 2025 season (current season)
  const season = 2025;
  
  let totalMismatches = 0, totalMissing = 0;
  for (const lg of leaguesToAudit) {
    const r = await auditLeague(lg, season);
    totalMismatches += r.mismatches;
    totalMissing += r.missing;
  }
  
  log(`\n=== Total: ${totalMismatches} wrong assignments, ${totalMissing} teams missing from DB ===`);
}

main().catch(e => { console.error(e); process.exit(1); });
