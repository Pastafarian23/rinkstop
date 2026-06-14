// Highlightly coverage probe — tests every league on both hosts
// Output: /tmp/highlightly-coverage.json
//
// Usage:  node scripts/datasources/_probe-all-leagues.mjs
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from repo root
const ROOT = resolve(__dirname, '..', '..');
const env = {};
for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const KEY = env.HIGHLIGHTLY_API_KEY;
if (!KEY) { console.error('HIGHLIGHTLY_API_KEY not in .env'); process.exit(1); }

const HOSTS = {
  hockey: { base: 'https://hockey.highlightly.net', host: 'hockey-highlights-api.p.rapidapi.com' },
  nhl:    { base: 'https://nhl.highlightly.net',     host: 'nhl-ncaah-api.p.rapidapi.com' },
};

const TEST_DATES = ['2026-03-15', '2026-02-15', '2026-01-15', '2025-12-15', '2025-11-15', '2025-10-15'];
const LEAGUES_TO_TEST = ['AHL', 'ECHL', 'NCAAH', 'USHL', 'PWHL', 'KHL', 'SHL', 'Liiga', 'NL', 'Memorial Cup', 'Czech Extraliga', 'Mestis'];

async function getLeagues(hostName) {
  const r = await fetch(HOSTS[hostName].base + '/leagues', {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': HOSTS[hostName].host }
  });
  const j = await r.json();
  return j.data || j;
}

async function findFinalMatch(hostName, leagueId) {
  for (const date of TEST_DATES) {
    try {
      const r = await fetch(`${HOSTS[hostName].base}/matches?leagueId=${leagueId}&date=${date}&limit=20`, {
        headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': HOSTS[hostName].host }
      });
      const j = await r.json();
      const match = (j.data || []).find(m => m.state?.description?.toLowerCase().includes('finished') || m.state?.description?.toLowerCase().includes('ended'));
      if (match) return { match, date };
    } catch {}
  }
  return null;
}

async function getMatchDetail(hostName, matchId) {
  const r = await fetch(`${HOSTS[hostName].base}/matches/${matchId}`, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': HOSTS[hostName].host }
  });
  const arr = await r.json();
  return Array.isArray(arr) ? arr[0] : arr;
}

const results = {};

// 1. Map all leagues on both hosts
for (const hostName of ['hockey', 'nhl']) {
  const leagues = await getLeagues(hostName);
  results[hostName] = { allLeagues: Array.isArray(leagues) ? leagues.length : '?', coverage: {} };
  if (!Array.isArray(leagues)) continue;

  for (const wanted of LEAGUES_TO_TEST) {
    const match = leagues.find(l => {
      const n = (l.name || '').toLowerCase();
      return n === wanted.toLowerCase() ||
             (wanted === 'AHL' && n === 'ahl') ||
             (wanted === 'ECHL' && n === 'echl') ||
             (wanted === 'NCAAH' && n.includes('ncaa')) ||
             (wanted === 'USHL' && n === 'ushl') ||
             (wanted === 'PWHL' && n === 'pwhl') ||
             (wanted === 'KHL' && n === 'khl') ||
             (wanted === 'SHL' && n === 'shl') ||
             (wanted === 'Liiga' && n === 'liiga') ||
             (wanted === 'NL' && n === 'national league') ||
             (wanted === 'Memorial Cup' && n.includes('memorial'));
    });
    if (!match) {
      results[hostName].coverage[wanted] = { status: 'not_in_leagues_list' };
      continue;
    }

    // Find a finished match
    const found = await findFinalMatch(hostName, match.id);
    if (!found) {
      results[hostName].coverage[wanted] = {
        status: 'no_finished_match',
        leagueId: match.id,
        leagueName: match.name,
        triedDates: TEST_DATES
      };
      continue;
    }

    // Get detail
    const detail = await getMatchDetail(hostName, found.match.id);
    if (!detail) {
      results[hostName].coverage[wanted] = { status: 'detail_call_failed', matchId: found.match.id };
      continue;
    }

    const fields = Object.keys(detail).sort();
    const goals = detail.events?.filter(e => e.isScoringPlay) || [];
    const sampleGoal = goals[0] || null;
    const sampleStat = detail.overallStatistics?.[0] || null;
    const scoreObj = detail.state?.score;

    results[hostName].coverage[wanted] = {
      status: 'ok',
      leagueId: match.id,
      leagueName: match.name,
      testMatchId: found.match.id,
      testMatchDate: found.date,
      score: scoreObj,
      hasEvents: !!detail.events,
      hasOverallStatistics: !!detail.overallStatistics,
      goalCount: goals.length,
      eventTypes: detail.events ? [...new Set(detail.events.map(e => e.type))].sort() : null,
      sampleGoal: sampleGoal ? {
        type: sampleGoal.type,
        period: sampleGoal.period,
        clock: sampleGoal.clock,
        team: sampleGoal.team?.abbreviation || sampleGoal.team?.name,
        description: sampleGoal.description,
      } : null,
      sampleStatNames: sampleStat ? Object.keys(sampleStat).filter(k => k !== 'team') : null,
    };

    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }
}

writeFileSync('/tmp/highlightly-coverage.json', JSON.stringify(results, null, 2));
console.log('\n=== summary ===');
for (const [host, data] of Object.entries(results)) {
  console.log(`\n${host} (${data.allLeagues} leagues total):`);
  for (const [league, info] of Object.entries(data.coverage)) {
    const flag = info.hasEvents && info.hasOverallStatistics ? '✅ RICH' :
                 (info.hasEvents || info.hasOverallStatistics) ? '⚠️  PARTIAL' : '❌ SCORE-ONLY';
    console.log(`  ${league.padEnd(15)} ${flag} | ${info.status} | events=${info.hasEvents} stats=${info.hasOverallStatistics} goals=${info.goalCount}`);
  }
}
console.log('\nFull output: /tmp/highlightly-coverage.json');
