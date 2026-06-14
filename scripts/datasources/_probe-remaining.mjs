// Targeted probe for leagues I haven't fully tested
// Focus: AHL, ECHL, USHL, PWHL, MHL, VHL, KHL, SHL, Liiga, DEL, DEL2, Switzerland, KHL on hockey host
// Plus NCAAH on nhl host
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');
const env = {};
for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const KEY = env.HIGHLIGHTLY_API_KEY;

const HOSTS = {
  hockey: { base: 'https://hockey.highlightly.net', host: 'hockey-highlights-api.p.rapidapi.com' },
  nhl:    { base: 'https://nhl.highlightly.net',     host: 'nhl-ncaah-api.p.rapidapi.com' },
};

const TEST_DATES = ['2026-03-15', '2026-02-15', '2026-01-15', '2025-12-15', '2025-11-15', '2025-10-15'];

// Map of league name → (host, leagueId, real-name)
const TARGETS = [
  { name: 'AHL',         host: 'hockey', id: 50142 },
  { name: 'ECHL',        host: 'hockey', id: 50993 },
  { name: 'USHL',        host: 'hockey', id: 53546 },
  { name: 'PWHL',        host: 'hockey', id: 54397 },
  { name: 'MHL',         host: 'hockey', id: 32271 },
  { name: 'VHL',         host: 'hockey', id: 31420 },
  { name: 'KHL',         host: 'hockey', id: 30569 },
  { name: 'SHL',         host: 'hockey', id: 40781 },
  { name: 'Liiga',       host: 'hockey', id: 14400 },
  { name: 'DEL',         host: 'hockey', id: 16953 },
  { name: 'DEL2',        host: 'hockey', id: 17804 },
  { name: 'Swiss League', host: 'hockey', id: 45036 },
  { name: 'NCAAH',       host: 'nhl',    id: null },  // need to find
];

async function findFinalMatch(host, leagueId) {
  for (const date of TEST_DATES) {
    try {
      const r = await fetch(`${HOSTS[host].base}/matches?leagueId=${leagueId}&date=${date}&limit=20`, {
        headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': HOSTS[host].host }
      });
      const j = await r.json();
      const match = (j.data || []).find(m => m.state?.description?.toLowerCase().includes('finished') || m.state?.description?.toLowerCase().includes('ended'));
      if (match) return { match, date };
    } catch {}
  }
  return null;
}

async function getMatchDetail(host, matchId) {
  const r = await fetch(`${HOSTS[host].base}/matches/${matchId}`, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': HOSTS[host].host }
  });
  const arr = await r.json();
  return Array.isArray(arr) ? arr[0] : arr;
}

const results = {};

// Find NCAAH on nhl host by searching
{
  const r = await fetch(`https://nhl.highlightly.net/matches?date=2026-03-15&limit=50`, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': HOSTS.nhl.host }
  });
  const j = await r.json();
  const leagues = new Set((j.data || []).map(m => m.league));
  console.log('NHL host leagues on 2026-03-15:', [...leagues].join(','));
  // Find an NCAA match
  const ncaaMatch = (j.data || []).find(m => m.league?.toLowerCase().includes('ncaa'));
  if (ncaaMatch) {
    console.log('Found NCAA match:', ncaaMatch.id, ncaaMatch.homeTeam?.name, 'vs', ncaaMatch.awayTeam?.name);
    const detail = await getMatchDetail('nhl', ncaaMatch.id);
    results.NCAAH = {
      matchId: ncaaMatch.id,
      leagueName: ncaaMatch.league,
      hasEvents: !!detail?.events,
      hasOverallStatistics: !!detail?.overallStatistics,
      goals: detail?.events?.filter(e => e.isScoringPlay).length || 0,
      eventTypes: detail?.events ? [...new Set(detail.events.map(e => e.type))].sort() : null,
      sampleGoal: detail?.events?.find(e => e.isScoringPlay) || null,
    };
  }
}

for (const t of TARGETS) {
  if (t.id === null) continue;
  console.log(`Testing ${t.name} (id=${t.id}, host=${t.host})...`);
  const found = await findFinalMatch(t.host, t.id);
  if (!found) {
    results[t.name] = { status: 'no_finished_match' };
    continue;
  }
  const detail = await getMatchDetail(t.host, found.match.id);
  if (!detail) {
    results[t.name] = { status: 'detail_failed', matchId: found.match.id };
    continue;
  }
  results[t.name] = {
    status: 'ok',
    leagueId: t.id,
    matchId: found.match.id,
    matchDate: found.date,
    league: detail.league,
    hasEvents: !!detail.events,
    hasOverallStatistics: !!detail.overallStatistics,
    goals: detail.events?.filter(e => e.isScoringPlay).length || 0,
    eventTypes: detail.events ? [...new Set(detail.events.map(e => e.type))].sort() : null,
    sampleGoal: detail.events?.find(e => e.isScoringPlay) ? {
      period: detail.events.find(e => e.isScoringPlay).period,
      clock: detail.events.find(e => e.isScoringPlay).clock,
      team: detail.events.find(e => e.isScoringPlay).team?.abbreviation,
      description: detail.events.find(e => e.isScoringPlay).description,
    } : null,
    score: detail.state?.score,
  };
  await new Promise(r => setTimeout(r, 300));
}

writeFileSync('/tmp/highlightly-remaining.json', JSON.stringify(results, null, 2));
console.log('\n=== summary ===');
for (const [lg, info] of Object.entries(results)) {
  const flag = info.hasEvents && info.hasOverallStatistics ? '✅ RICH' :
               (info.hasEvents || info.hasOverallStatistics) ? '⚠️  PARTIAL' : '❌ SCORE-ONLY';
  console.log(`${lg.padEnd(15)} ${flag} | events=${info.hasEvents} stats=${info.hasOverallStatistics} goals=${info.goals} | ${info.status}`);
}
console.log('\nFull output: /tmp/highlightly-remaining.json');
