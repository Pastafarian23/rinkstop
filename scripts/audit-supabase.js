/**
 * Supabase Audit — RinkStop Data Inventory
 * Run: node scripts/audit-supabase.js
 */
const { createClient } = require('@supabase/supabase-js');

const URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const KEY = '***REMOVED***';
const supabase = createClient(URL, KEY);

async function audit() {
  console.log('═══════════════════════════════════════════════');
  console.log('  RINKSTOP — SUPABASE DATA AUDIT');
  console.log('  ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════════\n');

  // Leagues
  const { data: leagues } = await supabase.from('leagues').select('id, name, level, is_active');
  console.log(`📋 LEAGUES: ${leagues?.length ?? 0} total`);
  for (const l of (leagues || [])) {
    console.log(`   ${l.is_active ? '✅' : '❌'} [${l.level}] ${l.name}`);
  }

  // Teams per league
  console.log('\n👥 TEAMS per league:');
  const { data: allTeams } = await supabase.from('teams').select('id, name, league_id');
  const byLeague = {};
  for (const t of (allTeams || [])) {
    if (!byLeague[t.league_id]) byLeague[t.league_id] = 0;
    byLeague[t.league_id]++;
  }
  for (const l of (leagues || [])) {
    const count = byLeague[l.id] || 0;
    console.log(`   ${count > 0 ? '✅' : '⚠️ '} ${String(count).padStart(4)} teams — ${l.name}`);
  }
  console.log(`   TOTAL: ${allTeams?.length ?? 0} teams`);

  // Players
  const { count: players } = await supabase.from('players').select('id', { count: 'exact', head: true });
  console.log(`\n🏒 PLAYERS: ${players ?? 0}`);

  // Rinks
  const { count: rinks } = await supabase.from('rinks').select('id', { count: 'exact', head: true });
  console.log(`\n⛸️  RINKS: ${rinks ?? 0}`);

  // Games / Fixtures
  const { data: fixtureSample } = await supabase.from('fixtures').select('id, status, scheduled_at').limit(5);
  const { count: fixtures } = await supabase.from('fixtures').select('id', { count: 'exact', head: true });
  const fixtureStatuses = {};
  const { data: allFixtures } = await supabase.from('fixtures').select('status');
  for (const f of (allFixtures || [])) {
    fixtureStatuses[f.status] = (fixtureStatuses[f.status] || 0) + 1;
  }
  console.log(`\n🏟️  FIXTURES: ${fixtures ?? 0} total`);
  for (const [s, c] of Object.entries(fixtureStatuses)) {
    console.log(`   ${s}: ${c}`);
  }

  // Teams with games (sample)
  if (fixtureSample?.length > 0) {
    console.log('\n   Sample fixtures:');
    for (const f of fixtureSample) {
      console.log(`   ${f.status} — ${f.scheduled_at?.slice(0, 10)}`);
    }
  }

  // Blog posts
  const { count: posts } = await supabase.from('blog_posts').select('id', { count: 'exact', head: true });
  console.log(`\n📝 BLOG POSTS: ${posts ?? 0}`);

  // Brands
  const { count: brands } = await supabase.from('brands').select('id', { count: 'exact', head: true });
  console.log(`\n🏪 BRANDS: ${brands ?? 0}`);

  // Youth programs
  const { count: youth } = await supabase.from('youth_programs').select('id', { count: 'exact', head: true });
  console.log(`\n🧒 YOUTH PROGRAMS: ${youth ?? 0}`);

  // playoff_updates table
  const { count: playoffUpdates } = await supabase.from('playoff_updates').select('id', { count: 'exact', head: true });
  console.log(`\n📊 PLAYOFF UPDATES: ${playoffUpdates ?? 0}`);

  // Data freshness — when were games last updated?
  const { data: latestFixture } = await supabase
    .from('fixtures')
    .select('scheduled_at, status')
    .order('scheduled_at', { ascending: false })
    .limit(1);
  console.log(`\n🕐 LATEST FIXTURE: ${latestFixture?.[0]?.scheduled_at?.slice(0, 10) ?? 'none'}`);

  console.log('\n═══════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════');
  const teamCount = allTeams?.length ?? 0;
  const expectedTeams = 374 + 1000; // approximate target
  console.log(`  Teams in DB:    ${teamCount}`);
  console.log(`  NHL teams:      ${byLeague['2b5f2b9d-84b9-4edb-8373-a732b72f4e40'] || 0} (target: 32)`);
  console.log(`  AHL teams:      ${byLeague[(leagues || []).find(l => l.name.includes('American Hockey'))?.id] || 0} (target: ~32)`);
  console.log(`  KHL teams:      ${byLeague[(leagues || []).find(l => l.name.includes('Kontinental'))?.id] || 0} (target: ~24)`);
  console.log(`  NCAA teams:     ${byLeague[(leagues || []).find(l => l.name.includes('NCAA'))?.id] || 0} (target: ~60)`);
  console.log(`  Junior teams:   ${byLeague[(leagues || []).filter(l => l.level === 'junior').map(l => l.id).reduce((a, id) => a + (byLeague[id] || 0), 0)] || 0} (target: ~100)`);
  console.log(`  Rinks:          ${rinks ?? 0}`);
  console.log(`  Fixtures:       ${fixtures ?? 0}`);
}

audit().catch(console.error);