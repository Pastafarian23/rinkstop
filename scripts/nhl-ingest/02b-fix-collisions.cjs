#!/usr/bin/env node
/**
 * Phase 2b — Fix 7 schedule collisions from Phase 2.
 *
 * Phase 2's natural_key_uniq constraint caused 7 NHL.com games to fail INSERT
 * because they collided with pre-existing highlightly rows at the same
 * (league, season, scheduled_at, home_team_id, away_team_id) but with different
 * nhl_game_id (highlightly's 6-digit IDs).
 *
 * Fix: UPDATE the existing row's game_data to the NHL.com format and add
 * the proper 10-digit nhl_game_id. Don't INSERT — UPDATE.
 *
 * Run:
 *   node scripts/nhl-ingest/02b-fix-collisions.cjs --dry-run
 *   node scripts/nhl-ingest/02b-fix-collisions.cjs              # apply
 */

require('../load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const NHL_LEAGUE = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const DB_SEASON = '2025-26';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dryRun = process.argv.includes('--dry-run');

const SLUG_TO_TRI = {
  'anaheim-ducks':'ANA','boston-bruins':'BOS','buffalo-sabres':'BUF',
  'calgary-flames':'CGY','carolina-hurricanes':'CAR','chicago-blackhawks':'CHI',
  'colorado-avalanche':'COL','columbus-blue-jackets':'CBJ','dallas-stars':'DAL',
  'detroit-red-wings':'DET','edmonton-oilers':'EDM','florida-panthers':'FLA',
  'los-angeles-kings':'LAK','minnesota-wild':'MIN',
  'montr-al-canadiens':'MTL','nashville-predators':'NSH','new-jersey-devils':'NJD',
  'new-york-islanders':'NYI','new-york-rangers':'NYR','ottawa-senators':'OTT',
  'philadelphia-flyers':'PHI','pittsburgh-penguins':'PIT','san-jose-sharks':'SJS',
  'seattle-kraken':'SEA','st-louis-blues':'STL','tampa-bay-lightning':'TBL',
  'toronto-maple-leafs':'TOR','utah-mammoth':'UTA','vancouver-canucks':'VAN',
  'vegas-golden-knights':'VGK','winnipeg-jets':'WPG','washington-capitals':'WSH'
};

const TEAM_TRICODE_TO_SLUG = Object.fromEntries(
  Object.entries(SLUG_TO_TRI).map(([slug, tri]) => [tri, slug])
);

const STATE_MAP = {
  'FUT': 'scheduled', 'PRE': 'scheduled', 'OFF': 'completed', 'FRAG': 'scheduled',
  'LIVE': 'live', 'CRIT': 'live', 'FINAL': 'completed',
};

function mapNhlGameToGameData(nhlGame) {
  return {
    id: String(nhlGame.id),
    nhl_game_id: String(nhlGame.id),
    season: nhlGame.season,
    gameType: nhlGame.gameType,
    gameDate: nhlGame.gameDate,
    startTimeUTC: nhlGame.startTimeUTC,
    venue: nhlGame.venue,
    neutralSite: nhlGame.neutralSite,
    homeTeam: nhlGame.homeTeam,
    awayTeam: nhlGame.awayTeam,
    gameState: nhlGame.gameState,
    gameScheduleState: nhlGame.gameScheduleState,
    source: 'nhl_api',
  };
}

(async () => {
  console.log('[fix-collisions] Phase 2b — fix 7 natural_key collisions in fixtures');

  // Load team UUIDs
  const { data: tws, error: twErr } = await supabase
    .from('team_workspaces')
    .select('id, slug')
    .eq('league_id', NHL_LEAGUE)
    .eq('is_active', true);
  if (twErr) throw twErr;
  const slugToUuid = {};
  for (const t of tws) slugToUuid[t.slug] = t.id;
  const triToUuid = {};
  for (const [slug, tri] of Object.entries(SLUG_TO_TRI)) {
    triToUuid[tri] = slugToUuid[slug];
  }
  console.log(`[fix-collisions] ${Object.keys(triToUuid).length} NHL teams mapped`);

  // The 7 known missing games — pull boxscore for each to get the proper data
  const GIDS = ['2025020627','2025020735','2025020258','2025020920','2025010005','2025030411','2025020459'];
  const fixes = [];
  for (const gid of GIDS) {
    const r = await fetch(`https://api-web.nhle.com/v1/gamecenter/${gid}/boxscore`);
    if (!r.ok) {
      console.warn(`[fix-collisions] ⚠️  Boxscore ${gid}: ${r.status}`);
      continue;
    }
    const j = await r.json();
    const g = j.game || j;
    const homeTri = g.homeTeam?.abbrev;
    const awayTri = g.awayTeam?.abbrev;
    const homeUuid = triToUuid[homeTri];
    const awayUuid = triToUuid[awayTri];
    if (!homeUuid || !awayUuid) {
      console.warn(`[fix-collisions] ⚠️  No UUID for ${homeTri}/${awayTri}`);
      continue;
    }

    // Find the colliding row at the natural key
    const { data: colliding } = await supabase
      .from('fixtures')
      .select('id, game_data')
      .eq('league_id', NHL_LEAGUE)
      .eq('season', DB_SEASON)
      .eq('scheduled_at', g.startTimeUTC)
      .eq('home_team_id', homeUuid)
      .eq('away_team_id', awayUuid);

    if (!colliding || colliding.length === 0) {
      console.warn(`[fix-collisions] ⚠️  ${gid}: no colliding row found`);
      continue;
    }
    if (colliding.length > 1) {
      console.warn(`[fix-collisions] ⚠️  ${gid}: ${colliding.length} rows at natural key`);
    }

    fixes.push({
      gid,
      fixtureId: colliding[0].id,
      startTimeUTC: g.startTimeUTC,
      gameType: g.gameType,
      gameState: g.gameState,
      homeScore: g.homeTeam?.score,
      awayScore: g.awayTeam?.score,
      homeUuid,
      awayUuid,
      homeTri,
      awayTri,
      oldGameDataKeys: colliding[0].game_data ? Object.keys(colliding[0].game_data).slice(0,3) : [],
      oldNhlId: colliding[0].game_data?.nhl_game_id || null,
    });
    await new Promise(res => setTimeout(res, 100));
  }

  console.log(`\n[fix-collisions] ${fixes.length} fixes to apply:`);
  for (const f of fixes) {
    console.log(`  ${f.gid} (${f.awayTri}@${f.homeTri}) | fixture_id=${f.fixtureId.slice(0,8)} | old nhl_id=${f.oldNhlId || 'null'} | old keys=${f.oldGameDataKeys.join(',')}`);
  }

  if (dryRun) {
    console.log('\n[fix-collisions] DRY RUN — no changes written');
    return;
  }

  // Apply: re-fetch each game and UPDATE
  for (const f of fixes) {
    const r = await fetch(`https://api-web.nhle.com/v1/gamecenter/${f.gid}/boxscore`);
    const j = await r.json();
    const g = j.game || j;
    const gameData = mapNhlGameToGameData(g);
    const status = STATE_MAP[g.gameState] || 'scheduled';

    const { error } = await supabase
      .from('fixtures')
      .update({
        game_data: gameData,
        status,
        home_score: g.homeTeam?.score ?? null,
        away_score: g.awayTeam?.score ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', f.fixtureId);

    if (error) {
      console.error(`[fix-collisions] ❌ UPDATE ${f.gid} (fixture ${f.fixtureId}): ${error.message}`);
    } else {
      console.log(`[fix-collisions] ✅ UPDATED ${f.gid} → fixture ${f.fixtureId.slice(0,8)}`);
    }
    await new Promise(res => setTimeout(res, 100));
  }

  console.log('\n[fix-collisions] Done. Re-running Phase 8 sync would now include these in nhl_matches.');
})();
