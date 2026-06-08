/**
 * Backfill NULL home_team_id / away_team_id on NHL fixtures.
 *
 * Root cause: scripts/sync-nhl-live.js hardcoded these to null on insert
 * (and on duplicate-match update). 1305+ NHL rows are missing them, so
 * /directory/games shows "Home vs Away" placeholders.
 *
 * Strategy:
 *  1. For each NULL-team NHL fixture, read game_data.home_team.abbrev
 *     and game_data.away_team.abbrev. If both present, use the hardcoded
 *     ABBREV_TO_TEAM_ID map to set home_team_id / away_team_id.
 *  2. Fixtures with no abbrev in game_data are logged but not updated
 *     here — they need an external lookup (Highlightly / NHL API).
 *
 * Run: node scripts/backfill-null-team-ids.js [--dry-run]
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SB_KEY = '***REMOVED***';
const supabase = createClient(SUPABASE_URL, SB_KEY);

const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';

// NHL abbrev -> teams.id. Sourced from the teams table on 2026-06-08.
const ABBREV_TO_TEAM_ID = {
  ANA: '219a6bb2-1103-4e27-931e-5de440e59f84', // Anaheim Ducks
  BOS: 'ae6d0878-1ac2-4c13-afc8-890c6647b668', // Boston Bruins
  BUF: '5a510c0e-1058-460d-8237-09855dfa98f4', // Buffalo Sabres
  CAR: 'e4977c12-28b3-4756-a788-cf86b40fc237', // Carolina Hurricanes
  CBJ: '6ca5c5f0-3c27-4cd5-8457-78fc3ba45344', // Columbus Blue Jackets
  CGY: '626458da-d2d4-4a4f-816b-f3796b84cfc4', // Calgary Flames
  CHI: '553a6b7b-6416-4b74-a9b3-fa15d06d52ab', // Chicago Blackhawks
  COL: 'f453fd29-12e4-4897-8f8a-ecf23d6a4122', // Colorado Avalanche
  DAL: '4c61f05e-8d34-40be-b0a8-adf37e14435c', // Dallas Stars
  DET: 'f3fa0794-ee39-4991-af45-961cb3e8f404', // Detroit Red Wings
  EDM: '5b487d74-5e9c-43c8-b104-35185fc93350', // Edmonton Oilers
  FLA: '7772070c-6c9b-4ca0-a442-dfe5b8beabcb', // Florida Panthers
  LAK: 'df9b5d1e-c5d9-46af-a524-99de500e95bf', // Los Angeles Kings
  MIN: 'd3947cbf-8b3c-4c16-8ab6-b8f8d0f5a1fe', // Minnesota Wild
  MTL: 'cff8bd78-5fee-49dc-b0ee-374722efd7b5', // Montreal Canadiens
  NJD: '486e6592-5873-48a0-8cdd-8411c8eb1105', // New Jersey Devils
  NSH: '2d3d8a64-c0d7-4b8e-a327-a1201cc92f72', // Nashville Predators
  NYI: 'acc8b466-ef9b-4d81-8ea5-6f13fc180d9e', // New York Islanders
  NYR: '2869d1cd-d8f4-4ffb-9726-30bdfdbc14d3', // New York Rangers
  OTT: 'a1f8b7f1-f7ea-42ee-9861-0eb0addf437d', // Ottawa Senators
  PHI: 'cf53124a-dbb5-4588-9cb2-2f6054918f99', // Philadelphia Flyers
  PIT: '4b75202e-b11b-4574-8ae6-7447f962cb55', // Pittsburgh Penguins
  SJS: '16c9d078-ecc9-4e7c-8bf3-e1b6e9a6ae10', // San Jose Sharks
  SEA: 'bf324536-424b-4a3d-b486-1347aa735aae', // Seattle Kraken
  STL: '7efc04e6-6a75-4b1f-a0da-3966d6e7359c', // St. Louis Blues
  TBL: '2f4c6364-2139-4e57-97ad-e01dc55418fa', // Tampa Bay Lightning
  TOR: 'bac49d62-fd43-48f5-8811-090ec8f4c76d', // Toronto Maple Leafs
  UTA: '3b80d876-f931-4740-a47f-0ed15c0e410f', // Utah Hockey Club
  VAN: 'dc828fd7-65ae-4c1d-92ea-66975eb38fce', // Vancouver Canucks
  VGK: 'cf05f5b0-6605-465f-86f3-a6f1710afc20', // Vegas Golden Knights
  WPG: '88d85b2b-7a91-4679-b1d4-e45d73e3838f', // Winnipeg Jets
  WSH: '2df72ff0-5a54-4663-91eb-13bb2a2830aa', // Washington Capitals
};

const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(dryRun ? '=== DRY RUN ===' : '=== LIVE UPDATE ===');

  // Page through all NULL-team NHL fixtures.
  const PAGE = 500;
  let offset = 0;
  let total = 0, updated = 0, missingAbbrev = 0, unknownAbbrev = 0;
  const missingExamples = [];
  const unknownAbbrevs = new Set();

  while (true) {
    const { data, error } = await supabase
      .from('fixtures')
      .select('id, scheduled_at, game_data')
      .eq('league_id', NHL_LEAGUE_ID)
      .or('home_team_id.is.null,away_team_id.is.null')
      .order('scheduled_at', { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.error('Query error:', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    for (const f of data) {
      total++;
      const gd = f.game_data;
      if (!gd) {
        missingAbbrev++;
        if (missingExamples.length < 3) missingExamples.push({ id: f.id, when: f.scheduled_at });
        continue;
      }
      const hAbbr = gd.home_team?.abbrev;
      const aAbbr = gd.away_team?.abbrev;
      if (!hAbbr || !aAbbr) {
        missingAbbrev++;
        if (missingExamples.length < 3) missingExamples.push({ id: f.id, when: f.scheduled_at, gd: Object.keys(gd) });
        continue;
      }
      const hId = ABBREV_TO_TEAM_ID[hAbbr];
      const aId = ABBREV_TO_TEAM_ID[aAbbr];
      if (!hId || !aId) {
        unknownAbbrev++;
        unknownAbbrevs.add(hAbbr); unknownAbbrevs.add(aAbbr);
        continue;
      }

      if (!dryRun) {
        const { error: updErr } = await supabase
          .from('fixtures')
          .update({ home_team_id: hId, away_team_id: aId, updated_at: new Date().toISOString() })
          .eq('id', f.id);
        if (updErr) {
          console.error(`  FAIL ${f.id}: ${updErr.message}`);
          continue;
        }
      }
      updated++;
    }

    offset += data.length;
    if (data.length < PAGE) break;
  }

  console.log(`\nProcessed: ${total}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Missing abbrev in game_data: ${missingAbbrev}`);
  if (missingExamples.length) {
    console.log('    Examples:');
    for (const e of missingExamples) console.log(`      ${e.when} ${e.id}`);
  }
  console.log(`  Unknown abbrev: ${unknownAbbrev}`);
  if (unknownAbbrevs.size) console.log(`    Abbrevs: ${[...unknownAbbrevs].join(', ')}`);

  if (dryRun) console.log('\n(dry run — no changes written)');
}

main().catch(err => { console.error(err); process.exit(1); });
