#!/usr/bin/env node
/**
 * Phase 8 — Sync Phase 2 fixtures (NHL.com-source) into nhl_matches.
 *
 * The public schedule page reads from nhl_matches, not fixtures.
 * Phase 2 ingested into fixtures but those rows don't appear on the site.
 * This script copies fixtures with NHL.com-format nhl_game_id into
 * nhl_matches in highlightly's schema (id, home_team_name, etc.)
 *
 * Run:
 *   node scripts/nhl-ingest/08-sync-nhl-matches.cjs --dry-run
 *   node scripts/nhl-ingest/08-sync-nhl-matches.cjs
 */

require('../load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dryRun = process.argv.includes('--dry-run');

// Map NHL.com team names → full names that match nhl_matches style
const TEAM_FULL = {
  ANA: 'Anaheim Ducks', ARI: 'Arizona Coyotes', BOS: 'Boston Bruins',
  BUF: 'Buffalo Sabres', CGY: 'Calgary Flames', CAR: 'Carolina Hurricanes',
  CHI: 'Chicago Blackhawks', COL: 'Colorado Avalanche', CBJ: 'Columbus Blue Jackets',
  DAL: 'Dallas Stars', DET: 'Detroit Red Wings', EDM: 'Edmonton Oilers',
  FLA: 'Florida Panthers', LAK: 'Los Angeles Kings', MIN: 'Minnesota Wild',
  MTL: 'Montreal Canadiens', NSH: 'Nashville Predators', NJD: 'New Jersey Devils',
  NYI: 'New York Islanders', NYR: 'New York Rangers', OTT: 'Ottawa Senators',
  PHI: 'Philadelphia Flyers', PIT: 'Pittsburgh Penguins', SJS: 'San Jose Sharks',
  SEA: 'Seattle Kraken', STL: 'St. Louis Blues', TBL: 'Tampa Bay Lightning',
  TOR: 'Toronto Maple Leafs', UTA: 'Utah Mammoth', VAN: 'Vancouver Canucks',
  VGK: 'Vegas Golden Knights', WPG: 'Winnipeg Jets', WSH: 'Washington Capitals',
};
const TRI_TO_NHL_ID = {
  ANA: 24, BOS: 7, BUF: 8, CGY: 20, CAR: 12, CHI: 16, COL: 21, CBJ: 29,
  DAL: 25, DET: 17, EDM: 22, FLA: 13, LAK: 26, MIN: 30, MTL: 6, NSH: 18,
  NJD: 1, NYI: 2, NYR: 3, OTT: 9, PHI: 4, PIT: 5, SJS: 28, SEA: 55,
  STL: 19, TBL: 14, TOR: 10, UTA: 68, VAN: 23, VGK: 54, WPG: 52, WSH: 15
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function mapStatus(nhlState) {
  if (!nhlState) return 'Scheduled';
  if (['OFF', 'FINAL', 'POST'].includes(nhlState)) return 'Finished';
  if (nhlState === 'LIVE') return 'In Progress';
  return 'Scheduled';
}

async function main() {
  console.log('[sync] Phase 8 — sync fixtures (NHL.com) → nhl_matches');
  console.log(`[sync] dry_run=${dryRun}`);

  // 1. Pull fixtures with NHL.com-format nhl_game_id (10-digit starting with 20)
  const allFixtures = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('fixtures')
      .select('id, scheduled_at, home_score, away_score, status, season, game_data')
      .eq('season', '2025-26')
      .not('game_data->>nhl_game_id', 'is', null)
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allFixtures.push(...data);
    offset += data.length;
    if (data.length < 1000) break;
  }
  // Filter to ONLY NHL.com-format IDs (10-digit starting with 20)
  const nhlComFixtures = allFixtures.filter(f => /^20[0-9]{8}$/.test(String(f.game_data?.nhl_game_id)));
  console.log(`[sync] Pulled ${allFixtures.length} fixtures; ${nhlComFixtures.length} have NHL.com-format nhl_game_id`);

  // Filter to ones with valid game_data. Accept BOTH formats:
  //   - NHL.com format: homeTeam.abbrev (full word)
  //   - Highlightly format (legacy): homeTeam.abbr (3-letter code)
  // Both must have valid team abbreviation that maps to TEAM_FULL.
  const validFixtures = nhlComFixtures.filter(f => {
    const homeTri = f.game_data?.homeTeam?.abbrev || f.game_data?.homeTeam?.abbr;
    const awayTri = f.game_data?.awayTeam?.abbrev || f.game_data?.awayTeam?.abbr;
    return homeTri && awayTri && TEAM_FULL[homeTri] && TEAM_FULL[awayTri];
  });
  console.log(`[sync] Valid fixtures with full team names: ${validFixtures.length}`);

  // 2. Build nhl_matches rows
  const nhlMatchesRows = validFixtures.map(f => {
    // Accept both formats: NHL.com (abbrev) and Highlightly legacy (abbr)
    const homeTri = f.game_data.homeTeam?.abbrev || f.game_data.homeTeam?.abbr;
    const awayTri = f.game_data.awayTeam?.abbrev || f.game_data.awayTeam?.abbr;
    const round = f.game_data.round;
    const roundPrefix = round === 'preseason' ? 'PR' :
                       round === 'postseason' ? 'PO' : '';
    // Use NHL.com game_id as a bigint — it's already 10-digit (2025020004) so fits in bigint
    const nhlGameIdNum = parseInt(f.game_data.nhl_game_id, 10);
    return {
      id: nhlGameIdNum,
      date: f.scheduled_at,
      status: f.status === 'completed' ? 'Finished' :
              f.status === 'in_progress' ? 'In Progress' : 'Scheduled',
      home_team_id: String(TRI_TO_NHL_ID[homeTri] || ''),
      home_team_name: TEAM_FULL[homeTri],
      home_team_logo: `https://assets.nhle.com/logos/nhl/svg/${homeTri}_light.svg`,
      home_score: f.home_score || 0,
      away_team_id: String(TRI_TO_NHL_ID[awayTri] || ''),
      away_team_name: TEAM_FULL[awayTri],
      away_team_logo: `https://assets.nhle.com/logos/nhl/svg/${awayTri}_light.svg`,
      away_score: f.away_score || 0,
      period: 0,
      clock: '0',
      league_name: 'NHL',
      venue: null,
      last_synced: new Date().toISOString(),
    };
  });

  // 3. Check if these IDs already exist in nhl_matches
  const ids = nhlMatchesRows.map(r => r.id);
  let existingIds = new Set();
  for (let i = 0; i < ids.length; i += 500) {
    const batch = ids.slice(i, i + 500);
    const { data } = await supabase
      .from('nhl_matches')
      .select('id')
      .in('id', batch);
    if (data) {
      for (const r of data) existingIds.add(Number(r.id));
    }
    await sleep(50);
  }
  const toInsert = nhlMatchesRows.filter(r => !existingIds.has(r.id));
  const toUpdate = nhlMatchesRows.filter(r => existingIds.has(r.id));
  console.log(`[sync] Already in nhl_matches (will UPDATE): ${toUpdate.length}`);
  console.log(`[sync] New (will INSERT): ${toInsert.length}`);

  if (dryRun) {
    console.log(`[sync] DRY RUN — would insert ${toInsert.length} + update ${toUpdate.length} rows in nhl_matches`);
    console.log(`[sync] Sample row:`);
    console.log(JSON.stringify(toInsert[0] || toUpdate[0], null, 2));
    process.exit(0);
  }

  // 4. Upsert (insert + update) in batches
  let upserted = 0, failed = 0;
  // Insert new
  if (toInsert.length > 0) {
    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100);
      const { error } = await supabase
        .from('nhl_matches')
        .insert(batch);
      if (error) {
        console.error(`  ❌ INSERT batch ${i / 100 + 1}: ${error.message.slice(0, 200)}`);
        failed += batch.length;
      } else {
        upserted += batch.length;
        if (i % 500 === 0) console.log(`  INSERT progress: ${upserted}/${toInsert.length}`);
      }
    }
  }
  // Update existing
  for (let i = 0; i < toUpdate.length; i += 100) {
    const batch = toUpdate.slice(i, i + 100);
    const { error } = await supabase
      .from('nhl_matches')
      .upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`  ❌ UPDATE batch ${i / 100 + 1}: ${error.message.slice(0, 200)}`);
      failed += batch.length;
    } else {
      upserted += batch.length;
      if (i % 500 === 0) console.log(`  UPDATE progress: ${upserted - toInsert.length}/${toUpdate.length}`);
    }
  }

  console.log(`\n[sync] DONE. upserted=${upserted} failed=${failed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
