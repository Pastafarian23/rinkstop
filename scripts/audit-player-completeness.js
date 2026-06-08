// Verified audit of nhl_players completeness — no guessing, all queries
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FIELDS = [
  'position_abbreviation', 'jersey_number', 'birth_date', 'birth_place',
  'is_active', 'current_team_name', 'current_team_abbreviation',
  'current_team_logo', 'league_name', 'height', 'weight'
];

async function getCount(filter) {
  let q = supabase.from('nhl_players').select('*', { count: 'exact', head: true });
  if (filter) q = q.or(filter);
  const { count, error } = await q;
  if (error) throw error;
  return count;
}

async function getRows(filter, select, limit = 1000) {
  let q = supabase.from('nhl_players').select(select).limit(limit);
  if (filter) q = q.or(filter);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

(async () => {
  const total = await getCount();
  console.log('TOTAL nhl_players rows:', total);
  console.log('');

  // Per-field coverage
  console.log('=== Per-field coverage (populated count) ===');
  for (const f of FIELDS) {
    const c = await getCount(`${f}.not.is.null`);
    const pct = (c / total * 100).toFixed(1);
    console.log(`  ${f}: ${c} / ${total} (${pct}%)`);
  }
  console.log('');

  // Incomplete: any field null
  const incompleteFilter = FIELDS.map(f => `${f}.is.null`).join(',');
  const incompleteCount = await getCount(incompleteFilter);
  console.log('=== Players with at least one null in tracked fields:', incompleteCount, '===');
  console.log('');

  // League distribution of incomplete
  console.log('=== League distribution of incomplete ===');
  const incompleteRows = await getRows(incompleteFilter, 'id,full_name,league_name,current_team_name,current_team_abbreviation,is_active,position_abbreviation,jersey_number,birth_date');
  const byLeague = {};
  for (const r of incompleteRows) {
    const l = r.league_name || 'NULL';
    byLeague[l] = (byLeague[l] || 0) + 1;
  }
  for (const [l, c] of Object.entries(byLeague).sort((a,b)=>b[1]-a[1])) {
    console.log(`  ${l}: ${c}`);
  }
  console.log('');

  // Which field is most often missing on these?
  console.log('=== Which field is null on each incomplete row ===');
  const byField = {};
  // We need full rows for this — refetch
  const allIncomplete = await getRows(incompleteFilter, 'id,full_name,league_name,position_abbreviation,jersey_number,birth_date,birth_place,is_active,current_team_name,current_team_abbreviation,current_team_logo,height,weight', 5000);
  for (const r of allIncomplete) {
    for (const f of FIELDS) {
      if (r[f] === null || r[f] === undefined || r[f] === '') {
        byField[f] = (byField[f] || 0) + 1;
      }
    }
  }
  for (const [f, c] of Object.entries(byField).sort((a,b)=>b[1]-a[1])) {
    console.log(`  ${f}: ${c} of ${allIncomplete.length} incomplete rows`);
  }
  console.log('');

  // Team distribution of NCAA-incomplete
  console.log('=== NCAA-incomplete by team (top 20) ===');
  const ncaaIncomplete = allIncomplete.filter(r => r.league_name === 'NCAA');
  const byTeam = {};
  for (const r of ncaaIncomplete) {
    const t = r.current_team_name || 'NULL';
    byTeam[t] = (byTeam[t] || 0) + 1;
  }
  for (const [t, c] of Object.entries(byTeam).sort((a,b)=>b[1]-a[1]).slice(0, 20)) {
    console.log(`  ${t}: ${c}`);
  }
  console.log(`  Total NCAA-incomplete: ${ncaaIncomplete.length}`);
  console.log('');

  // NHL-incomplete: who are they?
  console.log('=== NHL-incomplete players (position or jersey null) ===');
  const nhlIncomplete = allIncomplete.filter(r => r.league_name === 'NHL');
  console.log(`  Count: ${nhlIncomplete.length}`);
  for (const r of nhlIncomplete.slice(0, 30)) {
    console.log(`  id=${r.id} ${r.full_name} | team=${r.current_team_abbreviation} | pos=${r.position_abbreviation} | jersey=${r.jersey_number} | birth=${r.birth_date} | active=${r.is_active}`);
  }
  if (nhlIncomplete.length > 30) console.log(`  ... and ${nhlIncomplete.length - 30} more`);
  console.log('');

  // The " Bench" rows
  console.log('=== Bench placeholder rows ===');
  const bench = allIncomplete.filter(r => (r.full_name || '').trim() === 'Bench' || r.full_name?.startsWith(' '));
  console.log(`  Count: ${bench.length}`);
  for (const r of bench) {
    console.log(`  id=${r.id} | name='${r.full_name}' | team=${r.current_team_name} | league=${r.league_name} | active=${r.is_active}`);
  }
  console.log('');

  // Sample of NCAA-incomplete to see real player names
  console.log('=== Sample NCAA-incomplete players (first 15) ===');
  for (const r of ncaaIncomplete.slice(0, 15)) {
    console.log(`  id=${r.id} ${r.full_name} | team=${r.current_team_name} (${r.current_team_abbreviation}) | active=${r.is_active}`);
  }
})();
