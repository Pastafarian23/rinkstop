/**
 * Backfill NULL home_team_id / away_team_id on NHL fixtures using Highlightly.
 *
 * Companion to backfill-null-team-ids.js — that one handled the 305
 * fixtures where game_data had the abbrev. This handles the 729 older
 * 2024-25 season completed games whose game_data is empty.
 *
 * Strategy: for each unique date with broken NHL fixtures,
 *  1. Fetch all NHL matches for that date from Highlightly
 *  2. Build a (scheduledAt, scoreString) -> {homeId, awayId} map
 *     using Supabase's teams table (matched on Highlightly team displayName)
 *  3. For each broken fixture, look up the key and patch the row
 *
 * Matching: game_time (HH:MM) + score (home-away) is enough to uniquely
 * identify a game within a date since the NHL rarely has duplicate scores
 * at the same exact minute.
 *
 * Run: node scripts/backfill-via-highlightly.js [--dry-run]
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SB_KEY = '***REMOVED***';
const supabase = createClient(SUPABASE_URL, SB_KEY);

const HIGHLIGHTLY_KEY = '***REMOVED***';
const HIGHLIGHTLY_HOST = 'nhl-ncaah-api.p.rapidapi.com';
const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';

const dryRun = process.argv.includes('--dry-run');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// NHL abbrev -> teams.id (Supabase UUID). Reuse from the previous backfill.
const ABBREV_TO_TEAM_ID = {
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

// Highlightly name -> abbrev mapping. The displayName from Highlightly
// (e.g. "Carolina Hurricanes") doesn't match our slug directly so we
// match on the team name. Hand-curated from Highlightly's NHL team list.
const HL_DISPLAY_NAME_TO_ABBREV = {
  'Anaheim Ducks': 'ANA',
  'Arizona Coyotes': 'UTA', // legacy name
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

async function fetchHighlightlyMatches(date) {
  const url = `https://nhl.highlightly.net/matches?date=${date}&league=NHL&limit=50`;
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-key': HIGHLIGHTLY_KEY,
      'x-rapidapi-host': HIGHLIGHTLY_HOST,
    },
  });
  if (!res.ok) {
    console.error(`  Highlightly ${date}: HTTP ${res.status}`);
    return null;
  }
  const json = await res.json();
  return Array.isArray(json) ? json : (json.data || []);
}

// Build a (HH:MM + score) -> {homeId, awayId} map for one date.
function buildMatchKey(hlMatch) {
  // Time key: HH:MM in UTC, derived from the Highlightly ISO date.
  const t = new Date(hlMatch.date);
  const hh = String(t.getUTCHours()).padStart(2, '0');
  const mm = String(t.getUTCMinutes()).padStart(2, '0');
  const timeKey = `${hh}:${mm}`;
  // Score key: home-away from state.score.current ("5 - 2" -> "5-2")
  const scoreStr = (hlMatch.state?.score?.current || '').replace(/\s/g, '');
  return { timeKey, scoreKey: scoreStr };
}

async function getBrokenNhlFixtures() {
  const all = [];
  const PAGE = 500;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('fixtures')
      .select('id, scheduled_at, status, home_score, away_score, game_data')
      .eq('league_id', NHL_LEAGUE_ID)
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

async function main() {
  console.log(dryRun ? '=== DRY RUN ===' : '=== LIVE UPDATE (via Highlightly) ===');

  const fixtures = await getBrokenNhlFixtures();
  console.log(`Broken NHL fixtures: ${fixtures.length}`);

  // Group by date (YYYY-MM-DD in UTC)
  const byDate = {};
  for (const f of fixtures) {
    const d = f.scheduled_at.slice(0, 10);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(f);
  }
  const dates = Object.keys(byDate).sort();
  console.log(`Unique dates: ${dates.length}`);

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalUnmatched = 0;
  const unmatched = [];
  let apiCalls = 0;

  for (const date of dates) {
    const dateFixtures = byDate[date];
    const hl = await fetchHighlightlyMatches(date);
    apiCalls++;
    if (!hl) { totalUnmatched += dateFixtures.length; continue; }

    // Build match map: key "HH:MM|home-away" -> {homeId, awayId}
    const matchMap = new Map();
    for (const m of hl) {
      const { timeKey, scoreKey } = buildMatchKey(m);
      const hAbbr = HL_DISPLAY_NAME_TO_ABBREV[m.homeTeam?.displayName];
      const aAbbr = HL_DISPLAY_NAME_TO_ABBREV[m.awayTeam?.displayName];
      if (!hAbbr || !aAbbr) {
        console.log(`  ${date} ${m.homeTeam?.displayName}/${m.awayTeam?.displayName} — unknown team name`);
        continue;
      }
      const hId = ABBREV_TO_TEAM_ID[hAbbr];
      const aId = ABBREV_TO_TEAM_ID[aAbbr];
      if (!hId || !aId) continue;
      // Index by time+score; if no score, just time.
      if (scoreKey && scoreKey.includes('-')) {
        matchMap.set(`${timeKey}|${scoreKey}`, { hId, aId, hAbbr, aAbbr });
      } else {
        matchMap.set(timeKey, { hId, aId, hAbbr, aAbbr });
      }
    }

    for (const f of dateFixtures) {
      const t = new Date(f.scheduled_at);
      const timeKey = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
      const scoreKey = (f.home_score != null && f.away_score != null)
        ? `${f.home_score}-${f.away_score}`
        : null;
      let hit = null;
      if (scoreKey) hit = matchMap.get(`${timeKey}|${scoreKey}`);
      if (!hit) hit = matchMap.get(timeKey);
      if (!hit) {
        totalUnmatched++;
        if (unmatched.length < 10) unmatched.push({ date, id: f.id, time: timeKey, score: scoreKey });
        continue;
      }
      if (!dryRun) {
        const { error: updErr } = await supabase
          .from('fixtures')
          .update({ home_team_id: hit.hId, away_team_id: hit.aId, updated_at: new Date().toISOString() })
          .eq('id', f.id);
        if (updErr) {
          console.error(`  FAIL ${f.id}: ${updErr.message}`);
          totalSkipped++;
          continue;
        }
      }
      totalUpdated++;
    }

    if (apiCalls % 25 === 0) {
      console.log(`  progress: ${apiCalls}/${dates.length} dates, ${totalUpdated} updated, ${totalUnmatched} unmatched`);
    }
    await sleep(120); // gentle on the Highlightly rate limit
  }

  console.log(`\n=== Summary ===`);
  console.log(`  API calls: ${apiCalls}`);
  console.log(`  Updated: ${totalUpdated}`);
  console.log(`  Unmatched: ${totalUnmatched}`);
  if (unmatched.length) {
    console.log(`  Unmatched examples:`);
    for (const u of unmatched) console.log(`    ${u.date} ${u.time} ${u.score || '(no score)'} ${u.id}`);
  }
  if (dryRun) console.log(`\n(dry run — no changes written)`);
}

main().catch(err => { console.error(err); process.exit(1); });
