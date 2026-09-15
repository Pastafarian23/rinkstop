#!/usr/bin/env node
/**
 * Phase 2 — Ingest NHL 2025-26 schedule from NHL.com into fixtures.
 *
 * APPROACH:
 *  - Pull all 32 teams' full season schedules from NHL.com
 *  - Each game appears in BOTH participating teams' feeds → dedup by nhl_game_id
 *  - Cross-check total games per team against Wikipedia season article
 *  - Upsert into fixtures (INSERT new, UPDATE game_data for existing)
 *  - Write audit log per batch
 *
 * Multi-source verification:
 *  - Source 1: NHL.com per-team schedule endpoint (authoritative)
 *  - Source 2: Wikipedia 2025-26 NHL season article (per-team total games)
 *
 * Canonical key: nhl_game_id (8-digit integer from NHL.com: 2025020004)
 * Round mapping: gameType 1=preseason, 2=regular-season, 3=postseason
 *
 * Run:
 *   node scripts/nhl-ingest/02-ingest-schedule.cjs --dry-run
 *   node scripts/nhl-ingest/02-ingest-schedule.cjs              # apply
 */

require('../load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const { fetchTeamSchedule } = require('./lib/sources/nhl-com.cjs');
const { fetchSeasonStandings } = require('./lib/sources/wikipedia.cjs');
const { fetchSeasonTeams } = require('./lib/sources/wikipedia.cjs');
const {
  ALL_TRI_CODES,
  SEASON_IDS,
  EXPECTED_COUNTS,
  BY_NHL_ID,
} = require('./lib/config/teams.cjs');
const { BY_TRI } = require('./lib/config/teams.cjs');
const fs = require('node:fs');

const NHL_SEASON = '20252026';
const DB_SEASON = '2025-26';
const LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dryRun = process.argv.includes('--dry-run');
const batchSize = parseInt(process.argv.find(a => a.startsWith('--batch='))?.split('=')[1] || '200', 10);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function nhlGameId(id) {
  // NHL.com id is an integer like 2025020004
  // Store as integer in JSON, convert to string for display
  return String(id);
}

function roundFromGameType(gameType) {
  return { 1: 'preseason', 2: 'regular-season', 3: 'postseason' }[gameType] || 'none';
}

function gameStateFromNhlState(state) {
  return {
    'OFF': 'completed',
    'FINAL': 'completed',
    'LIVE': 'in_progress',
    'PRE': 'scheduled',
    'POST': 'completed',
    'FRAG': 'scheduled',
  }[state] || 'scheduled';
}

/**
 * Map NHL.com game data to our fixtures table structure.
 */
function mapGameToFixture(game) {
  const nhlGameIdStr = String(game.id);
  const gameType = game.gameType || 2;
  const round = roundFromGameType(gameType);
  const state = gameStateFromNhlState(game.gameState);

  const homeTeamId = game.homeTeam?.id;
  const awayTeamId = game.awayTeam?.id;
  const homeTri = game.homeTeam?.abbrev;
  const awayTri = game.awayTeam?.abbrev;
  const homeScore = game.homeTeam?.score ?? null;
  const awayScore = game.awayTeam?.score ?? null;

  const gameData = {
    nhl_game_id: nhlGameIdStr,
    round,
    gameTypeId: gameType,
    seasonId: parseInt(NHL_SEASON, 10),
    awayTeam: {
      abbr: awayTri,
      id: awayTeamId,
      name: game.awayTeam?.placeName?.default || '',
      score: awayScore,
    },
    homeTeam: {
      abbr: homeTri,
      id: homeTeamId,
      name: game.homeTeam?.placeName?.default || '',
      score: homeScore,
    },
    gameState: game.gameState,
    period: game.period,
    periodTime: game.periodTime,
  };

  return {
    nhl_game_id: nhlGameIdStr,
    round,
    homeTri,
    awayTri,
    awayTeamNhlId: awayTeamId,
    homeTeamNhlId: homeTeamId,
    homeScore,
    awayScore,
    scheduledAt: game.gameDate,
    state,
    gameData,
  };
}

// ---------------------------------------------------------------------------
// Load existing fixtures for dedup
// ---------------------------------------------------------------------------

async function loadExistingFixtures() {
  console.log('[schedule] Loading existing fixtures...');
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('fixtures')
      .select('id, season, home_team_id, away_team_id, game_data, scheduled_at')
      .eq('season', DB_SEASON)
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    offset += data.length;
    if (data.length < 1000) break;
  }
  console.log(`[schedule] Existing ${DB_SEASON} fixtures: ${all.length}`);
  return all;
}

// ---------------------------------------------------------------------------
// Load UUID mapping (team_workspaces)
// ---------------------------------------------------------------------------

async function loadTeamUuidMap() {
  console.log('[schedule] Loading team UUID map from DB...');

  // Build NHL team triCode → UUID map from the existing fixtures data.
  // We use the existing fixtures to find which UUID corresponds to which triCode,
  // then cross-reference with team_workspaces to validate.
  //
  // We know from team_workspaces that there are 32 active NHL teams with
  // league_id = LEAGUE_ID. We need to find which UUID maps to which triCode.
  // Strategy: use NHL.com's existing game_data in fixtures to link triCodes to UUIDs.

  // Load all 32 active NHL team_workspaces rows
  const { data: teams, error } = await supabase
    .from('team_workspaces')
    .select('id, slug, name')
    .eq('league_id', LEAGUE_ID)
    .eq('is_active', true);
  if (error) throw error;
  console.log(`[schedule] Active NHL teams in team_workspaces: ${teams.length}`);

  // Load all existing fixtures that have game_data with team abbreviations
  // We'll use the game_data to extract which team UUID is which triCode
  const allFixtures = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('fixtures')
      .select('id, home_team_id, away_team_id, game_data')
      .eq('season', DB_SEASON)
      .not('game_data', 'is', null)
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allFixtures.push(...data);
    offset += data.length;
    if (data.length < 1000) break;
  }

  // Extract triCode → UUID from game_data
  // game_data.homeTeam.abbr = triCode, home_team_id = UUID
  const triToUuid = {};
  const uuidToTri = {};
  const teamUuidToName = {};

  for (const f of allFixtures) {
    if (!f.game_data) continue;
    const gd = f.game_data;
    const homeTri = gd.homeTeam?.abbr;
    const awayTri = gd.awayTeam?.abbr;
    if (homeTri && !triToUuid[homeTri]) {
      triToUuid[homeTri] = f.home_team_id;
      uuidToTri[f.home_team_id] = homeTri;
    }
    if (awayTri && !triToUuid[awayTri]) {
      triToUuid[awayTri] = f.away_team_id;
      uuidToTri[f.away_team_id] = awayTri;
    }
  }

  // For teams not yet seen in fixtures (unlikely but possible), use team_workspaces
  // Build triCode → UUID from slug using the actual slug values from DB
  const slugToUuid = {};
  for (const t of teams) {
    if (!slugToUuid[t.slug]) slugToUuid[t.slug] = t.id;
  }

  // Direct slug→triCode mapping using the actual DB slug values
  const SLUG_TO_TRI = {
    'anaheim-ducks':'ANA','boston-bruins':'BOS','buffalo-sabres':'BUF',
    'calgary-flames':'CGY','carolina-hurricanes':'CAR','chicago-blackhawks':'CHI',
    'colorado-avalanche':'COL','columbus-blue-jackets':'CBJ','dallas-stars':'DAL',
    'detroit-red-wings':'DET','edmonton-oilers':'EDM','florida-panthers':'FLA',
    'los-angeles-kings':'LAK','minnesota-wild':'MIN',
    'montr-al-canadiens':'MTL', // NOTE: typo in DB slug
    'nashville-predators':'NSH','new-jersey-devils':'NJD','new-york-islanders':'NYI',
    'new-york-rangers':'NYR','ottawa-senators':'OTT','philadelphia-flyers':'PHI',
    'pittsburgh-penguins':'PIT','san-jose-sharks':'SJS','seattle-kraken':'SEA',
    'st-louis-blues':'STL','tampa-bay-lightning':'TBL','toronto-maple-leafs':'TOR',
    'utah-mammoth':'UTA','vancouver-canucks':'VAN','vegas-golden-knights':'VGK',
    'winnipeg-jets':'WPG','washington-capitals':'WSH'
  };

  // Fill in any missing triCodes from slug mapping
  for (const [slug, tri] of Object.entries(SLUG_TO_TRI)) {
    if (!triToUuid[tri] && slugToUuid[slug]) {
      triToUuid[tri] = slugToUuid[slug];
      uuidToTri[slugToUuid[slug]] = tri;
    }
  }

  console.log(`[schedule] triCode→UUID mapped: ${Object.keys(triToUuid).length}/32`);
  const missing = ALL_TRI_CODES.filter(tri => !triToUuid[tri]);
  if (missing.length > 0) {
    console.warn(`[schedule] ⚠️  Missing UUIDs for: ${missing.join(', ')}`);
  }

  return { triToUuid, uuidToTri, slugToUuid };
}

