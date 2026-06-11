require('./load-secrets.cjs');
/**
 * RinkStop — Player Data Richness Audit
 * Run: node scripts/audit-players.js
 */
const { createClient } = require('@supabase/supabase-js');

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(URL, KEY);

async function audit() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  RINKSTOP — PLAYER DATA RICHNESS AUDIT');
  console.log('  ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════════════\n');

  // ── 1. Table column inventory ──────────────────────────────────────────────
  const { data: sample } = await supabase.from('players').select('*').limit(1);
  const columns = sample ? Object.keys(sample[0]) : [];
  console.log('📋 PLAYERS TABLE COLUMNS:');
  columns.forEach(c => console.log('   • ' + c));

  // ── 2. Core counts ─────────────────────────────────────────────────────────
  const { count: total } = await supabase.from('players').select('id', { count: 'exact', head: true });
  console.log(`\n🏒 TOTAL PLAYERS: ${total ?? 0}`);

  // ── 3. Non-null per column (proper non-null check) ───────────────────────
  console.log('\n📊 NON-NULL VALUES PER COLUMN:');
  for (const col of columns) {
    const { count } = await supabase.from('players').select(col, { count: 'exact', head: true }).not(col, 'is', null);
    const pct = total ? ((count / total) * 100).toFixed(1) : '0.0';
    const filled = Math.round((count / (total || 1)) * 20);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    console.log(`   ${String(col).padEnd(20)} ${String(count).padStart(5)} / ${total} (${pct}%) ${bar}`);
  }

  // ── 4. Players per league (via teams join) ────────────────────────────────
  console.log('\n🏆 PLAYERS BY LEAGUE:');
  const { data: allPlayersWithTeams } = await supabase
    .from('players')
    .select('team_id, teams(name, leagues(id, name, slug))');

  const leagueCount = {};
  for (const p of (allPlayersWithTeams || [])) {
    const league = p.teams?.leagues?.name || '(no league assigned)';
    if (!leagueCount[league]) leagueCount[league] = { count: 0, slug: p.teams?.leagues?.slug || '' };
    leagueCount[league].count++;
  }

  const sortedLeagues = Object.entries(leagueCount).sort((a, b) => b[1].count - a[1].count);
  const grandTotal = sortedLeagues.reduce((s, [, v]) => s + v.count, 0);

  sortedLeagues.forEach(([league, data]) => {
    const pct = ((data.count / grandTotal) * 100).toFixed(1);
    console.log(`   ${String(data.count).padStart(5)} (${pct}%) ${league}`);
  });
  console.log(`   TOTAL: ${grandTotal}`);

  // ── 5. Players by position ───────────────────────────────────────────────
  console.log('\n🛞 PLAYERS BY POSITION:');
  const { data: posData } = await supabase.from('players').select('position');
  const posCount = {};
  for (const p of (posData || [])) {
    const pos = p.position || '(null)';
    posCount[pos] = (posCount[pos] || 0) + 1;
  }
  Object.entries(posCount).sort((a, b) => b[1] - a[1]).forEach(([pos, count]) => {
    console.log(`   ${String(count).padStart(5)} ${pos}`);
  });

  // ── 6. Full-data completeness ────────────────────────────────────────────
  console.log('\n✅ FULL-DATA COMPLETENESS:');
  const keyCols = ['height_cm', 'weight_kg', 'birth_date', 'nationality', 'shoots', 'catches', 'headshot_url', 'jersey_number'];
  for (const col of keyCols) {
    const { count: nonNull } = await supabase.from('players').select(col, { count: 'exact', head: true }).not(col, 'is', null);
    console.log(`   ${col.padEnd(20)} ${String(nonNull).padStart(5)} / ${total} (${((nonNull / (total || 1)) * 100).toFixed(1)}%)`);
  }

  // ── 7. Active vs inactive ─────────────────────────────────────────────────
  console.log('\n🔌 ACTIVE vs INACTIVE:');
  const { data: activeData } = await supabase.from('players').select('is_active');
  const activeCount = (activeData || []).filter(p => p.is_active === true).length;
  const inactiveCount = (activeData || []).filter(p => p.is_active === false).length;
  const nullActive = (activeData || []).filter(p => p.is_active === null || p.is_active === undefined).length;
  console.log(`   Active:   ${activeCount}`);
  console.log(`   Inactive: ${inactiveCount}`);
  console.log(`   Null/N/A: ${nullActive}`);

  // ── 8. Players by nationality (top 15) ───────────────────────────────────
  console.log('\n🌍 PLAYERS BY NATIONALITY (top 15):');
  const { data: natData } = await supabase.from('players').select('nationality').not('nationality', 'is', null);
  const natCount = {};
  for (const p of (natData || [])) {
    const n = p.nationality || '(unknown)';
    natCount[n] = (natCount[n] || 0) + 1;
  }
  Object.entries(natCount).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([nat, count]) => {
    console.log(`   ${String(count).padStart(5)} ${nat}`);
  });

  // ── 9. Missing data summary ────────────────────────────────────────────────
  console.log('\n🚨 DATA GAPS:');
  const gaps = {};
  for (const col of keyCols) {
    const { count: nullCount } = await supabase.from('players').select(col, { count: 'exact', head: true }).is(col, null);
    if (nullCount > 0) gaps[col] = nullCount;
  }
  Object.entries(gaps).sort((a, b) => b[1] - a[1]).forEach(([col, count]) => {
    console.log(`   Missing ${col}: ${count} players (${((count / (total || 1)) * 100).toFixed(1)}%)`);
  });

  // ── 10. Recommendations ───────────────────────────────────────────────────
  console.log('\n💡 RECOMMENDATIONS FOR EXPANSION:');
  console.log('   1. AHL (American Hockey League) — natural feeder for NHL, ~800 players');
  console.log('   2. KHL — expand from 40 to ~300+ players (biggest European top league)');
  console.log('   3. NCAA Division 1 — ~4,000 players across 60+ schools, great for future depth');
  console.log('   4. Swedish Hockey League (SHL) — expand from 40 to full 14-team rosters');
  console.log('   5. Finnish Liiga — expand from 45 to full 15-team rosters');
  console.log('   6. Fix height_cm, weight_kg, birth_date, shoots — currently 0% populated!');
  console.log('   7. Add career_stats table: goals, assists, points, PIM, games_played per season');
  console.log('   8. Add draft info: draft_year, round, pick, team');
  console.log('   9. Add contract info: salary, cap_hit, contract_end');
  console.log('   10. Add headshot_url for non-NHL players (only 831/3952 have it)');
  console.log('');
  console.log('⚠️  KEY DATA QUALITY ISSUE:');
  console.log('   height_cm, weight_kg, birth_date, shoots — ALL are NULL for all 3,952 players.');
  console.log('   These fields need to be populated from an external stats API.');
}

audit().catch(console.error);