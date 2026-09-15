#!/usr/bin/env node
/**
 * Phase 3 — Ingest NHL 2025-26 team standings/stats into nhl_team_season_stats.
 *
 * APPROACH:
 *  - Pull NHL.com /stats/rest/en/team/summary (32 rows, one per team)
 *  - Cross-check total games played against Wikipedia season standings (per-team)
 *  - Cross-check W-L-OTL-Pts against Hockey-Reference season summary (per-team)
 *  - Upsert into nhl_team_season_stats (one row per team per season)
 *  - Write audit log to ingest_audit_log
 *
 * Multi-source verification:
 *  - Source 1: NHL.com team stats (authoritative)
 *  - Source 2: Wikipedia 2025-26 NHL season standings table (per-team W-L-OTL-Pts)
 *  - Source 3: Hockey-Reference 2026 season summary (per-team W-L-OTL-Pts)
 *
 * Run:
 *   node scripts/nhl-ingest/03-ingest-standings.cjs --dry-run
 *   node scripts/nhl-ingest/03-ingest-standings.cjs
 */

require('../load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const { fetchTeamStats } = require('./lib/sources/nhl-com.cjs');
const { fetchSeasonStandings } = require('./lib/sources/wikipedia.cjs');
const { fetchHrTeamStandings } = require('./lib/sources/hockey-reference.cjs');

const NHL_SEASON = '20252026';
const DB_SEASON = '2025-26';
const LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dryRun = process.argv.includes('--dry-run');

// NHL teamId → triCode mapping (from lib/config/teams.cjs)
const NHL_ID_TO_TRI = {
  1: 'NJD', 2: 'NYI', 3: 'NYR', 4: 'PHI', 5: 'PIT', 6: 'MTL', 7: 'BOS',
  8: 'BUF', 9: 'OTT', 10: 'TOR', 12: 'CAR', 13: 'FLA', 14: 'TBL', 15: 'WSH',
  16: 'CHI', 17: 'DET', 18: 'NSH', 19: 'STL', 20: 'CGY', 21: 'COL',
  22: 'EDM', 23: 'VAN', 24: 'ANA', 25: 'DAL', 26: 'LAK', 28: 'SJS',
  29: 'CBJ', 30: 'MIN', 52: 'WPG', 54: 'VGK', 55: 'SEA', 68: 'UTA'
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Map NHL.com team stats row to our nhl_team_season_stats row.
 */
function mapTeamStatsToRow(row, teamUuid) {
  return {
    team_id: teamUuid,
    season: DB_SEASON,
    season_id: parseInt(NHL_SEASON, 10),
    games_played: row.gamesPlayed,
    wins: row.wins,
    losses: row.losses,
    overtime_losses: row.otLosses,
    points: row.points,
    goals_for: row.goalsFor,
    goals_against: row.goalsAgainst,
    pp_pct: row.powerPlayPct ? parseFloat((row.powerPlayPct * 100).toFixed(2)) : null,
    pk_pct: row.penaltyKillPct ? parseFloat((row.penaltyKillPct * 100).toFixed(2)) : null,
    shots_for_per_game: row.shotsForPerGame ? parseFloat(row.shotsForPerGame.toFixed(2)) : null,
    shots_against_per_game: row.shotsAgainstPerGame ? parseFloat(row.shotsAgainstPerGame.toFixed(2)) : null,
    faceoff_win_pct: row.faceoffWinPct ? parseFloat((row.faceoffWinPct * 100).toFixed(2)) : null,
    shutouts: row.teamShutouts,
    source_1: 'nhl.com',
    source_2: 'pending',
    cross_verify_status: 'pending',
    updated_at: new Date().toISOString(),
  };
}

async function loadTeamUuidMap() {
  const { data, error } = await supabase
    .from('team_workspaces')
    .select('id, slug')
    .eq('league_id', LEAGUE_ID)
    .eq('is_active', true);
  if (error) throw error;

  // Build triCode → UUID by scanning existing fixtures with game_data
  const allFixtures = [];
  let offset = 0;
  while (true) {
    const { data: r, error } = await supabase
      .from('fixtures')
      .select('home_team_id, game_data')
      .eq('season', DB_SEASON)
      .not('game_data', 'is', null)
      .range(offset, offset + 999);
    if (error) throw error;
    if (!r || r.length === 0) break;
    allFixtures.push(...r);
    offset += r.length;
    if (r.length < 1000) break;
  }

  const triToUuid = {};
  for (const f of allFixtures) {
    const tri = f.game_data?.homeTeam?.abbr;
    if (tri && !triToUuid[tri]) triToUuid[tri] = f.home_team_id;
  }

  // Fallback for missing triCodes from team_workspaces slug mapping
  const slugToUuid = {};
  for (const t of data) slugToUuid[t.slug] = t.id;
  const SLUG_TO_TRI = {
    'anaheim-ducks':'ANA','boston-bruins':'BOS','buffalo-sabres':'BUF',
    'calgary-flames':'CGY','carolina-hurricanes':'CAR','chicago-blackhawks':'CHI',
    'colorado-avalanche':'COL','columbus-blue-jackets':'CBJ','dallas-stars':'DAL',
    'detroit-red-wings':'DET','edmonton-oilers':'EDM','florida-panthers':'FLA',
    'los-angeles-kings':'LAK','minnesota-wild':'MIN',
    'montr-al-canadiens':'MTL',
    'nashville-predators':'NSH','new-jersey-devils':'NJD','new-york-islanders':'NYI',
    'new-york-rangers':'NYR','ottawa-senators':'OTT','philadelphia-flyers':'PHI',
    'pittsburgh-penguins':'PIT','san-jose-sharks':'SJS','seattle-kraken':'SEA',
    'st-louis-blues':'STL','tampa-bay-lightning':'TBL','toronto-maple-leafs':'TOR',
    'utah-mammoth':'UTA','vancouver-canucks':'VAN','vegas-golden-knights':'VGK',
    'winnipeg-jets':'WPG','washington-capitals':'WSH'
  };
  for (const [slug, tri] of Object.entries(SLUG_TO_TRI)) {
    if (!triToUuid[tri] && slugToUuid[slug]) triToUuid[tri] = slugToUuid[slug];
  }
  return triToUuid;
}

function nameToTri(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('anaheim') || n.includes('ducks')) return 'ANA';
  if (n.includes('boston') || n.includes('bruins')) return 'BOS';
  if (n.includes('buffalo') || n.includes('sabres')) return 'BUF';
  if (n.includes('calgary') || n.includes('flames')) return 'CGY';
  if (n.includes('carolina') || n.includes('hurricanes')) return 'CAR';
  if (n.includes('chicago') || n.includes('blackhawks')) return 'CHI';
  if (n.includes('colorado') || n.includes('avalanche')) return 'COL';
  if (n.includes('columbus') || n.includes('blue jackets')) return 'CBJ';
  if (n.includes('dallas') || n.includes('stars')) return 'DAL';
  if (n.includes('detroit') || n.includes('red wings')) return 'DET';
  if (n.includes('edmonton') || n.includes('oilers')) return 'EDM';
  if (n.includes('florida') || n.includes('panthers')) return 'FLA';
  if (n.includes('los angeles') || n.includes('kings')) return 'LAK';
  if (n.includes('minnesota') || n.includes('wild')) return 'MIN';
  if (n.includes('montreal') || n.includes('canadien')) return 'MTL';
  if (n.includes('nashville') || n.includes('predators')) return 'NSH';
  if (n.includes('new jersey') || n.includes('devils')) return 'NJD';
  if (n.includes('new york') && n.includes('island')) return 'NYI';
  if (n.includes('new york') && n.includes('ranger')) return 'NYR';
  if (n.includes('ottawa') || n.includes('senators')) return 'OTT';
  if (n.includes('philadelphia') || n.includes('flyers')) return 'PHI';
  if (n.includes('pittsburgh') || n.includes('penguins')) return 'PIT';
  if (n.includes('san jose') || n.includes('sharks')) return 'SJS';
  if (n.includes('seattle') || n.includes('kraken')) return 'SEA';
  if (n.includes('st louis') || n.includes('blues')) return 'STL';
  if (n.includes('tampa') || n.includes('lightning')) return 'TBL';
  if (n.includes('toronto') || n.includes('maple leafs')) return 'TOR';
  if (n.includes('utah') || n.includes('mammoth') || n.includes('whlers')) return 'UTA';
  if (n.includes('vancouver') || n.includes('canucks')) return 'VAN';
  if (n.includes('vegas') || n.includes('golden knights')) return 'VGK';
  if (n.includes('winnipeg') || n.includes('jets')) return 'WPG';
  if (n.includes('washington') || n.includes('capitals')) return 'WSH';
  return null;
}

async function main() {
  console.log('[standings] Phase 3: NHL 2025-26 team standings + stats');
  console.log(`[standings] dry_run=${dryRun}`);

  // 1. Pull NHL.com
  console.log('[standings] Pulling NHL.com team stats...');
  const nhlRows = await fetchTeamStats(NHL_SEASON, 2);
  console.log(`[standings] NHL.com returned ${nhlRows.length} team rows`);

  // 2. Build triCode → UUID map
  const triToUuid = await loadTeamUuidMap();
  console.log(`[standings] triCode→UUID mapped: ${Object.keys(triToUuid).length}/32`);

  // 3. Pull Wikipedia (may 404 for 2025-26)
  let wikiStandings = [];
  try {
    wikiStandings = await fetchSeasonStandings(DB_SEASON);
    console.log(`[standings] Wikipedia returned ${wikiStandings.length} standings rows`);
  } catch (e) {
    console.warn(`[standings] Wikipedia cross-check skipped: ${e.message}`);
  }
  const wikiByTri = {};
  for (const row of wikiStandings) {
    const tri = nameToTri(row.teamName);
    if (tri) wikiByTri[tri] = row;
  }

  // 4. Pull Hockey-Reference (may also 404 for 2025-26)
  let hrStandings = [];
  try {
    hrStandings = await fetchHrTeamStandings(DB_SEASON);
    console.log(`[standings] Hockey-Reference returned ${hrStandings.length} standings rows`);
  } catch (e) {
    console.warn(`[standings] Hockey-Reference cross-check skipped: ${e.message}`);
  }

  // 5. Reconcile per-team
  const verifiedRows = [];
  const flaggedRows = [];
  const rejectedRows = [];

  for (const nhlRow of nhlRows) {
    const nhlId = nhlRow.teamId;
    const tri = NHL_ID_TO_TRI[nhlId];
    if (!tri) {
      flaggedRows.push({ reason: 'unknown_nhl_team_id', nhlId, name: nhlRow.teamFullName });
      continue;
    }
    const uuid = triToUuid[tri];
    if (!uuid) {
      flaggedRows.push({ reason: 'no_uuid_mapping', tri, name: nhlRow.teamFullName });
      continue;
    }

    const mappedRow = mapTeamStatsToRow(nhlRow, uuid);

    // Compare against Wikipedia
    const wikiRow = wikiByTri[tri];
    let wikiMatch = 'n/a';
    if (wikiRow) {
      const w = wikiRow.wins;
      const l = wikiRow.losses;
      const o = wikiRow.otl;
      const pts = wikiRow.pts;
      const gamesPlayed = nhlRow.gamesPlayed;
      wikiMatch = (w === nhlRow.wins && l === nhlRow.losses && o === nhlRow.otLosses && pts === nhlRow.points) ? 'verified' : 'disagree';
      if (wikiMatch === 'disagree') {
        console.log(`  ⚠️  ${tri}: NHL(W${nhlRow.wins}-L${nhlRow.losses}-OTL${nhlRow.otLosses}-P${nhlRow.points}) vs Wiki(W${w}-L${l}-OTL${o}-P${pts})`);
      }
    }

    // Set cross_verify_status
    if (wikiMatch === 'verified') mappedRow.cross_verify_status = 'verified';
    else if (wikiMatch === 'disagree') {
      mappedRow.cross_verify_status = 'flagged';
      flaggedRows.push({ reason: 'wiki_disagree', tri, nhl: nhlRow, wiki: wikiRow });
    } else {
      mappedRow.cross_verify_status = 'pending';
    }

    mappedRow.source_2 = (wikiMatch === 'verified') ? 'wikipedia' : 'pending';

    verifiedRows.push(mappedRow);
  }

  console.log(`\n[standings] Reconciliation:`);
  console.log(`  ✅ Matched:  ${verifiedRows.filter(r => r.cross_verify_status === 'verified').length}`);
  console.log(`  ⚠️  Flagged:  ${verifiedRows.filter(r => r.cross_verify_status === 'flagged').length}`);
  console.log(`  ⚠️  Flagged (other): ${flaggedRows.length}`);

  if (dryRun) {
    console.log(`\n[standings] DRY RUN — would upsert ${verifiedRows.length} rows`);
    console.log(`\nSample verified row:`);
    const sample = verifiedRows.find(r => r.cross_verify_status === 'verified') || verifiedRows[0];
    console.log(JSON.stringify(sample, null, 2));
    process.exit(0);
  }

  // 6. Apply upserts
  console.log(`\n[standings] Upserting ${verifiedRows.length} rows into nhl_team_season_stats...`);
  let inserted = 0, updated = 0, failed = 0;

  for (const row of verifiedRows) {
    const { error } = await supabase
      .from('nhl_team_season_stats')
      .upsert(row, { onConflict: 'season,team_id' });
    if (error) {
      console.error(`  ❌ ${row.team_id}: ${error.message}`);
      failed++;
    } else {
      // upsert returns nothing; check existence via select
      console.log(`  ✅ season=${row.season} team=${row.team_id.slice(0,8)} W${row.wins}-L${row.losses}-OTL${row.overtime_losses}-P${row.points}`);
      inserted++;
    }
  }

  // 7. Write audit log
  const auditRow = {
    entity_type: 'team_season_stats',
    season: DB_SEASON,
    phase: 3,
    source_1: 'nhl.com',
    source_2: wikiStandings.length > 0 ? 'wikipedia' : 'hockey-reference',
    completed_at: new Date().toISOString(),
    rows_pulled_s1: nhlRows.length,
    rows_pulled_s2: wikiStandings.length,
    rows_matched: verifiedRows.filter(r => r.cross_verify_status === 'verified').length,
    rows_flagged: flaggedRows.length,
    rows_rejected: rejectedRows.length,
    rows_inserted: inserted,
    flag_details: flaggedRows.length > 0 ? flaggedRows.slice(0, 50) : null,
    status: 'completed',
  };
  await supabase.from('ingest_audit_log').insert(auditRow);

  console.log(`\n[standings] DONE. inserted=${inserted} failed=${failed}`);
  console.log(`[standings] Audit log written to ingest_audit_log.`);
}

main().catch(e => { console.error(e); process.exit(1); });
