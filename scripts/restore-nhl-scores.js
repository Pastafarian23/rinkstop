require('./load-secrets.cjs');
/**
 * Restore NHL games that the previous bad backfill corrupted.
 * "Corrupted" = game has status='scheduled' AND home_score/away_score are null
 *                AND the scheduled_at is in the past (game should have been played)
 *
 * Strategy: Re-fetch from Highlightly, find the matching real game by date+teams,
 * and update ONLY if Highlightly has a real finished state.
 *
 * For any game Highlightly doesn't have, leave as-is (we'll mark as "scheduled" still
 * but at least it's not pretending to be completed with bad data).
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SB_KEY);

const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const HL_KEY = process.env.HIGHLIGHTLY_API_KEY;
const HL_HOST = 'nhl-ncaah-api.p.rapidapi.com';
const HL_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const HL_NAME_TO_ABBREV = {
  'Anaheim Ducks':'ANA','Boston Bruins':'BOS','Buffalo Sabres':'BUF','Carolina Hurricanes':'CAR',
  'Columbus Blue Jackets':'CBJ','Calgary Flames':'CGY','Chicago Blackhawks':'CHI','Colorado Avalanche':'COL',
  'Dallas Stars':'DAL','Detroit Red Wings':'DET','Edmonton Oilers':'EDM','Florida Panthers':'FLA',
  'Los Angeles Kings':'LAK','Minnesota Wild':'MIN','Montreal Canadiens':'MTL','Nashville Predators':'NSH',
  'New Jersey Devils':'NJD','New York Islanders':'NYI','New York Rangers':'NYR','Ottawa Senators':'OTT',
  'Philadelphia Flyers':'PHI','Pittsburgh Penguins':'PIT','San Jose Sharks':'SJS','Seattle Kraken':'SEA',
  'St. Louis Blues':'STL','Tampa Bay Lightning':'TBL','Toronto Maple Leafs':'TOR','Utah Hockey Club':'UTA',
  'Vancouver Canucks':'VAN','Vegas Golden Knights':'VGK','Washington Capitals':'WSH','Winnipeg Jets':'WPG',
};
const HL_TO_TEAM_ID = {
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
  PHI: 'cf53124a-dbb5-4588-9cb2-2f6054918f99', PIT: '4b75202e-b11b-4574-8ae6-7447f962cb55',
  SJS: '16c9d078-ecc9-4e7c-8bf3-e1b6e9a6ae10', SEA: 'bf324536-424b-4a3d-b486-1347aa735aae',
  STL: '7efc04e6-6a75-4b1f-a0da-3966d6e7359c', TBL: '2f4c6364-2139-4e57-97ad-e01dc55418fa',
  TOR: 'bac49d62-fd43-48f5-8811-090ec8f4c76d', UTA: '3b80d876-f931-4740-a47f-0ed15c0e410f',
  VAN: 'dc828fd7-65ae-4c1d-92ea-66975eb38fce', VGK: 'cf05f5b0-6605-465f-86f3-a6f1710afc20',
  WPG: '88d85b2b-7a91-4679-b1d4-e45d73e3838f', WSH: '2df72ff0-5a54-4663-91eb-13bb2a2830aa',
};

function parseScore(current) {
  if (!current || typeof current !== 'string') return { home: null, away: null };
  const m = current.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (!m) return { home: null, away: null };
  return { home: parseInt(m[1], 10), away: parseInt(m[2], 10) };
}

function hlToStatus(m) {
  const desc = (m.state?.description || m.state?.report || '').toLowerCase();
  if (desc.includes('live') || desc.includes('in progress') || desc.includes('in_progress')) return 'in_progress';
  if (desc.includes('final') || desc.includes('finished') || desc.includes('off') || desc.includes('ended')) return 'completed';
  return 'scheduled';
}

async function hlFetch(date) {
  const r = await fetch(`https://nhl.highlightly.net/matches?date=${date}&league=NHL&limit=50`, {
    headers: { 'x-rapidapi-key': HL_KEY, 'x-rapidapi-host': HL_HOST, 'User-Agent': HL_UA }
  });
  if (!r.ok) return [];
  const j = await r.json();
  return j.data || [];
}

const dryRun = process.argv.includes('--dry-run');
const logFile = '/tmp/restore-nhl.log';
fs.writeFileSync(logFile, '');
function log(msg) { console.log(msg); fs.appendFileSync(logFile, msg + '\n'); }

async function main() {
  // Find all NHL games with status='scheduled' AND null scores AND scheduled_at < now
  // (i.e., games that should be completed but aren't)
  const { data: broken, error } = await supabase
    .from('fixtures')
    .select('id, scheduled_at, home_team_id, away_team_id')
    .eq('league_id', NHL_LEAGUE_ID)
    .eq('status', 'scheduled')
    .is('home_score', null)
    .is('away_score', null)
    .lt('scheduled_at', new Date().toISOString());
  if (error) throw error;
  log(`Found ${broken.length} games that should be completed but are scheduled with null scores`);

  // Group by date
  const byDate = {};
  for (const f of broken) {
    const d = f.scheduled_at.slice(0, 10);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(f);
  }

  let restored = 0, hlMissing = 0, errors = 0;
  for (const date of Object.keys(byDate).sort()) {
    const games = byDate[date];
    const matches = await hlFetch(date);
    if (matches.length === 0) {
      log(`  ${date}: ${games.length} broken games, Highlightly has 0 matches`);
      hlMissing += games.length;
      continue;
    }
    let dateRestored = 0;
    for (const f of games) {
      // Find matching Highlightly game by team_ids
      const match = matches.find(m => {
        const hAbbr = HL_NAME_TO_ABBREV[m.homeTeam?.displayName];
        const aAbbr = HL_NAME_TO_ABBREV[m.awayTeam?.displayName];
        const hId = HL_TO_TEAM_ID[hAbbr];
        const aId = HL_TO_TEAM_ID[aAbbr];
        return hId === f.home_team_id && aId === f.away_team_id;
      });
      if (!match) continue;
      const status = hlToStatus(match);
      if (status !== 'completed') continue; // Highlightly says it's not done yet
      const { home, away } = parseScore(match.state?.score?.current);
      if (home === null || away === null) continue; // No real score
      // Restore!
      if (!dryRun) {
        const { error } = await supabase.from('fixtures').update({
          status: 'completed',
          home_score: home,
          away_score: away,
          game_data: { ...match, nhl_game_id: match.id },
          updated_at: new Date().toISOString(),
        }).eq('id', f.id);
        if (error) { errors++; continue; }
      }
      dateRestored++;
    }
    log(`  ${date}: ${dateRestored} of ${games.length} restored (HL had ${matches.length} matches)`);
    restored += dateRestored;
    await new Promise(r => setTimeout(r, 200));
  }

  log(`\n--- Summary ---`);
  log(`Restored: ${restored}, Highlightly missing: ${hlMissing}, Errors: ${errors}`);
  if (dryRun) log('(DRY RUN)');
}

main().catch(err => { console.error(err); process.exit(1); });
