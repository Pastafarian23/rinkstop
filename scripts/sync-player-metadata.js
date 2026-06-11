require('./load-secrets.cjs');
/**
 * scripts/sync-player-metadata.js
 * Fetches height, weight, birth_date, shoots/catches, nationality, headshot
 * for all NHL players by scraping the NHL.com roster API.
 * Updates Supabase players table in place.
 * 
 * Run: node scripts/sync-player-metadata.js
 */

const { createClient } = require('@supabase/supabase-js');

const NHL_TEAMS = [
  'ANA', 'BOS', 'BUF', 'CAR', 'CBJ', 'CGY', 'CHI', 'COL',
  'DAL', 'DET', 'EDM', 'FLA', 'LAK', 'MIN', 'MTL', 'NJD',
  'NYI', 'NYR', 'OTT', 'PHI', 'PIT', 'SEA', 'SJS', 'STL',
  'TBL', 'TOR', 'UTA', 'VAN', 'VGK', 'WPG', 'WSH', 'VGK',
];

// Fix duplicate — VGK is Vegas, DAL is Dallas
const TEAMS = ['ANA','BOS','BUF','CAR','CBJ','CGY','CHI','COL','DAL','DET','EDM','FLA','LAK','MIN','MTL','NJD','NYI','NYR','OTT','PHI','PIT','SEA','SJS','STL','TBL','TOR','UTA','VAN','VGK','WPG','WSH'];

// Remove duplicates
const uniqueTeams = [...new Set(TEAMS)];

const SEASON = '20242025';
const NHL_API = 'https://api-web.nhle.com/v1/roster';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function posCodeToPosition(code) {
  const map = { C: 'center', L: 'left_wing', R: 'right_wing', D: 'defenseman', G: 'goalie' };
  return map[code] || code;
}

async function fetchRoster(teamAbbr) {
  const url = `${NHL_API}/${teamAbbr}/${SEASON}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  [!] ${teamAbbr}: HTTP ${res.status}`);
    return [];
  }
  const data = await res.json();
  const allPlayers = [
    ...(data.forwards || []),
    ...(data.defensemen || []),
    ...(data.goalies || []),
  ];
  return allPlayers.map(p => ({
    nhl_id: p.id,
    first_name: p.firstName?.default || '',
    last_name: p.lastName?.default || '',
    position: posCodeToPosition(p.positionCode),
    shoots: p.shootsCatches || null,
    catches: p.shootsCatches || null,
    height_cm: p.heightInCentimeters || null,
    weight_kg: p.weightInKilograms || null,
    birth_date: p.birthDate || null,
    nationality: p.birthCountry || null,
    headshot_url: p.headshot || null,
    team_abbr: teamAbbr,
  }));
}

async function matchPlayer(supabase, firstName, lastName, position, teamAbbr) {
  // Try exact match on first_name + last_name
  const { data, error } = await supabase
    .from('players')
    .select('id, first_name, last_name, position, team_id')
    .eq('first_name', firstName)
    .eq('last_name', lastName)
    .eq('position', position)
    .limit(5);

  if (error || !data || data.length === 0) return null;

  // If more than one result, try to filter by team
  if (data.length > 1) {
    // Try to find a player whose team matches the abbreviation
    const { data: teamData } = await supabase
      .from('teams')
      .select('id, abbreviation')
      .eq('abbreviation', teamAbbr)
      .limit(1);

    if (teamData && teamData.length > 0) {
      const match = data.find(p => p.team_id === teamData[0].id);
      if (match) return match;
    }
    // Fallback: return first
    return data[0];
  }

  return data[0];
}

async function updatePlayer(supabase, uuid, updates) {
  const { data, error } = await supabase
    .from('players')
    .update(updates)
    .eq('id', uuid)
    .select('id')
    .single();

  return { data, error };
}

async function main() {
  console.log('=== NHL Player Metadata Sync ===\n');
  console.log(`Fetching ${uniqueTeams.length} team rosters from NHL.com...`);

  let totalPlayers = 0;
  let matched = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const team of uniqueTeams) {
    process.stdout.write(`\n[${team}] Fetching roster... `);
    const roster = await fetchRoster(team);
    console.log(`${roster.length} players`);

    for (const player of roster) {
      totalPlayers++;
      const supabasePlayer = await matchPlayer(
        supabase,
        player.first_name,
        player.last_name,
        player.position,
        player.team_abbr
      );

      if (!supabasePlayer) {
        skipped++;
        process.stdout.write('S');
        continue;
      }

      matched++;

      // Build updates — only non-null fields
      const updates = {};
      if (player.height_cm) updates.height_cm = player.height_cm;
      if (player.weight_kg) updates.weight_kg = player.weight_kg;
      if (player.birth_date) updates.birth_date = player.birth_date;
      if (player.shoots) updates.shoots = player.shoots;
      if (player.catches) updates.catches = player.catches;
      if (player.nationality) updates.nationality = player.nationality;
      if (player.headshot_url) updates.headshot_url = player.headshot_url;

      if (Object.keys(updates).length === 0) {
        skipped++;
        continue;
      }

      const { data, error } = await updatePlayer(supabase, supabasePlayer.id, updates);
      if (error) {
        errors++;
        process.stdout.write('E');
      } else {
        updated++;
        process.stdout.write('.');
      }
    }
  }

  console.log('\n\n=== RESULTS ===');
  console.log(`Total players in roster API: ${totalPlayers}`);
  console.log(`Matched to Supabase:          ${matched}`);
  console.log(`Updated:                       ${updated}`);
  console.log(`Skipped (no match):            ${skipped}`);
  console.log(`Errors:                        ${errors}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});