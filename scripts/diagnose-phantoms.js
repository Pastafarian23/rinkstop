require('./load-secrets.cjs');
// Diagnose the phantoms: are there phantom games on dates that have real NHL games?
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const NHL = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';

(async () => {
  // Sample a specific date that has many games
  const testDate = '2026-06-15';
  const { data, error } = await supabase
    .from('fixtures')
    .select('id, scheduled_at, status, home_score, away_score, home_team_id, away_team_id, game_data')
    .eq('league_id', NHL)
    .gte('scheduled_at', `${testDate}T00:00:00+00:00`)
    .lt('scheduled_at', `${testDate}T23:59:59+00:00`)
    .order('scheduled_at', { ascending: true });
  if (error) { console.error(error); return; }
  console.log(`DB games on ${testDate}: ${data.length}`);

  // Get NHL.com actual
  const res = await fetch(`https://api-web.nhle.com/v1/score/${testDate}`);
  const j = await res.json();
  const nhlGames = (j.games || []).map(g => ({
    abbrev: `${g.awayTeam.abbrev}@${g.homeTeam.abbrev}`,
    score: `${g.homeTeam.score}-${g.awayTeam.score}`,
    time: g.startTimeUTC.slice(11, 16),
  }));
  console.log(`NHL.com actual on ${testDate}: ${nhlGames.length}`);
  for (const g of nhlGames) console.log(`  ${g.time} ${g.abbrev} ${g.score}`);

  // Check teams lookup
  const teamIds = [...new Set([...data.map(d => d.home_team_id), ...data.map(d => d.away_team_id)].filter(Boolean))];
  const { data: teams } = await supabase.from('teams').select('id, slug, name').in('id', teamIds);
  const teamMap = Object.fromEntries((teams || []).map(t => [t.id, t]));

  console.log(`\nDB games on ${testDate} (first 15):`);
  for (const f of data.slice(0, 15)) {
    const homeAbbr = (f.game_data?.home_team?.abbrev) || '?';
    const awayAbbr = (f.game_data?.away_team?.abbrev) || '?';
    const time = f.scheduled_at.slice(11, 16);
    const homeTeam = teamMap[f.home_team_id]?.name || 'NULL';
    const awayTeam = teamMap[f.away_team_id]?.name || 'NULL';
    console.log(`  ${time} ${awayAbbr}@${homeAbbr} ${f.home_score}-${f.away_score} [${homeTeam} vs ${awayTeam}] ${f.status}`);
  }
})();
