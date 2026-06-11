require('./load-secrets.cjs');
/**
 * scripts/sync-ahl-rosters.js
 * Pulls AHL team rosters via the NHL.com API.
 * NHL.com roster API returns affiliate AHL players when querying the parent NHL team.
 * So for each NHL team → we can get both the NHL roster AND their AHL affiliate roster.
 * 
 * The AHL teams are affiliated with NHL teams like this:
 * ANA → San Jose Barracuda
 * BOS → Providence Bruins
 * BUF → Rochester Americans
 * CAR → Charlotte Checkers
 * CBJ → Cleveland Monsters
 * CHI → Rockford IceHogs (NOT in our AHL list, IceHogs is in our DB)
 * COL → Colorado Eagles
 * DAL → Texas Stars
 * DET → Grand Rapids Griffins
 * EDM → Bakersfield Condors
 * FLA → Charlotte Checkers (shared with CAR)
 * LAK → Ontario Reign
 * MIN → Iowa Wild
 * MTL → Laval Rocket
 * NJD → Utica Comets
 * NYI → Bridgeport Islanders
 * NYR → Hartford Wolf Pack
 * OTT → Belleville Senators
 * PHI → Lehigh Valley Phantoms
 * PIT → Wilkes-Barre/Scranton Penguins
 * SEA → Coachella Valley Firebirds
 * SJS → San Jose Barracuda (shared with ANA)
 * STL → Springfield Thunderbirds
 * TBL → Syracuse Crunch
 * TOR → Toronto Marlies
 * UTA → Tucson Roadrunners
 * VAN → Abbotsford Canucks
 * VGK → Henderson Silver Knights (NOT in our AHL list - Henderson)
 * WPG → Manitoba Moose
 * WSH → Hershey Bears
 * 
 * Note: Some AHL teams in our DB may not match this mapping. We'll build the script
 * to use direct AHL team abbreviation lookup where possible.
 */

const { createClient } = require('@supabase/supabase-js');

const AHL_TEAMS = [
  // { name: 'Abbotsford Canucks',       ahlAbbr: 'ABB', nhlAffil: 'VAN' },  -- NHL API doesn't know ABB
  { name: 'Belleville Senators',       nhlAffil: 'OTT' },
  { name: 'Bridgeport Islanders',       nhlAffil: 'NYI' },
  { name: 'Charlotte Checkers',         nhlAffil: 'CAR' },
  { name: 'Chicago Wolves',             nhlAffil: 'CHI' },
  { name: 'Cleveland Monsters',           nhlAffil: 'CBJ' },
  { name: 'Coachella Valley Firebirds', nhlAffil: 'SEA' },
  { name: 'Colorado Eagles',            nhlAffil: 'COL' },
  { name: 'Grand Rapids Griffins',       nhlAffil: 'DET' },
  { name: 'Hartford Wolf Pack',         nhlAffil: 'NYR' },
  { name: 'Hershey Bears',             nhlAffil: 'WSH' },
  { name: 'Iowa Wild',                  nhlAffil: 'MIN' },
  { name: 'Laval Rocket',               nhlAffil: 'MTL' },
  { name: 'Lehigh Valley Phantoms',      nhlAffil: 'PHI' },
  { name: 'Manitoba Moose',             nhlAffil: 'WPG' },
  { name: 'Milwaukee Admirals',         nhlAffil: 'NSH' },
  { name: 'Ontario Reign',              nhlAffil: 'LAK' },
  { name: 'Providence Bruins',          nhlAffil: 'BOS' },
  { name: 'Rochester Americans',         nhlAffil: 'BUF' },
  { name: 'San Jose Barracuda',         nhlAffil: 'SJS' },
  { name: 'Springfield Thunderbirds',    nhlAffil: 'STL' },
  { name: 'Syracuse Crunch',            nhlAffil: 'TBL' },
  { name: 'Texas Stars',                nhlAffil: 'DAL' },
  { name: 'Toronto Marlies',             nhlAffil: 'TOR' },
  { name: 'Tucson Roadrunners',          nhlAffil: 'UTA' },
  { name: 'Utica Comets',               nhlAffil: 'NJD' },
  { name: 'Wilkes-Barre/Scranton Penguins', nhlAffil: 'PIT' },
];

const NHL_API = 'https://api-web.nhle.com/v1/roster';
const SEASON = '20242025';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const AHL_LEAGUE_ID = 'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611';

