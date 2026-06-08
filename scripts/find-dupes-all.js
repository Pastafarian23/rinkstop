// Check all leagues for duplicates
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://yszheonqyyskkjoxoexk.supabase.co', '***REMOVED***');

(async () => {
  const { data: leagues } = await supabase.from('leagues').select('id, slug, name').order('slug');
  for (const l of leagues || []) {
    // Get all rows for this league
    let rows = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from('fixtures')
        .select('id, scheduled_at, home_team_id, away_team_id, game_data, status, home_score, away_score, created_at')
        .eq('league_id', l.id)
        .range(offset, offset + 999);
      if (error) break;
      if (!data || data.length === 0) break;
      rows = rows.concat(data);
      if (data.length < 1000) break;
      offset += 1000;
    }
    if (rows.length === 0) { console.log(`${l.slug}: empty`); continue; }

    // Group by scheduled_at + team key
    const groups = {};
    for (const f of rows) {
      let teamKey;
      if (f.home_team_id && f.away_team_id) {
        teamKey = `${f.home_team_id}|${f.away_team_id}`;
      } else {
        const h = f.game_data?.home_team?.abbrev || 'X';
        const a = f.game_data?.away_team?.abbrev || 'X';
        teamKey = `${a}@${h}`;
      }
      const key = `${f.scheduled_at}|${teamKey}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    }
    const dupes = Object.entries(groups).filter(([k, v]) => v.length > 1);
    if (dupes.length === 0) { console.log(`${l.slug}: ${rows.length} rows, no dupes ✓`); continue; }
    const extras = dupes.reduce((sum, [k, v]) => sum + v.length - 1, 0);
    console.log(`${l.slug}: ${rows.length} rows, ${dupes.length} dup groups, ${extras} extras to remove`);
    for (const [k, v] of dupes.slice(0, 3)) {
      const [dt, tk] = k.split('|');
      console.log(`    ${dt} ${tk}: ${v.length}x`);
    }
  }
})();
