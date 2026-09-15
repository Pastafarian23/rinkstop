#!/usr/bin/env node
/**
 * Phase 4 — Ingest NHL 2025-26 rosters from NHL.com into nhl_players.
 *
 * APPROACH:
 *  - Pull NHL.com /v1/roster/{TEAM}/20252026 for all 32 teams
 *  - For each player, upsert into nhl_players with full bio data
 *  - Cross-link to team_workspaces.id via triCode → UUID mapping
 *  - Track active roster vs historical (use is_active flag)
 *
 * Schema mapping:
 *  - id (PK) = NHL.com numeric player ID (8476932 etc.)
 *  - player_id = NHL.com numeric player ID (same as id, kept for compat)
 *  - full_name = firstName + ' ' + lastName
 *  - position = 'Forward' | 'Defense' | 'Goalie' (mapped from positionCode)
 *  - position_abbreviation = positionCode (F/D/G)
 *  - jersey_number = sweaterNumber
 *  - height = inches (heightInInches)
 *  - weight = pounds (weightInPounds)
 *  - birth_date, birth_place, birth_country
 *  - shoots = shootsCatches
 *  - current_team_id = team_workspaces UUID
 *  - current_team_abbreviation = triCode
 *  - is_active = true (all pulled players are active roster)
 *
 * Run:
 *   node scripts/nhl-ingest/04-ingest-rosters.cjs --dry-run
 *   node scripts/nhl-ingest/04-ingest-rosters.cjs
 */

