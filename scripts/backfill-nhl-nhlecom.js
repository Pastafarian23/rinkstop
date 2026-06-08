/**
 * Backfill missing NHL games from NHL.com /v1/score/{date} endpoint.
 * This is the most authoritative source for NHL game results.
 *
 * Same fill-gaps-only logic as backfill-nhl-highlightly.js.
 *
 * Run: node scripts/backfill-nhl-nhlecom.js [--dry-run] [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient('https://yszheonqyyskkjoxoexk.supabase.co', '***REMOVED***');
const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SLUG_TO_ABBREV = {
  'anaheim-ducks':'ANA','boston-bruins':'BOS','buffalo-sabres':'BUF','carolina-hurricanes':'CAR',
  'columbus-blue-jackets':'CBJ','calgary-flames':'CGY','chicago-blackhawks':'CHI','colorado-avalanche':'COL',
  'dallas-stars':'DAL','detroit-red-wings':'DET','edmonton-oilers':'EDM','florida-panthers':'FLA',
  'los-angeles-kings':'LAK','minnesota-wild':'MIN','montreal-canadiens':'MTL','nashville-predators':'NSH',
  'new-jersey-devils':'NJD','new-york-islanders':'NYI','new-york-rangers':'NYR','ottawa-senators':'OTT',
  'philadelphia-flyers':'PHI','pittsburgh-penguins':'PIT','san-jose-sharks':'SJS','seattle-kraken':'SEA',
  'st-louis-blues':'STL','tampa-bay-lightning':'TBL','toronto-maple-leafs':'TOR','utah-hockey-club':'UTA',
  'vancouver-canucks':'VAN','vegas-golden-knights':'VGK','washington-capitals':'WSH','winnipeg-jets':'WPG',
};
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
  PHI: 'cf53124a-dbb5-4588-9cb2-2f6054918f99', PIT: '4b75202e-b11b-4574-8ae6-7447f962cb55',
  SJS: '16c9d078-ecc9-4e7c-8bf3-e1b6e9a6ae10', SEA: 'bf324536-424b-4a3d-b486-1347aa735aae',
  STL: '7efc04e6-6a75-4b1f-a0da-3966d6e7359c', TBL: '2f4c6364-2139-4e57-97ad-e01dc55418fa',
  TOR: 'bac49d62-fd43-48f5-8811-090ec8f4c76d', UTA: '3b80d876-f931-4740-a47f-0ed15c0e410f',
  VAN: 'dc828fd7-65ae-4c1d-92ea-66975eb38fce', VGK: 'cf05f5b0-6605-465f-86f3-a6f1710afc20',
  WPG: '88d85b2b-7a91-4679-b1d4-e45d73e3838f', WSH: '2df72ff0-5a54-4663-91eb-13bb2a2830aa',
};

const dryRun = process.argv.includes('--dry-run');
const fromArg = process.argv.find(a => a.startsWith('--from='))?.split('=')[1] || '2024-09-15';
const toArg = process.argv.find(a => a.startsWith('--to='))?.split('=')[1] || '2026-06-30';
const logFile = process.argv.find(a => a.startsWith('--log='))?.split('=')[1];
if (logFile) fs.writeFileSync(logFile, `=== NHL.com backfill started ${new Date().toISOString()} ===\n`);
function log(msg) { console.log(msg); if (logFile) fs.appendFileSync(logFile, msg + '\n'); }

async function nhlFetch(date) {
  const r = await fetch(`https://api-web.nhle.com/v1/score/${date}`, { headers: { 'User-Agent': UA } });
  if (!r.ok) return [];
  const j = await r.json();
  return j.games || [];
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

// Determine status from NHL.com game state
function nhlToStatus(g) {
  const s = g.gameState || g.gameScheduleState;
  if (s === 'OFF' || s === 'FINAL') return 'completed';
  if (s === 'LIVE' || s === 'CRIT') return 'in_progress';
  if (s === 'FUT' || s === 'PRE') return 'scheduled';
  if (s === 'PPD') return 'postponed';
  return 'scheduled';
}

async function main() {
  const days = dateRange(fromArg, toArg);
  log(`\nFetching NHL from NHL.com (FILL GAPS ONLY): ${fromArg} to ${toArg} (${days.length} days)`);

  let totalNhl = 0, updated = 0, inserted = 0, preserved = 0, skipped = 0;

  for (const date of days) {
    let games;
    try { games = await nhlFetch(date); }
    catch (e) { log(`  ${date}: ERROR ${e.message}`); continue; }
    if (games.length === 0) continue;
    totalNhl += games.length;
    process.stdout.write(`  ${date}: ${games.length} games  `);
    let dUpd = 0, dIns = 0, dPres = 0, dSkip = 0;

    for (const g of games) {
      const hAbbr = g.homeTeam?.abbrev;
      const aAbbr = g.awayTeam?.abbrev;
      const hId = ABBREV_TO_TEAM_ID[hAbbr];
      const aId = ABBREV_TO_TEAM_ID[aAbbr];
      if (!hId || !aId) { log(`    [no team map] ${aAbbr}@${hAbbr}`); dSkip++; continue; }

      const scheduled = g.startTimeUTC;
      const status = nhlToStatus(g);
      const homeScore = g.homeTeam?.score ?? null;
      const awayScore = g.awayTeam?.score ?? null;

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
        const updates = {};
        if (existing.home_team_id === null) updates.home_team_id = hId;
        if (existing.away_team_id === null) updates.away_team_id = aId;
        if (existing.home_score === null && homeScore !== null) updates.home_score = homeScore;
        if (existing.away_score === null && awayScore !== null) updates.away_score = awayScore;
        if (existing.status === 'scheduled' && status === 'completed' && homeScore !== null) updates.status = 'completed';
        if (Object.keys(updates).length === 0) { dPres++; }
        else if (!dryRun) {
          updates.updated_at = new Date().toISOString();
          const { error } = await supabase.from('fixtures').update(updates).eq('id', existing.id);
          if (error) { log(`    [update err] ${aAbbr}@${hAbbr}: ${error.message}`); dSkip++; continue; }
          dUpd++;
        } else dUpd++;
      } else {
        if (!dryRun) {
          const { error } = await supabase.from('fixtures').insert({
            id: crypto.randomUUID(),
            league_id: NHL_LEAGUE_ID,
            home_team_id: hId, away_team_id: aId,
            scheduled_at: scheduled,
            home_score: homeScore, away_score: awayScore,
            status, game_data: g, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          });
          if (error) { log(`    [insert err] ${aAbbr}@${hAbbr} ${scheduled}: ${error.message}`); dSkip++; continue; }
        }
        dIns++;
      }
    }
    updated += dUpd; inserted += dIns; preserved += dPres; skipped += dSkip;
    log(`(+${dIns} new, ↻${dUpd} upd, =${dPres} preserved, ✗${dSkip} skip)`);
    await new Promise(r => setTimeout(r, 100));
  }

  log(`\n--- Summary ---`);
  log(`Total NHL.com games: ${totalNhl}`);
  log(`Inserted: ${inserted}, Updated: ${updated}, Preserved: ${preserved}, Skipped: ${skipped}`);
  if (dryRun) log('(DRY RUN)');
}

main().catch(e => { console.error(e); process.exit(1); });