async function getAHLPlayersForNHLTeam(nhlAbbr) {
  const url = `${NHL_API}/${nhlAbbr}/${SEASON}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    // NHL.com roster API returns "forwards", "defensemen", "goalies" — all AHL affiliate players
    // are included in the same response alongside NHL players
    const allPlayers = [
      ...(data.forwards || []),
      ...(data.defensemen || []),
      ...(data.goalies || []),
    ];
    return allPlayers;
  } catch (err) {
    console.warn(`  [!] ${nhlAbbr}: ${err.message}`);
    return [];
  }
}

function posCodeToPosition(code) {
  const map = { C: 'center', L: 'left_wing', R: 'right_wing', D: 'defenseman', G: 'goalie' };
  return map[code] || code;
}

async function matchAndInsertPlayer(player, ahlTeamId) {
  const firstName = player.firstName?.default || '';
  const lastName = player.lastName?.default || '';
  const position = posCodeToPosition(player.positionCode);

  // Try to find the player in our DB (match by name + position)
  const { data: existing } = await supabase
    .from('players')
    .select('id, first_name, last_name, position, team_id')
    .eq('first_name', firstName)
    .eq('last_name', lastName)
    .eq('position', position)
    .limit(1);

  // If player already has a team, skip
  if (existing && existing.length > 0 && existing[0].team_id) return 'skipped';

  // If player not in DB at all, insert them
  if (!existing || existing.length === 0) {
    const { data: inserted, error } = await supabase.from('players').insert({
      first_name: firstName,
      last_name: lastName,
      position: position,
      shoots: player.shootsCatches || null,
      catches: player.shootsCatches || null,
      height_cm: player.heightInCentimeters || null,
      weight_kg: player.weightInKilograms || null,
      birth_date: player.birthDate || null,
      nationality: player.birthCountry || null,
      headshot_url: player.headshot || null,
      team_id: ahlTeamId,
      league_id: AHL_LEAGUE_ID,
      is_active: true,
    }).select('id').single();

    if (error) {
      if (error.code === '23505') return 'dup'; // already inserted by another team
      return 'error';
    }
    return 'inserted';
  }

  // Player exists but no team — update with AHL team
  const { error } = await supabase
    .from('players')
    .update({ team_id: ahlTeamId, league_id: AHL_LEAGUE_ID, is_active: true })
    .eq('id', existing[0].id);

  return error ? 'error' : 'assigned';
}

async function main() {
  console.log('=== AHL Roster Sync ===\n');

  // Build a map of NHL abbreviation → AHL team record from our DB
  const { data: ahlTeams } = await supabase
    .from('teams')
    .select('id, name, city')
    .eq('league_id', AHL_LEAGUE_ID);

  const ahlTeamMap = {};
  for (const t of (ahlTeams || [])) {
    ahlTeamMap[t.name] = t.id;
  }

  console.log(`Found ${ahlTeams?.length || 0} AHL teams in DB\n`);

  const NHL_ABBRS = [
    'ANA','BOS','BUF','CAR','CBJ','CHI','COL','DAL','DET','EDM',
    'FLA','LAK','MIN','MTL','NJD','NYI','NYR','OTT','PHI','PIT',
    'SEA','SJS','STL','TBL','TOR','UTA','VAN','VGK','WPG','WSH'
  ];

  let totalInserted = 0;
  let totalAssigned = 0;
  let totalSkipped = 0;
  let totalDup = 0;
  let totalError = 0;

  for (const nhlAbbr of NHL_ABBRS) {
    process.stdout.write(`[${nhlAbbr}] `);
    const players = await getAHLPlayersForNHLTeam(nhlAbbr);
    console.log(`${players.length} players fetched`);

    for (const p of players) {
      const firstName = p.firstName?.default || '';
      const lastName = p.lastName?.default || '';
      // Skip NHL players — only process if they appear to be AHL-level
      // We can't definitively tell from the NHL roster API which are AHL vs NHL
      // So we insert all and let Supabase uniqueness constraints handle it
      const result = 'inserted'; // placeholder
      totalSkipped++; // temp — we'll do batch insert instead
    }
  }

  console.log('\n=== Dry run complete ===');
  console.log('This approach is limited because NHL.com roster API mixes NHL+AHL players');
  console.log('Need a different data source for confirmed AHL rosters');
}

main().catch(console.error);