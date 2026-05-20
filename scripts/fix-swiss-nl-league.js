/**
 * Fix Swiss National League — moves teams from misnamed "Swiss National League" league_id
 * to correctly named "National League (Switzerland)" league_id, and deduplicates.
 * Run: node scripts/fix-swiss-nl-league.js
 */
const { createClient } = require('@supabase/supabase-js');

const URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const KEY = '***REMOVED***';
const supabase = createClient(URL, KEY);

const CORRECT_LEAGUE_ID = '3465d1c5-c7af-4510-bed6-d43d294876a7'; // National League (Switzerland)
const WRONG_LEAGUE_ID   = 'e6aedcba-b94e-4ac8-89e5-537dcf8f1526'; // Swiss National League (misnamed)

const SWISS_TEAMS = [
  'HC Davos','SC Bern','ZSC Lions Zürich','EV Zug','HC Lausanne',
  'Genève-Servette HC','HC Ambri-Piotta','HC Lugano','HC Biel-Bienne',
  'EHC Kloten','HC Sierre-Annecy','Lausanne HC','HCfR Bruins',
];

async function fix() {
  console.log('=== Fix Swiss National League ===\n');

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', WRONG_LEAGUE_ID);

  console.log(`Teams in "Swiss National League": ${teams?.length ?? 0}`);

  // Deduplicate: if two teams have the same/similar name, mark one for deletion
  // "HC Lausanne" and "Lausanne HC" are the same team
  const seen = {};
  const dupeIds = [];
  for (const t of (teams || [])) {
    const norm = t.name.toLowerCase().replace(/[^a-z]/g, '');
    if (seen[norm]) {
      console.log(`  Duplicate found: "${t.name}" (${t.id.slice(0,8)}) — marking for deletion`);
      dupeIds.push(t.id);
    } else {
      seen[norm] = t;
    }
  }

  // Move non-duplicate teams to correct league
  const nonDupe = (teams || []).filter(t => !dupeIds.includes(t.id));
  console.log(`\nMoving ${nonDupe.length} teams to "National League (Switzerland)"...`);
  for (const team of nonDupe) {
    const { error } = await supabase
      .from('teams')
      .update({ league_id: CORRECT_LEAGUE_ID })
      .eq('id', team.id);
    console.log(`  ${error ? '✗' : '✓'} ${team.name}`);
  }

  // Delete duplicates
  if (dupeIds.length > 0) {
    console.log(`\nDeleting ${dupeIds.length} duplicate entries...`);
    for (const id of dupeIds) {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      console.log(`  ${error ? '✗' : '✓'} deleted duplicate`);
    }
  }

  // Verify
  const { data: correct } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', CORRECT_LEAGUE_ID);
  const { data: wrong } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', WRONG_LEAGUE_ID);
  console.log(`\n"National League (Switzerland)": ${correct?.length ?? 0} teams`);
  console.log(`"Swiss National League": ${wrong?.length ?? 0} teams`);
}

fix().catch(e => { console.error('Fatal:', e); process.exit(1); });