require('../load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const { fetchTeamRoster } = require('./lib/sources/nhl-com.cjs');

const NHL_SEASON = '20252026';
const DB_SEASON = '2025-26';
const LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dryRun = process.argv.includes('--dry-run');

// triCode → NHL teamId (for matching roster endpoint URLs)
const TRI_TO_NHL_ID = {
  ANA: 24, BOS: 7, BUF: 8, CGY: 20, CAR: 12, CHI: 16, COL: 21, CBJ: 29,
  DAL: 25, DET: 17, EDM: 22, FLA: 13, LAK: 26, MIN: 30, MTL: 6, NSH: 18,
  NJD: 1, NYI: 2, NYR: 3, OTT: 9, PHI: 4, PIT: 5, SJS: 28, SEA: 55,
  STL: 19, TBL: 14, TOR: 10, UTA: 68, VAN: 23, VGK: 54, WPG: 52, WSH: 15,
};

const ALL_TRI = Object.keys(TRI_TO_NHL_ID);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Map NHL.com roster player to our nhl_players row.
 *
 * Schema note: nhl_players.current_team_id is bigint with NHL numeric team ID
 * (NOT a UUID). Cross-link to team_workspaces is via current_team_abbreviation.
 */
function mapPlayer(p, positionLabel, nhlTeamId, teamTri) {
  return {
    id: p.id, // NHL.com numeric player ID — primary key (and used as cross-link from play_by_play.scorer_player_id)
    first_name: p.firstName?.default || '',
    last_name: p.lastName?.default || '',
    full_name: `${p.firstName?.default || ''} ${p.lastName?.default || ''}`.trim(),
    jersey_number: p.sweaterNumber || null,
    position: positionLabel,
    position_abbreviation: p.positionCode || null,
    shoots: p.shootsCatches || null,
    height: p.heightInInches || null,
    weight: p.weightInPounds || null,
    birth_date: p.birthDate || null,
    birth_country: p.birthCountry || null,
    birth_place: p.birthCity?.default || null,
    nationality: p.birthCountry || null,
    current_team_id: nhlTeamId, // NHL numeric team ID (matches schema)
    current_team_abbreviation: teamTri, // triCode for joining to team_workspaces
    current_team_name: p.currentTeamName || null,
    current_team_logo: p.headshot?.replace(/\/[0-9]+\.png$/, '/logo.png') || null,
    logo: p.headshot || null,
    is_active: true,
    league_name: 'NHL',
    role: 'player',
    was_player: true,
    source: 'nhl.com',
    updated_at: new Date().toISOString(),
  };
}

async function loadTeamUuidMap() {
  const { data } = await supabase
    .from('team_workspaces')
    .select('id, slug')
    .eq('league_id', LEAGUE_ID)
    .eq('is_active', true);
  const slugToUuid = {};
  for (const t of data) slugToUuid[t.slug] = t.id;

  // Build triCode → UUID by scanning fixtures game_data (most reliable)
  const allFixtures = [];
  let offset = 0;
  while (true) {
    const { data: r } = await supabase
      .from('fixtures')
      .select('home_team_id, game_data')
      .eq('season', DB_SEASON)
      .not('game_data', 'is', null)
      .range(offset, offset + 999);
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

  // Fallback via slug
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

async function main() {
  console.log('[rosters] Phase 4: NHL 2025-26 player rosters');
  console.log(`[rosters] dry_run=${dryRun}`);

  const triToUuid = await loadTeamUuidMap();
  console.log(`[rosters] triCode→UUID mapped: ${Object.keys(triToUuid).length}/32`);

  // Pull all 32 rosters
  console.log(`[rosters] Pulling ${ALL_TRI.length} rosters from NHL.com...`);
  const allPlayers = [];
  let failedTeams = 0;
  for (let i = 0; i < ALL_TRI.length; i++) {
    const tri = ALL_TRI[i];
    process.stdout.write(`[rosters] ${i + 1}/${ALL_TRI.length} ${tri}...`);
    try {
      const roster = await fetchTeamRoster(tri, NHL_SEASON);
      const nhlTeamId = TRI_TO_NHL_ID[tri];
      let count = 0;
      for (const section of ['forwards', 'defensemen', 'goalies']) {
        const posLabel = { forwards: 'Forward', defensemen: 'Defense', goalies: 'Goalie' }[section];
        for (const p of roster[section]) {
          allPlayers.push(mapPlayer(p, posLabel, nhlTeamId, tri));
          count++;
        }
      }
      console.log(` ${count} players`);
    } catch (e) {
      console.error(` ERR: ${e.message}`);
      failedTeams++;
    }
    await sleep(110);
  }

  console.log(`\n[rosters] Total players pulled: ${allPlayers.length}`);
  console.log(`[rosters] Failed teams: ${failedTeams}`);

  // Categorize by position
  const byPos = { Forward: 0, Defense: 0, Goalie: 0 };
  for (const p of allPlayers) {
    if (byPos[p.position] !== undefined) byPos[p.position]++;
  }
  console.log(`[rosters] By position:`, byPos);

  if (dryRun) {
    console.log(`\n[rosters] DRY RUN — would upsert ${allPlayers.length} players`);
    console.log(`Sample player:`);
    console.log(JSON.stringify(allPlayers[0], null, 2));
    process.exit(0);
  }

  // Upsert in batches
  console.log(`\n[rosters] Upserting ${allPlayers.length} players...`);
  let inserted = 0, updated = 0, failed = 0;
  const batchSize = 100;

  for (let i = 0; i < allPlayers.length; i += batchSize) {
    const batch = allPlayers.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    process.stdout.write(`[rosters] batch ${batchNum}/${Math.ceil(allPlayers.length / batchSize)} (${batch.length})...`);
    const { error } = await supabase
      .from('nhl_players')
      .upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(' ERR:', error.message);
      failed += batch.length;
    } else {
      console.log(' ok');
      inserted += batch.length;
    }
  }

  // Audit log
  await supabase.from('ingest_audit_log').insert({
    entity_type: 'roster',
    season: DB_SEASON,
    phase: 4,
    source_1: 'nhl.com',
    source_2: 'pending',
    completed_at: new Date().toISOString(),
    rows_pulled_s1: allPlayers.length,
    rows_pulled_s2: null,
    rows_matched: allPlayers.length,
    rows_flagged: 0,
    rows_rejected: 0,
    rows_inserted: inserted,
    status: 'completed',
  });

  console.log(`\n[rosters] DONE. inserted=${inserted} failed=${failed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