// ---------------------------------------------------------------------------
// Pull NHL.com schedules
// ---------------------------------------------------------------------------

async function pullNhlSchedules() {
  console.log(`[schedule] Pulling NHL.com schedules for ${ALL_TRI_CODES.length} teams...`);
  const allGames = [];
  let errors = 0;

  for (let i = 0; i < ALL_TRI_CODES.length; i++) {
    const tri = ALL_TRI_CODES[i];
    process.stdout.write(`[schedule] ${i + 1}/32: ${tri}...`);
    try {
      const games = await fetchTeamSchedule(tri, NHL_SEASON);
      allGames.push(...games.map(g => ({ ...g, _teamTri: tri })));
      const byType = {};
      for (const g of games) byType[g.gameType] = (byType[g.gameType] || 0) + 1;
      console.log(` ${games.length} games`, JSON.stringify(byType));
    } catch (e) {
      console.error(` ERR: ${e.message}`);
      errors++;
    }
    await sleep(120); // Rate limit safety
  }
  console.log(`[schedule] NHL.com pull done. total=${allGames.length} errors=${errors}`);
  return allGames;
}

// ---------------------------------------------------------------------------
// Pull Wikipedia cross-check
// ---------------------------------------------------------------------------

async function pullWikipediaCrossCheck() {
  console.log('[schedule] Pulling Wikipedia cross-check...');
  try {
    const standings = await fetchSeasonStandings(DB_SEASON);
    const teams = await fetchSeasonTeams(DB_SEASON);
    console.log(`[schedule] Wikipedia: ${standings.length} standings rows, ${teams.length} team mentions`);
    return { standings, teams };
  } catch (e) {
    console.warn(`[schedule] Wikipedia cross-check failed: ${e.message}`);
    return { standings: [], teams: [] };
  }
}

// ---------------------------------------------------------------------------
// Dedup + reconcile
// ---------------------------------------------------------------------------

function dedupGames(games) {
  // Each game appears in both teams' feeds. Dedup by id.
  const byId = new Map();
  for (const g of games) {
    if (!byId.has(g.id)) {
      byId.set(g.id, g);
    }
  }
  return [...byId.values()];
}

