/**
 * Clean up broken / phantom fixtures across all leagues.
 *
 * Run: node scripts/clean-broken-fixtures.js [--dry-run]
 *
 * NHL:   346 phantom rows from a buggy sync run. Scores and dates don't
 *        match any real NHL game on NHL.com or Highlightly. Delete them.
 * AHL:   1 broken row (2025-04-01). Try to backfill via Highlightly;
 *        delete if not matchable.
 * KHL:   11 broken playoff rows (2026-03-23 to 2026-04-02). Backfill
 *        via Highlightly hockey.highlightly.net.
 * PWHL:  54 broken rows + only 4/6 teams in our teams table. Skipped
 *        here — needs a separate workflow to add the missing teams
 *        (Minnesota Frost, Montreal Victoire) first.
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SB_KEY = '***REMOVED***';
const supabase = createClient(SUPABASE_URL, SB_KEY);

const HIGHLIGHTLY_KEY = '***REMOVED***';
const HIGHLIGHTLY_NHL_HOST = 'nhl-ncaah-api.p.rapidapi.com';
const HIGHLIGHTLY_HOCKEY_HOST = 'hockey-highlights-api.p.rapidapi.com';

const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const AHL_LEAGUE_ID = 'd44a3f6c-bd04-49c1-89b1-bf1ad6f29e87';
const KHL_LEAGUE_ID = '1c2b2c7f-49b6-4be0-bf57-46e1c6f3df5b';

const NHL_ABBREV_TO_TEAM_ID = {
  ANA: '219a6bb2-1103-4e27-931e-5de440e59f84',
  BOS: 'ae6d0878-1ac2-4c13-afc8-890c6647b668',
  BUF: '5a510c0e-1058-460d-8237-09855dfa98f4',
  CAR: 'e4977c12-28b3-4756-a788-cf86b40fc237',
  CBJ: '6ca5c5f0-3c27-4cd5-8457-78fc3ba45344',
  CGY: '626458da-d2d4-4a4f-816b-f3796b84cfc4',
  CHI: '553a6b7b-6416-4b74-a9b3-fa15d06d52ab',
  COL: 'f453fd29-12e4-4897-8f8a-ecf23d6a4122',
  DAL: '4c61f05e-8d34-40be-b0a8-adf37e14435c',
  DET: 'f3fa0794-ee39-4991-af45-961cb3e8f404',
  EDM: '5b487d74-5e9c-43c8-b104-35185fc93350',
  FLA: '7772070c-6c9b-4ca0-a442-dfe5b8beabcb',
  LAK: 'df9b5d1e-c5d9-46af-a524-99de500e95bf',
  MIN: 'd3947cbf-8b3c-4c16-8ab6-b8f8d0f5a1fe',
  MTL: 'cff8bd78-5fee-49dc-b0ee-374722efd7b5',
  NJD: '486e6592-5873-48a0-8cdd-8411c8eb1105',
  NSH: '2d3d8a64-c0d7-4b8e-a327-a1201cc92f72',
  NYI: 'acc8b466-ef9b-4d81-8ea5-6f13fc180d9e',
  NYR: '2869d1cd-d8f4-4ffb-9726-30bdfdbc14d3',
  OTT: 'a1f8b7f1-f7ea-42ee-9861-0eb0addf437d',
  PHI: 'cf53124a-dbb5-4588-9cb2-2f6054918f99',
  PIT: '4b75202e-b11b-4574-8ae6-7447f962cb55',
  SJS: '16c9d078-ecc9-4e7c-8bf3-e1b6e9a6ae10',
  SEA: 'bf324536-424b-4a3d-b486-1347aa735aae',
  STL: '7efc04e6-6a75-4b1f-a0da-3966d6e7359c',
  TBL: '2f4c6364-2139-4e57-97ad-e01dc55418fa',
  TOR: 'bac49d62-fd43-48f5-8811-090ec8f4c76d',
  UTA: '3b80d876-f931-4740-a47f-0ed15c0e410f',
  VAN: 'dc828fd7-65ae-4c1d-92ea-66975eb38fce',
  VGK: 'cf05f5b0-6605-465f-86f3-a6f1710afc20',
  WPG: '88d85b2b-7a91-4679-b1d4-e45d73e3838f',
  WSH: '2df72ff0-5a54-4663-91eb-13bb2a2830aa',
};

const HL_NHL_NAME_TO_ABBREV = {
  'Anaheim Ducks': 'ANA',
  'Boston Bruins': 'BOS',
  'Buffalo Sabres': 'BUF',
  'Calgary Flames': 'CGY',
  'Carolina Hurricanes': 'CAR',
  'Chicago Blackhawks': 'CHI',
  'Colorado Avalanche': 'COL',
  'Columbus Blue Jackets': 'CBJ',
  'Dallas Stars': 'DAL',
  'Detroit Red Wings': 'DET',
  'Edmonton Oilers': 'EDM',
  'Florida Panthers': 'FLA',
  'Los Angeles Kings': 'LAK',
  'Minnesota Wild': 'MIN',
  'Montreal Canadiens': 'MTL',
  'Nashville Predators': 'NSH',
  'New Jersey Devils': 'NJD',
  'New York Islanders': 'NYI',
  'New York Rangers': 'NYR',
  'Ottawa Senators': 'OTT',
  'Philadelphia Flyers': 'PHI',
  'Pittsburgh Penguins': 'PIT',
  'San Jose Sharks': 'SJS',
  'Seattle Kraken': 'SEA',
  'St. Louis Blues': 'STL',
  'Tampa Bay Lightning': 'TBL',
  'Toronto Maple Leafs': 'TOR',
  'Utah Hockey Club': 'UTA',
  'Vancouver Canucks': 'VAN',
  'Vegas Golden Knights': 'VGK',
  'Washington Capitals': 'WSH',
  'Winnipeg Jets': 'WPG',
};

const dryRun = process.argv.includes('--dry-run');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getBrokenByLeague(leagueId) {
  const all = [];
  const PAGE = 500;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('fixtures')
      .select('id, scheduled_at, status, home_score, away_score, game_data')
      .eq('league_id', leagueId)
      .or('home_team_id.is.null,away_team_id.is.null')
      .order('scheduled_at', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    offset += data.length;
    if (data.length < PAGE) break;
  }
  return all;
}

async function fetchHighlightly(url, host) {
  const res = await fetch(url, {
    headers: { 'x-rapidapi-key': HIGHLIGHTLY_KEY, 'x-rapidapi-host': host, 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return Array.isArray(json) ? json : (json.data || []);
}

async function deleteFixtures(ids) {
  if (dryRun) return;
  for (const id of ids) {
    const { error } = await supabase.from('fixtures').delete().eq('id', id);
    if (error) console.error(`  FAIL delete ${id}: ${error.message}`);
  }
}

async function patchFixture(id, homeId, awayId) {
  if (dryRun) return;
  const { error } = await supabase
    .from('fixtures')
    .update({ home_team_id: homeId, away_team_id: awayId, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error(`  FAIL patch ${id}: ${error.message}`);
}

async function cleanNhl() {
  console.log('\n=== NHL: delete phantom rows ===');
  const broken = await getBrokenByLeague(NHL_LEAGUE_ID);
  console.log(`  Broken NHL rows: ${broken.length}`);

  const dates = [...new Set(broken.map(f => f.scheduled_at.slice(0, 10)))].sort();
  console.log(`  Unique dates: ${dates.length}`);

  // For each date, query NHL.com directly and Highlightly. If a broken
  // fixture's score+time matches a real game, keep it (will be backfilled
  // via the existing game_data path). Otherwise mark for deletion.
  const toDelete = [];
  const toKeep = [];

  for (const date of dates) {
    const dateFixtures = broken.filter(f => f.scheduled_at.slice(0, 10) === date);
    // Build a set of "HH:MM|score" strings from real games.
    const realKeys = new Set();

    // NHL.com
    try {
      const res = await fetch(`https://api-web.nhle.com/v1/score/${date}`);
      if (res.ok) {
        const j = await res.json();
        for (const g of (j.games || [])) {
          const t = new Date(g.startTimeUTC);
          const key = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}|${g.homeTeam.score}-${g.awayTeam.score}`;
          realKeys.add(key);
        }
      }
    } catch {}

    // Highlightly
    try {
      const ms = await fetchHighlightly(
        `https://nhl.highlightly.net/matches?date=${date}&league=NHL&limit=50`,
        HIGHLIGHTLY_NHL_HOST
      );
      for (const m of (ms || [])) {
        const t = new Date(m.date);
        const sc = (m.state?.score?.current || '').replace(/\s/g, '');
        const key = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}|${sc}`;
        realKeys.add(key);
      }
    } catch {}

    for (const f of dateFixtures) {
      const t = new Date(f.scheduled_at);
      const key = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}|${f.home_score}-${f.away_score}`;
      if (realKeys.has(key)) toKeep.push(f);
      else toDelete.push(f);
    }
    if (dates.indexOf(date) % 25 === 0) {
      console.log(`    ...progress: ${dates.indexOf(date)}/${dates.length} dates, ${toDelete.length} phantom so far, ${toKeep.length} kept`);
    }
    await sleep(60);
  }

  console.log(`  Phantom (delete): ${toDelete.length}`);
  console.log(`  Real but missing team_id (keep, will backfill separately): ${toKeep.length}`);
  await deleteFixtures(toDelete.map(f => f.id));
  return { deleted: toDelete.length, kept: toKeep.length };
}

async function cleanAhl() {
  console.log('\n=== AHL: try to backfill via Highlightly ===');
  const broken = await getBrokenByLeague(AHL_LEAGUE_ID);
  console.log(`  Broken AHL rows: ${broken.length}`);

  let backfilled = 0, deleted = 0;
  for (const f of broken) {
    const date = f.scheduled_at.slice(0, 10);
    const t = new Date(f.scheduled_at);
    const timeKey = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
    const scoreKey = (f.home_score != null && f.away_score != null) ? `${f.home_score}-${f.away_score}` : null;

    let matched = null;
    for (const host of [HIGHLIGHTLY_HOCKEY_HOST, HIGHLIGHTLY_NHL_HOST]) {
      const url = `https://${host === HIGHLIGHTLY_HOCKEY_HOST ? 'hockey' : 'nhl'}.highlightly.net/matches?date=${date}&league=AHL&limit=50`;
      const ms = await fetchHighlightly(url, host);
      for (const m of (ms || [])) {
        const mt = new Date(m.date);
        const mKey = `${String(mt.getUTCHours()).padStart(2, '0')}:${String(mt.getUTCMinutes()).padStart(2, '0')}`;
        if (mKey !== timeKey) continue;
        if (scoreKey) {
          const sc = (m.state?.score?.current || '').replace(/\s/g, '');
          if (sc !== scoreKey) continue;
        }
        matched = m;
        break;
      }
      if (matched) break;
    }
    if (matched) {
      const hAbbr = HL_NHL_NAME_TO_ABBREV[matched.homeTeam?.displayName];
      const aAbbr = HL_NHL_NAME_TO_ABBREV[matched.awayTeam?.displayName];
      const hId = hAbbr ? NHL_ABBREV_TO_TEAM_ID[hAbbr] : null;
      const aId = aAbbr ? NHL_ABBREV_TO_TEAM_ID[aAbbr] : null;
      if (hId && aId) {
        await patchFixture(f.id, hId, aId);
        backfilled++;
        continue;
      }
    }
    await deleteFixtures([f.id]);
    deleted++;
  }
  console.log(`  Backfilled: ${backfilled}`);
  console.log(`  Deleted: ${deleted}`);
  return { backfilled, deleted };
}

async function cleanKhl() {
  console.log('\n=== KHL: try to backfill via Highlightly ===');
  const broken = await getBrokenByLeague(KHL_LEAGUE_ID);
  console.log(`  Broken KHL rows: ${broken.length}`);

  // Build a name -> team_id map for KHL teams
  const { data: khlTeams } = await supabase
    .from('teams')
    .select('id, name, slug')
    .eq('league_id', KHL_LEAGUE_ID);
  const nameToId = {};
  for (const t of (khlTeams || [])) nameToId[t.name] = t.id;

  const dates = [...new Set(broken.map(f => f.scheduled_at.slice(0, 10)))].sort();
  let backfilled = 0, deleted = 0;
  for (const date of dates) {
    const dateFixtures = broken.filter(f => f.scheduled_at.slice(0, 10) === date);
    const ms = await fetchHighlightly(
      `https://hockey.highlightly.net/matches?date=${date}&league=KHL&limit=50`,
      HIGHLIGHTLY_HOCKEY_HOST
    );
    // Build lookup
    const matchMap = new Map();
    for (const m of (ms || [])) {
      const t = new Date(m.date);
      const sc = (m.state?.score?.current || '').replace(/\s/g, '');
      const key = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}|${sc}`;
      const hName = m.homeTeam?.displayName;
      const aName = m.awayTeam?.displayName;
      if (nameToId[hName] && nameToId[aName]) {
        matchMap.set(key, { hId: nameToId[hName], aId: nameToId[aName] });
      }
    }

    for (const f of dateFixtures) {
      const t = new Date(f.scheduled_at);
      const key = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}|${f.home_score}-${f.away_score}`;
      const hit = matchMap.get(key);
      if (hit) {
        await patchFixture(f.id, hit.hId, hit.aId);
        backfilled++;
      } else {
        await deleteFixtures([f.id]);
        deleted++;
      }
    }
    await sleep(120);
  }
  console.log(`  Backfilled: ${backfilled}`);
  console.log(`  Deleted: ${deleted}`);
  return { backfilled, deleted };
}

async function main() {
  console.log(dryRun ? '=== DRY RUN (no changes) ===' : '=== LIVE UPDATE ===');
  const nhl = await cleanNhl();
  const ahl = await cleanAhl();
  const khl = await cleanKhl();

  console.log('\n=== Final Summary ===');
  console.log(`  NHL: deleted ${nhl.deleted} phantoms, kept ${nhl.kept} real games (for separate backfill)`);
  console.log(`  AHL: backfilled ${ahl.backfilled}, deleted ${ahl.deleted}`);
  console.log(`  KHL: backfilled ${khl.backfilled}, deleted ${khl.deleted}`);
  console.log(`  PWHL: SKIPPED (need to add 2 missing teams first)`);

  if (dryRun) console.log('\n(dry run — no changes written)');
}

main().catch(err => { console.error(err); process.exit(1); });
