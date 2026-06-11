require('./load-secrets.cjs');
// Find duplicates in NHL fixtures: same date + same teams
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const NHL = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';

(async () => {
  // Get all NHL fixtures
  let allRows = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('fixtures')
      .select('id, scheduled_at, status, home_team_id, away_team_id, game_data, created_at')
      .eq('league_id', NHL)
      .order('created_at', { ascending: true })
      .range(offset, offset + 999);
    if (error) { console.error(error); break; }
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`Total NHL fixtures: ${allRows.length}`);

  // Group by scheduled_at + teams (with teams) OR by scheduled_at + game_data abbrevs
  const groups = {};
  for (const f of allRows) {
    let key;
    if (f.home_team_id && f.away_team_id) {
      key = `${f.scheduled_at}|${f.home_team_id}|${f.away_team_id}`;
    } else {
      // Use game_data abbrev as fallback
      const h = f.game_data?.home_team?.abbrev || '?';
      const a = f.game_data?.away_team?.abbrev || '?';
      key = `${f.scheduled_at}|${h}|${a}`;
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  }

  // Find groups with >1 entries
  const dupes = Object.entries(groups).filter(([k, v]) => v.length > 1);
  console.log(`Duplicate groups: ${dupes.length}`);

  let totalDupeRows = 0;
  for (const [k, v] of dupes) {
    totalDupeRows += v.length - 1; // extras
  }
  console.log(`Extra rows to remove: ${totalDupeRows}`);

  // Show sample
  console.log('\nSample duplicate groups (first 10):');
  for (const [k, v] of dupes.slice(0, 10)) {
    const h = v[0].game_data?.home_team?.abbrev || '?';
    const a = v[0].game_data?.away_team?.abbrev || '?';
    console.log(`  ${k.split('|')[0]} ${a}@${h}: ${v.length} copies`);
  }

  // Distribution
  const counts = {};
  for (const [, v] of dupes) counts[v.length] = (counts[v.length] || 0) + 1;
  console.log('\nDuplication distribution:');
  for (const c of Object.keys(counts).sort((a, b) => +a - +b)) {
    console.log(`  ${c}x: ${counts[c]} groups`);
  }
})();
