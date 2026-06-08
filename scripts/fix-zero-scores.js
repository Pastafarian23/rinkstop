/**
 * Fix NHL games that have home_score=0, away_score=0, status='scheduled'
 * but scheduled_at is in the past (clearly bogus data from earlier bad backfill).
 *
 * Re-fetches from NHL.com and updates with real scores + status=completed.
 */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://yszheonqyyskkjoxoexk.supabase.co', '***REMOVED***');
const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const ABBREV_TO_TEAM_ID = {
  ANA: '219a6bb2-1103-4e27-931e-5de440e59f84', BOS: 'ae6d0878-1ac2-4c13-afc8-890c6647b668',
  BUF: '5a510c0e-1058-460d-8237-09855dfa98f4', CAR: 'e4977c12-28b3-4756-a788-cf86b40fc237',
  CBJ: '6ca5c5f0-3c27-4cd5-8457-78fc3ba45344', CGY: '626458da-d2d4-4a4f-816b-f3796b84cfc4',
  CHI: '553a6b7b-6416-4b74-a9b3-fa15d06d52ab', COL: 'f453fd29-12e4-4897-8f8a-ecf23d6a4122',
  DAL: '4c61f05e-8d34-40be-b0a8-adf37e14435c', DET: 'f3fa0794-ee39-4991-af45-961cb3e8f404',
  EDM: '5b487d74-5e9c-43c8-b104-35185fc93350', FLA: '7772070c-6c9b-4ca0-a442-dfe5b8beabcb',
  LAK: 'df9b5d1e-c5d9-46af-a524-99de500e95bf', MIN: 'd3947cbf-8b3c-4c16-8ab6-b8f8d0f5a1fe',
  MTL: 'cff8bd78-5fee-49dc-b0ee-374722efd7b5', NJD: '486e6592-5873-48a0-8cdd-8411c8eb1105',
  NSH: '2d3d8a64-c0d7-4b8e-a327-a1201cc92f72', NYI: 'acc8b466-ef9b-4d81-8ea5-6f13fc180d9e',
  NYR: '2869d1cd-d8f4-4ffb-9726-30bdfdbc14d3', OTT: 'a1f8b7f1-f7ea-42ee-9861-0eb0addf437d',
  PHI: 'cf53124a-dbb5-4663-91eb-13bb2a2830aa', PIT: '4b75202e-b11b-4574-8ae6-7447f962cb55',
  SJS: '16c9d078-ecc9-4e7c-8bf3-e1b6e9a6ae10', SEA: 'bf324536-424b-4a3d-b486-1347aa735aae',
  STL: '7efc04e6-6a75-4b1f-a0da-3966d6e7359c', TBL: '2f4c6364-2139-4e57-97ad-e01dc55418fa',
  TOR: 'bac49d62-fd43-48f5-8811-090ec8f4c76d', UTA: '3b80d876-f931-4740-a47f-0ed15c0e410f',
  VAN: 'dc828fd7-65ae-4c1d-92ea-66975eb38fce', VGK: 'cf05f5b0-6605-465f-86f3-a6f1710afc20',
  WPG: '88d85b2b-7a91-4679-b1d4-e45d73e3838f', WSH: '2df72ff0-5a54-4663-91eb-13bb2a2830aa',
};
const TEAM_ID_TO_ABBREV = Object.fromEntries(Object.entries(ABBREV_TO_TEAM_ID).map(([k,v]) => [v, k]));

const dryRun = process.argv.includes('--dry-run');

function nhlToStatus(g) {
  const s = g.gameState || g.gameScheduleState;
  if (s === 'OFF' || s === 'FINAL') return 'completed';
  if (s === 'LIVE' || s === 'CRIT') return 'in_progress';
  if (s === 'FUT' || s === 'PRE') return 'scheduled';
  if (s === 'PPD') return 'postponed';
  return 'scheduled';
}

async function nhlFetch(date) {
  const r = await fetch(`https://api-web.nhle.com/v1/score/${date}`, { headers: { 'User-Agent': UA } });
  if (!r.ok) return [];
  return (await r.json()).games || [];
}

async function main() {
  console.log('Finding bogus NHL games (0-0 score, scheduled, past)...');
  const { data: bogus } = await supabase
    .from('fixtures')
    .select('id, scheduled_at, home_team_id, away_team_id, status, home_score, away_score')
    .eq('league_id', NHL_LEAGUE_ID)
    .eq('status', 'scheduled')
    .eq('home_score', 0)
    .eq('away_score', 0)
    .lt('scheduled_at', new Date().toISOString());

  console.log(`Found ${bogus.length} bogus games.`);

  // Group by date
  const byDate = new Map();
  for (const g of bogus) {
    const d = g.scheduled_at.slice(0, 10);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(g);
  }

  let fixed = 0, deleted = 0, errored = 0;
  for (const [date, games] of byDate) {
    const nhlGames = await nhlFetch(date);
    for (const bogus of games) {
      const aAbbr = TEAM_ID_TO_ABBREV[bogus.away_team_id];
      const hAbbr = TEAM_ID_TO_ABBREV[bogus.home_team_id];
      // Find matching NHL.com game
      const match = nhlGames.find(g => {
        const nhlH = g.homeTeam?.abbrev;
        const nhlA = g.awayTeam?.abbrev;
        return nhlH === hAbbr && nhlA === aAbbr;
      });
      if (!match) {
        console.log(`  ${date} ${aAbbr}@${hAbbr}: NO MATCH in NHL.com → delete`);
        if (!dryRun) {
          await supabase.from('fixtures').delete().eq('id', bogus.id);
          deleted++;
        }
        continue;
      }
      const homeScore = match.homeTeam?.score;
      const awayScore = match.awayTeam?.score;
      const status = nhlToStatus(match);
      console.log(`  ${date} ${aAbbr}@${hAbbr}: NHL.com says ${homeScore}-${awayScore} (${status})`);
      if (!dryRun) {
        const { error } = await supabase.from('fixtures').update({
          home_score: homeScore, away_score: awayScore, status,
          game_data: match, updated_at: new Date().toISOString(),
        }).eq('id', bogus.id);
        if (error) { console.log(`    ERROR: ${error.message}`); errored++; continue; }
        fixed++;
      }
    }
  }
  console.log(`\nFixed: ${fixed}, Deleted: ${deleted}, Errored: ${errored}${dryRun ? ' (DRY RUN)' : ''}`);
}

main().catch(e => { console.error(e); process.exit(1); });
