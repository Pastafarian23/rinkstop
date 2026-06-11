require('./load-secrets.cjs');
// Quick coverage check using the same key as the other scripts
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const NHL = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';

(async () => {
  // Get all NHL games in last 7 days
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('fixtures')
    .select('id, scheduled_at, status, home_score, away_score, home_team_id, away_team_id, game_data')
    .eq('league_id', NHL)
    .gte('scheduled_at', cutoff)
    .order('scheduled_at', { ascending: false })
    .limit(600);
  if (error) { console.error(error); return; }
  console.log(`NHL last 7 days: ${data.length}`);

  const byDate = {};
  for (const f of data) {
    const d = f.scheduled_at.slice(0, 10);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(f);
  }

  // Compare to NHL.com
  for (const date of Object.keys(byDate).sort().reverse()) {
    const url = `https://api-web.nhle.com/v1/score/${date}`;
    const res = await fetch(url);
    const j = await res.json();
    const actual = (j.games || []).length;
    const dbGames = byDate[date];
    const withTeam = dbGames.filter(g => g.home_team_id && g.away_team_id).length;
    const real = dbGames.filter(g => {
      // Match by score
      return (j.games || []).some(ag => ag.homeTeam.score === g.home_score && ag.awayTeam.score === g.away_score);
    }).length;
    console.log(`  ${date}: DB has ${dbGames.length} (${withTeam} have teams, ${real} match NHL.com scores) vs NHL.com actual ${actual}`);
  }
})();