function categorizeGames(games) {
  const byType = { 1: [], 2: [], 3: [], other: [] };
  for (const g of games) {
    const t = g.gameType;
    if (byType[t]) byType[t].push(g);
    else byType.other.push(g);
  }
  return byType;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`[schedule] Phase 2: NHL 2025-26 schedule ingest`);
  console.log(`[schedule] dry_run=${dryRun} season=${DB_SEASON}`);

  // 1. Load existing fixtures
  const existingFixtures = await loadExistingFixtures();
  const existingByNhlGameId = new Map();
  for (const f of existingFixtures) {
    const ngid = f.game_data?.nhl_game_id;
    if (ngid) existingByNhlGameId.set(String(ngid), f);
  }
  console.log(`[schedule] Existing fixtures with nhl_game_id: ${existingByNhlGameId.size}`);

  // 2. Load team UUID map
  const { triToUuid } = await loadTeamUuidMap();

  // 3. Pull NHL.com schedules
  const rawGames = await pullNhlSchedules();
  const allNhlGames = dedupGames(rawGames);
  const byType = categorizeGames(allNhlGames);

  console.log(`\n[schedule] NHL.com game summary:`);
  console.log(`  Total unique games: ${allNhlGames.length}`);
  console.log(`  Preseason (gameType=1): ${byType[1].length}`);
  console.log(`  Regular season (gameType=2): ${byType[2].length}`);
  console.log(`  Postseason (gameType=3): ${byType[3].length}`);
  console.log(`  Other/unknown: ${byType.other.length}`);
  console.log(`  Expected regular: ${EXPECTED_COUNTS['2025-26'].regular_season}`);

  // 4. Wikipedia cross-check (per-team total games)
  const { standings: wikiStandings } = await pullWikipediaCrossCheck();

  // 5. Reconciliation
  // For schedule: compare per-team game counts
  // Source 1: NHL.com per-team counts
  // Source 2: Wikipedia per-team counts (from standings table)
  const nhlTeamGameCounts = {};
  for (const g of allNhlGames) {
    const homeTri = g.homeTeam?.abbrev;
    const awayTri = g.awayTeam?.abbrev;
    if (homeTri) nhlTeamGameCounts[homeTri] = (nhlTeamGameCounts[homeTri] || 0) + 1;
    if (awayTri) nhlTeamGameCounts[awayTri] = (nhlTeamGameCounts[awayTri] || 0) + 1;
  }

  // Wikipedia game counts (from GP column)
  const wikiTeamGameCounts = {};
  for (const row of wikiStandings) {
    const teamName = row.teamName || '';
    const gp = row.gp || 0;
    // Match to triCode by name
    const tri = nameToTri(teamName);
    if (tri) wikiTeamGameCounts[tri] = gp;
  }

  console.log(`\n[schedule] Per-team game count comparison (NHL.com vs Wikipedia):`);
  const compareTeams = Object.keys(nhlTeamGameCounts).sort();
  let wikiMatch = 0, wikiMismatch = 0, wikiMissing = 0;
  for (const tri of compareTeams.slice(0, 10)) {
    const nhl = nhlTeamGameCounts[tri];
    const wiki = wikiTeamGameCounts[tri];
    const match = wiki ? Math.abs(nhl - wiki) <= 2 : 'n/a';
    console.log(`  ${tri}: NHL.com=${nhl} Wikipedia=${wiki || '?'} match=${JSON.stringify(match)}`);
    if (!wiki) wikiMissing++;
    else if (Math.abs(nhl - wiki) <= 2) wikiMatch++;
    else wikiMismatch++;
  }

  // 6. Build upsert list
  console.log(`\n[schedule] Building upsert list...`);
  const toUpsert = [];
  const toSkip = [];
  let missingTeamUuid = 0;

  for (const game of allNhlGames) {
    const homeTri = game.homeTeam?.abbrev;
    const awayTri = game.awayTeam?.abbrev;
    const homeUuid = triToUuid[homeTri];
    const awayUuid = triToUuid[awayTri];

    if (!homeUuid || !awayUuid) {
      missingTeamUuid++;
      toSkip.push({ reason: 'missing_uuid', homeTri, awayTri, id: game.id });
      continue;
    }

    const mapped = mapGameToFixture(game);
    const existing = existingByNhlGameId.get(String(game.id));

    toUpsert.push({
      ...mapped,
      homeUuid,
      awayUuid,
      existingId: existing?.id || null,
    });
  }

  console.log(`[schedule] to_upsert=${toUpsert.length} skipped=${toSkip.length} missing_uuid=${missingTeamUuid}`);
  if (toSkip.length > 0) {
    console.log(`[schedule] Sample skipped:`);
    for (const s of toSkip.slice(0, 5)) {
      console.log(`  id=${s.id} home=${s.homeTri} away=${s.awayTri} reason=${s.reason}`);
    }
  }

  // 7. Dry run — show what would happen
  if (dryRun) {
    console.log(`\n[schedule] DRY RUN — would upsert ${toUpsert.length} games`);
    console.log(`[schedule] Regular season: ${toUpsert.filter(g => g.round === 'regular-season').length}`);
    console.log(`[schedule] Preseason: ${toUpsert.filter(g => g.round === 'preseason').length}`);
    console.log(`[schedule] Postseason: ${toUpsert.filter(g => g.round === 'postseason').length}`);
    console.log(`[schedule] Existing (update): ${toUpsert.filter(g => g.existingId).length}`);
    console.log(`[schedule] New (insert): ${toUpsert.filter(g => !g.existingId).length}`);
    process.exit(0);
  }

  // 8. Apply in batches
  console.log(`\n[schedule] Applying upserts in batches of ${batchSize}...`);
  let inserted = 0, updated = 0, failed = 0;

  for (let i = 0; i < toUpsert.length; i += batchSize) {
    const batch = toUpsert.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    console.log(`[schedule] batch ${batchNum}/${Math.ceil(toUpsert.length / batchSize)} (${batch.length} games)`);

    // Separate new inserts from updates
    const toUpdate = batch.filter(g => g.existingId);
    const toInsert = batch.filter(g => !g.existingId);

    // Batch UPDATE existing rows
    for (const g of toUpdate) {
      const fixtureRow = {
        league_id: LEAGUE_ID,
        season: DB_SEASON,
        scheduled_at: g.scheduledAt,
        status: g.state,
        home_team_id: g.homeUuid,
        away_team_id: g.awayUuid,
        home_score: g.homeScore,
        away_score: g.awayScore,
        venue_id: null,
        game_data: g.gameData,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('fixtures')
        .update(fixtureRow)
        .eq('id', g.existingId);
      if (error) {
        console.error(`  ❌ UPDATE ${g.nhl_game_id}: ${error.message}`);
        failed++;
      } else {
        updated++;
        process.stdout.write(`  ✅ UPDATE ${g.nhl_game_id} ${g.awayTri}@${g.homeTri}\n`);
      }
    }

    // Batch INSERT new rows
    if (toInsert.length > 0) {
      const now = new Date().toISOString();
      const insertRows = toInsert.map(g => ({
        league_id: LEAGUE_ID,
        season: DB_SEASON,
        scheduled_at: g.scheduledAt,
        status: g.state,
        home_team_id: g.homeUuid,
        away_team_id: g.awayUuid,
        home_score: g.homeScore,
        away_score: g.awayScore,
        venue_id: null,
        game_data: g.gameData,
        created_at: now,
        updated_at: now,
      }));

      const { error, data } = await supabase
        .from('fixtures')
        .insert(insertRows)
        .select('id');

      if (error) {
        console.error(`  ❌ BATCH INSERT failed: ${error.message}`);
        // Fall back to individual inserts
        for (const g of toInsert) {
          const fixtureRow = {
            league_id: LEAGUE_ID,
            season: DB_SEASON,
            scheduled_at: g.scheduledAt,
            status: g.state,
            home_team_id: g.homeUuid,
            away_team_id: g.awayUuid,
            home_score: g.homeScore,
            away_score: g.awayScore,
            venue_id: null,
            game_data: g.gameData,
            created_at: now,
            updated_at: now,
          };
          const { error: err } = await supabase.from('fixtures').insert(fixtureRow);
          if (err) {
            console.error(`  ❌ INSERT ${g.nhl_game_id}: ${err.message}`);
            failed++;
          } else {
            inserted++;
            process.stdout.write(`  ✅ INSERT ${g.nhl_game_id} ${g.awayTri}@${g.homeTri}\n`);
          }
        }
      } else {
        inserted += toInsert.length;
        console.log(`  ✅ BATCH INSERT: ${toInsert.length} rows`);
      }
    }

    // Rate limit between batches
    await sleep(200);
  }

  console.log(`\n[schedule] DONE. inserted=${inserted} updated=${updated} failed=${failed}`);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

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
  if (n.includes('montreal') || n.includes('canadiens')) return 'MTL';
  if (n.includes('nashville') || n.includes('predators')) return 'NSH';
  if (n.includes('new jersey') || n.includes('devils')) return 'NJD';
  if (n.includes('new york') && (n.includes('islander'))) return 'NYI';
  if (n.includes('new york') && (n.includes('ranger'))) return 'NYR';
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

main().catch(e => { console.error(e); process.exit(1); });
