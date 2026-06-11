require('./load-secrets.cjs');
/**
 * Finnish Liiga Import — fills the gap in Supabase
 * League ID: 59d8bbfc-2010-424b-8022-22d5bb53faaa
 * Run: node scripts/import-finish-liiga.js
 */
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(URL, KEY);

const LEAGUE_ID = '59d8bbfc-2010-424b-8022-22d5bb53faaa';
const LEAGUE_NAME = 'Finnish Liiga';

const TEAMS = [
  'JYP Jyväskylä', 'KalPa Kuopio', 'Kärpät Oulu',
  'HIFK Helsinki', 'HPK Hämeenlinna', 'Ilves Tampere',
  'Jukurit Mikkeli', 'KooKoo Kouvola', 'Lukko Rauma',
  'Pelicans Lahti', 'SaiPa Lappeenranta', 'Sport Vaasa',
  'Tappara Tampere', 'TPS Turku', 'Ässät Pori',
].map(n => ({ name: n }));

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function slugify(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

async function upsertTeam(team) {
  const { error } = await supabase.from('teams').insert({
    name: team.name,
    slug: slugify(team.name),
    league_id: LEAGUE_ID,
  });
  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('23505')) {
      console.log(`  ✓ already exists: ${team.name}`);
    } else {
      console.log(`  ✗ error [${team.name}]: ${error.message}`);
    }
  } else {
    console.log(`  ✓ inserted: ${team.name}`);
  }
}

async function main() {
  console.log(`=== ${LEAGUE_NAME} Import ===`);
  console.log(`League: ${LEAGUE_NAME} (${LEAGUE_ID})`);
  console.log(`Teams: ${TEAMS.length}\n`);

  // Check existing
  const { data: existing } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', LEAGUE_ID);
  console.log(`Existing in DB: ${existing?.length ?? 0}`);
  if (existing?.length > 0) {
    console.log('  ' + existing.map(t => t.name).join(', '));
  }
  console.log('');

  // Insert missing
  const existingNames = new Set((existing || []).map(t => t.name));
  const toAdd = TEAMS.filter(t => !existingNames.has(t.name));
  console.log(`Adding: ${toAdd.length} teams\n`);

  for (const team of toAdd) {
    await upsertTeam(team);
    await sleep(150);
  }

  // Verify
  const { data: final } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', LEAGUE_ID);
  console.log(`\n=== Done — ${final?.length ?? 0}/${TEAMS.length} teams in DB ===`);

  if (final && final.length < TEAMS.length) {
    console.log(`Missing: ${TEAMS.filter(t => !new Set(final.map(f => f.name)).has(t.name)).join(', ')}`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });