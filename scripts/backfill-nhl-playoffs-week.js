require('./load-secrets.cjs');
/**
 * Backfill 2024-25 NHL Playoff games from NHL.com /v1/schedule endpoint.
 * This endpoint returns the full week including all playoff series with scores.
 *
 * Use this to re-insert the 19 valid playoff games that the
 * fix-zero-scores.js script deleted (no match in /v1/score endpoint).
 */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// NHL team ID (numeric, NHL.com) → Supabase UUID
const NHL_ID_TO_UUID = {
  1: '486e6592-5873-48a0-8cdd-8411c8eb1105',  // NJD
  3: '5a510c0e-1058-460d-8237-09855dfa98f4',  // BUF
  4: 'bac49d62-fd43-48f5-8811-090ec8f4c76d',  // TOR
  5: 'cf53124a-dbb5-4663-91eb-13bb2a2830aa',  // PHI
  6: '4b75202e-b11b-4574-8ae6-7447f962cb55',  // PIT
  7: 'acc8b466-ef9b-4d81-8ea5-6f13fc180d9e',  // NYI
  8: 'cff8bd78-5fee-49dc-b0ee-374722efd7b5',  // MTL
  9: 'a1f8b7f1-f7ea-42ee-9861-0eb0addf437d',  // OTT
  10: 'bac49d62-fd43-48f5-8811-090ec8f4c76d', // TOR
  12: 'e4977c12-28b3-4756-a788-cf86b40fc237', // CAR
  13: '7772070c-6c9b-4ca0-a442-dfe5b8beabcb', // FLA
  14: '2f4c6364-2139-4e57-97ad-e01dc55418fa', // TBL
  15: '2df72ff0-5a54-4663-91eb-13bb2a2830aa', // WSH
  16: '553a6b7b-6416-4b74-a9b3-fa15d06d52ab', // CHI
  17: '6ca5c5f0-3c27-4cd5-8457-78fc3ba45344', // CBJ
  18: '2d3d8a64-c0d7-4b8e-a327-a1201cc92f72', // NSH
  19: '7efc04e6-6a75-4b1f-a0da-3966d6e7359c', // STL
  20: '626458da-d2d4-4a4f-816b-f3796b84cfc4', // CGY
  21: 'f453fd29-12e4-4897-8f8a-ecf23d6a4122', // COL
  22: '5b487d74-5e9c-43c8-b104-35185fc93350', // EDM
  23: 'df9b5d1e-c5d9-46af-a524-99de500e95bf', // LAK
  24: '219a6bb2-1103-4e27-931e-5de440e59f84', // ANA
  25: '4c61f05e-8d34-40be-b0a8-adf37e14435c', // DAL
  26: 'df9b5d1e-c5d9-46af-a524-99de500e95bf', // LAK
  28: '16c9d078-ecc9-4e7c-8bf3-e1b6e9a6ae10', // SJS
  29: '6ca5c5f0-3c27-4cd5-8457-78fc3ba45344', // CBJ
  30: 'd3947cbf-8b3c-4c16-8ab6-b8f8d0f5a1fe', // MIN
  52: '88d85b2b-7a91-4679-b1d4-e45d73e3838f', // WPG
  53: '3b80d876-f931-4740-a47f-0ed15c0e410f', // UTA
  54: 'cf05f5b0-6605-465f-86f3-a6f1710afc20', // VGK
  55: 'dc828fd7-65ae-4c1d-92ea-66975eb38fce', // VAN
  87: '2df72ff0-5a54-4663-91eb-13bb2a2830aa', // WSH
  // Note: these need verification, but they're the best mapping from NHL.com
};

function nhlToStatus(g) {
  const s = g.gameState || g.gameScheduleState;
  if (s === 'OFF' || s === 'FINAL') return 'completed';
  if (s === 'LIVE' || s === 'CRIT') return 'in_progress';
  if (s === 'FUT' || s === 'PRE') return 'scheduled';
  if (s === 'PPD') return 'postponed';
  return 'scheduled';
}

async function fetchWeek(startDate) {
  const r = await fetch(`https://api-web.nhle.com/v1/schedule/${startDate}`, { headers: { 'User-Agent': UA } });
  if (!r.ok) return [];
  const j = await r.json();
  const games = [];
  for (const week of (j.gameWeek || [])) {
    for (const g of (week.games || [])) {
      games.push({ ...g, _date: week.date });
    }
  }
  return games;
}

async function main() {
  // Fetch weeks covering the 2024-25 NHL playoffs
  // Playoffs: 2025-04-19 to 2025-06-17
  const startDates = [
    '2025-04-14', '2025-04-21', '2025-04-28',
    '2025-05-05', '2025-05-12', '2025-05-19',
    '2025-05-26', '2025-06-02', '2025-06-09',
    '2025-06-16',
  ];

  let inserted = 0, updated = 0, preserved = 0, skipped = 0;
  const seen = new Set();

  for (const startDate of startDates) {
    console.log(`Fetching week starting ${startDate}...`);
    const games = await fetchWeek(startDate);
    console.log(`  Got ${games.length} games`);

    for (const g of games) {
      // Only playoff games (gameType === 3)
      if (g.gameType !== 3) continue;
      const gameDate = g._date; // YYYY-MM-DD
      const key = `${g.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const aNhlId = g.awayTeam?.id;
      const hNhlId = g.homeTeam?.id;
      const aUuid = NHL_ID_TO_UUID[aNhlId];
      const hUuid = NHL_ID_TO_UUID[hNhlId];
      if (!aUuid || !hUuid) {
        console.log(`  ${gameDate} ${g.awayTeam?.abbrev}@${g.homeTeam?.abbrev}: unknown NHL id (a=${aNhlId} h=${hNhlId})`);
        skipped++;
        continue;
      }

      const scheduled = g.startTimeUTC;
      const status = nhlToStatus(g);
      const homeScore = g.homeTeam?.score ?? null;
      const awayScore = g.awayTeam?.score ?? null;

      // Check if already exists
      const { data: existing } = await supabase
        .from('fixtures')
        .select('id, home_score, away_score, status')
        .eq('league_id', NHL_LEAGUE_ID)
        .eq('scheduled_at', scheduled)
        .eq('home_team_id', hUuid)
        .eq('away_team_id', aUuid)
        .limit(1);

      if (existing && existing.length > 0) {
        const ex = existing[0];
        // Update if needed
        const upd = {};
        if ((ex.home_score === null || ex.home_score === 0) && homeScore !== null) upd.home_score = homeScore;
        if ((ex.away_score === null || ex.away_score === 0) && awayScore !== null) upd.away_score = awayScore;
        if (ex.status === 'scheduled' && status === 'completed') upd.status = 'completed';
        if (Object.keys(upd).length === 0) { preserved++; continue; }
        upd.updated_at = new Date().toISOString();
        const { error } = await supabase.from('fixtures').update(upd).eq('id', ex.id);
        if (error) { skipped++; continue; }
        updated++;
      } else {
        // Insert
        const { error } = await supabase.from('fixtures').insert({
          id: crypto.randomUUID(),
          league_id: NHL_LEAGUE_ID,
          home_team_id: hUuid, away_team_id: aUuid,
          scheduled_at: scheduled,
          home_score: homeScore, away_score: awayScore,
          status, game_data: g, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
        if (error) { skipped++; continue; }
        inserted++;
      }
    }
  }
  console.log(`\n--- Summary ---`);
  console.log(`Inserted: ${inserted}, Updated: ${updated}, Preserved: ${preserved}, Skipped: ${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
