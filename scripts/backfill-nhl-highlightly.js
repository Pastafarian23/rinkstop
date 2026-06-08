/**
 * Backfill missing NHL game data from Highlightly.
 *
 * CRITICAL: This script is FILL-GAPS-ONLY. It will NEVER overwrite:
 *   - home_score/away_score if they are non-null
 *   - status if it is 'completed'
 *   - team_ids if they are set
 *
 * It only writes to NULL fields and only updates 'scheduled' → 'completed' when
 * Highlightly has a real finished state with a real score.
 *
 * Run: node scripts/backfill-nhl-highlightly.js [--dry-run] [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SB_KEY = '***REMOVED***';
const supabase = createClient(SUPABASE_URL, SB_KEY);

const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const HL_KEY = '***REMOVED***';
const HL_HOST = 'nhl-ncaah-api.p.rapidapi.com';
const HL_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const NHL_ABBREV_TO_TEAM_ID = {
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

const dryRun = process.argv.includes('--dry-run');
const fromArg = process.argv.find(a => a.startsWith('--from='))?.split('=')[1] || '2025-01-01';
const toArg = process.argv.find(a => a.startsWith('--to='))?.split('=')[1] || '2026-06-30';
const logFile = process.argv.find(a => a.startsWith('--log='))?.split('=')[1];
if (logFile) fs.writeFileSync(logFile, `=== Backfill started ${new Date().toISOString()} ===\n`);
function log(msg) {
  console.log(msg);
  if (logFile) fs.appendFileSync(logFile, msg + '\n');
}

// Parse "8 - 4" → {home: 8, away: 4}
function parseScore(current) {
  if (!current || typeof current !== 'string') return { home: null, away: null };
  const m = current.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (!m) return { home: null, away: null };
  return { home: parseInt(m[1], 10), away: parseInt(m[2], 10) };
}

// Map Highlightly state → our status
function hlToStatus(m) {
  const desc = (m.state?.description || m.state?.report || '').toLowerCase();
  if (desc.includes('live') || desc.includes('in progress') || desc.includes('in_progress')) return 'in_progress';
  if (desc.includes('final') || desc.includes('finished') || desc.includes('off') || desc.includes('ended')) return 'completed';
  if (desc.includes('postponed') || desc.includes('ppd')) return 'postponed';
  if (desc.includes('cancel')) return 'cancelled';
  return 'scheduled';
}

async function hlFetchMatches(date) {
  const url = `https://nhl.highlightly.net/matches?date=${date}&league=NHL&limit=50`;
  const r = await fetch(url, { headers: { 'x-rapidapi-key': HL_KEY, 'x-rapidapi-host': HL_HOST, 'User-Agent': HL_UA } });
  if (!r.ok) {
    if (r.status === 429) {
      log(`  [429] sleeping 5s`);
      await new Promise(r => setTimeout(r, 5000));
      return hlFetchMatches(date);
    }
    return [];
  }
  const j = await r.json();
  return j.data || [];
}

function dateRange(start, end) {
  const days = [];
  const cur = new Date(start);
  const endDate = new Date(end);
  while (cur <= endDate) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

async function main() {
  const days = dateRange(fromArg, toArg);
  log(`\nFetching NHL from Highlightly (FILL GAPS ONLY): ${fromArg} to ${toArg} (${days.length} days)`);

  let totalHl = 0, updated = 0, preserved = 0, inserted = 0, skipped = 0, errors = 0;

  for (const date of days) {
    let matches;
    try { matches = await hlFetchMatches(date); }
    catch (e) { log(`  ${date}: ERROR ${e.message}`); errors++; continue; }
    if (matches.length === 0) continue;
    totalHl += matches.length;
    process.stdout.write(`  ${date}: ${matches.length} games  `);
    let dateUpd = 0, dateIns = 0, datePres = 0, dateSkip = 0;

    for (const m of matches) {
      const hAbbr = HL_NAME_TO_ABBREV[m.homeTeam?.displayName];
      const aAbbr = HL_NAME_TO_ABBREV[m.awayTeam?.displayName];
      const hId = NHL_ABBREV_TO_TEAM_ID[hAbbr];
      const aId = NHL_ABBREV_TO_TEAM_ID[aAbbr];
      if (!hId || !aId) { dateSkip++; continue; }

      const scheduled = new Date(m.date).toISOString();
      const status = hlToStatus(m);
      const { home, away } = parseScore(m.state?.score?.current);
      const gameData = { ...m, nhl_game_id: m.id };

      // Find existing fixture: by scheduled_at + team_ids
      const { data: existingList } = await supabase
        .from('fixtures')
        .select('id, home_team_id, away_team_id, home_score, away_score, status')
        .eq('league_id', NHL_LEAGUE_ID)
        .eq('scheduled_at', scheduled)
        .eq('home_team_id', hId)
        .eq('away_team_id', aId)
        .limit(1);

      const existing = existingList?.[0];

      if (existing) {
        // FILL GAPS ONLY: never overwrite non-null with null
        const updates = {};
        if (existing.home_score === null && home !== null) updates.home_score = home;
        if (existing.away_score === null && away !== null) updates.away_score = away;
        if (existing.status === 'scheduled' && status === 'completed' && home !== null) updates.status = 'completed';
        // Always update game_data with the latest from Highlightly
        updates.game_data = gameData;
        updates.updated_at = new Date().toISOString();

        if (Object.keys(updates).length <= 2) {
          // Only game_data + updated_at; no real change to scores/status
          datePres++;
        } else if (!dryRun) {
          const { error } = await supabase.from('fixtures').update(updates).eq('id', existing.id);
          if (error) { dateSkip++; continue; }
          dateUpd++;
        } else {
          dateUpd++;
        }
      } else {
        // No existing row — insert
        if (!dryRun) {
          const { error } = await supabase.from('fixtures').insert({
            id: crypto.randomUUID(),
            league_id: NHL_LEAGUE_ID,
            home_team_id: hId, away_team_id: aId,
            scheduled_at: scheduled,
            home_score: home, away_score: away,
            status, season: '20252026', game_data: gameData,
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          });
          if (error) { dateSkip++; continue; }
        }
        dateIns++;
      }
    }
    inserted += dateIns; updated += dateUpd; preserved += datePres; skipped += dateSkip;
    log(`(+${dateIns} new, ↻${dateUpd} upd, =${datePres} preserved, ✗${dateSkip} skip)`);
    await new Promise(r => setTimeout(r, 200));
  }

  log(`\n--- Summary ---`);
  log(`Total Highlightly games: ${totalHl}`);
  log(`Inserted: ${inserted}, Updated: ${updated}, Preserved (no change needed): ${preserved}, Skipped: ${skipped}, Errors: ${errors}`);
  if (dryRun) log('(DRY RUN)');
}

main().catch(err => { console.error(err); process.exit(1); });
