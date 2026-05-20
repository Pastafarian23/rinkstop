/**
 * Fix Finnish Liiga Teams — moves teams from wrong SM-liiga league_id to correct Finnish Liiga league_id
 * Run: node scripts/fix-finish-liiga-league.js
 */
const { createClient } = require('@supabase/supabase-js');

const URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const KEY = '***REMOVED***';
const supabase = createClient(URL, KEY);

const CORRECT_LEAGUE_ID = '59d8bbfc-2010-424b-8022-22d5bb53faaa'; // Finnish Liiga
const WRONG_LEAGUE_ID   = '356b87b0-3792-4e4e-93cb-5c1d04c570a3'; // SM-liiga (wrong)

const FINNISH_TEAM_NAMES = [
  'JYP Jyväskylä','KalPa Kuopio','Kärpät Oulu',
  'HIFK Helsinki','HPK Hämeenlinna','Ilves Tampere',
  'Jukurit Mikkeli','KooKoo Kouvola','Lukko Rauma',
  'Pelicans Lahti','SaiPa Lappeenranta','Sport Vaasa',
  'Tappara Tampere','TPS Turku','Ässät Pori',
];

async function fix() {
  console.log('=== Fix Finnish Liiga League Assignment ===\n');

  // Find teams currently in SM-liiga (wrong league) that should be in Finnish Liiga
  const { data: wrongLeagueTeams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', WRONG_LEAGUE_ID);

  console.log(`SM-liiga currently has: ${wrongLeagueTeams?.length ?? 0} teams`);

  // Filter to only the Finnish teams
  const finnishTeams = (wrongLeagueTeams || []).filter(t =>
    FINNISH_TEAM_NAMES.includes(t.name)
  );

  console.log(`Finnish Liiga teams in wrong league: ${finnishTeams.length}`);
  if (finnishTeams.length > 0) {
    console.log('  ' + finnishTeams.map(t => t.name).join(', '));
  }
  console.log('');

  // Move each to correct league
  for (const team of finnishTeams) {
    const { error } = await supabase
      .from('teams')
      .update({ league_id: CORRECT_LEAGUE_ID })
      .eq('id', team.id);

    if (error) {
      console.log(`  ✗ failed [${team.name}]: ${error.message}`);
    } else {
      console.log(`  ✓ moved: ${team.name}`);
    }
  }

  // Verify
  const { data: finnishLiiga } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', CORRECT_LEAGUE_ID);
  console.log(`\nFinnish Liiga now: ${finnishLiiga?.length ?? 0} teams`);

  const { data: smLiiga } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', WRONG_LEAGUE_ID);
  console.log(`SM-liiga now: ${smLiiga?.length ?? 0} teams`);
  if (smLiiga?.length > 0) {
    console.log('  ' + smLiiga.map(t => t.name).join(', '));
  }
}

fix().catch(e => { console.error('Fatal:', e); process.exit(1); });