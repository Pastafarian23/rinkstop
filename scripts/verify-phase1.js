// Independent verification of Phase 1 results
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('=== POST-PHASE-1 VERIFICATION (NHL league only) ===\n');

  // Total
  const total = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).eq('league_name', 'NHL');
  console.log(`Total NHL rows: ${total.count}`);

  // Field coverage
  for (const f of ['position_abbreviation', 'jersey_number', 'birth_date', 'is_active']) {
    const c = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).eq('league_name', 'NHL').not(f, 'is', null);
    const pct = (c.count / total.count * 100).toFixed(1);
    console.log(`  ${f}: ${c.count} / ${total.count} (${pct}%)`);
  }

  // Active count
  const active = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).eq('league_name', 'NHL').eq('is_active', true);
  console.log(`\nis_active=true: ${active.count}`);
  const inactive = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).eq('league_name', 'NHL').eq('is_active', false);
  console.log(`is_active=false: ${inactive.count}`);

  // Spot-check: pick 5 NHL.com players and verify they exist in DB with correct data
  const NHL_BASE = 'https://api-web.nhle.com/v1';
  const TESTS = [
    { team: 'EDM', name: 'Connor McDavid' },
    { team: 'EDM', name: 'Leon Draisaitl' },
    { team: 'TOR', name: 'Auston Matthews' },
    { team: 'VGK', name: 'Jack Eichel' },
    { team: 'BOS', name: 'David Pastrnak' },
  ];
  console.log('\n=== Spot-check: 5 famous NHL.com players now in DB? ===');
  for (const t of TESTS) {
    const r = await fetch(`${NHL_BASE}/roster/${t.team}/20252026`);
    const d = await r.json();
    const all = [...(d.forwards||[]), ...(d.defensemen||[]), ...(d.goalies||[])];
    const nhlP = all.find(p => `${p.firstName?.default||''} ${p.lastName?.default||''}`.trim() === t.name);
    if (!nhlP) { console.log(`  ${t.name} (${t.team}): not in NHL.com (retired/traded?)`); continue; }
    // Look up in DB by name+team
    const db = await supabase.from('nhl_players')
      .select('id,full_name,position_abbreviation,jersey_number,height,weight,birth_date,is_active')
      .eq('league_name', 'NHL')
      .ilike('full_name', `%${t.name.split(' ').slice(-1)[0]}%`)
      .limit(5);
    const found = (db.data||[]).find(r => r.full_name === t.name);
    if (!found) { console.log(`  ${t.name} (${t.team}): NOT in DB`); continue; }
    const matches = {
      pos: found.position_abbreviation === (nhlP.positionCode === 'L' ? 'LW' : nhlP.positionCode === 'R' ? 'RW' : nhlP.positionCode),
      jersey: String(found.jersey_number || '') === String(nhlP.sweaterNumber || ''),
      height: found.height === nhlP.heightInInches,
      weight: found.weight === nhlP.weightInPounds,
      birth: found.birth_date === nhlP.birthDate,
    };
    const allMatch = Object.values(matches).every(v => v);
    console.log(`  ${t.name} (${t.team}): ${allMatch ? '✅' : '⚠️'} pos=${found.position_abbreviation} j=${found.jersey_number} h=${found.height} w=${found.weight} birth=${found.birth_date} active=${found.is_active}`);
  }
})();
