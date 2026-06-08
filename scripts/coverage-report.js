// Full coverage report
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://yszheonqyyskkjoxoexk.supabase.co', '***REMOVED***');

(async () => {
  const slugs = ['nhl', 'ahl', 'pwhl', 'khl', 'whl', 'ohl', 'qmjhl', 'ncaa-division-1-hockey'];
  const { data: leagues } = await supabase.from('leagues').select('id, slug, name').in('slug', slugs);
  const lm = Object.fromEntries((leagues || []).map(l => [l.slug, l]));

  console.log('Coverage AFTER dedup:');
  console.log('League                    Total  w/Teams  w/Scores  Compl   Sched   Date Min  Date Max');
  for (const slug of slugs) {
    const l = lm[slug];
    if (!l) { console.log(`${slug}: league not found`); continue; }
    let rows = [];
    let offset = 0;
    while (true) {
      const { data } = await supabase.from('fixtures')
        .select('id, scheduled_at, home_team_id, away_team_id, status, home_score, away_score')
        .eq('league_id', l.id)
        .range(offset, offset + 999);
      if (!data || data.length === 0) break;
      rows = rows.concat(data);
      if (data.length < 1000) break;
      offset += 1000;
    }
    if (rows.length === 0) { console.log(`${slug}: empty`); continue; }
    const withTeams = rows.filter(r => r.home_team_id && r.away_team_id).length;
    const withScores = rows.filter(r => r.home_score !== null && r.away_score !== null).length;
    const compl = rows.filter(r => r.status === 'completed').length;
    const sched = rows.filter(r => r.status === 'scheduled').length;
    const minDate = rows.reduce((a, b) => a.scheduled_at < b.scheduled_at ? a : b).scheduled_at.slice(0, 10);
    const maxDate = rows.reduce((a, b) => a.scheduled_at > b.scheduled_at ? a : b).scheduled_at.slice(0, 10);
    console.log(`${slug.padEnd(25)} ${String(rows.length).padStart(7)} ${String(withTeams).padStart(8)} ${String(withScores).padStart(8)} ${String(compl).padStart(7)} ${String(sched).padStart(7)} ${minDate} ${maxDate}`);
  }
})();
