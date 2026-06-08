// Probe whether the team-roster endpoint returns position data for NCAA teams
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const KEY = process.env.HIGHLIGHTLY_API_KEY;

(async () => {
  // 1. Get the 421 "done" rows that still lack position_abbreviation
  const missing = await supabase
    .from('nhl_players')
    .select('id,full_name,current_team_id,current_team_abbreviation,current_team_name,league_name')
    .is('position_abbreviation', null)
    .not('current_team_id', 'is', null)
    .not('league_name', 'is', null)
    .limit(500);
  console.log(`Found ${missing.data.length} missing-position rows with a team context.`);

  // 2. Group by team_id
  const byTeam = {};
  for (const p of missing.data) {
    const tid = p.current_team_id;
    if (!byTeam[tid]) byTeam[tid] = { team_name: p.current_team_name, league: p.league_name, players: [] };
    byTeam[tid].players.push(p);
  }
  const teamIds = Object.keys(byTeam);
  console.log(`Spread across ${teamIds.length} teams.`);

  // 3. Pick a sample of 5 teams: 3 NCAA, 2 NHL
  const ncaaTeams = teamIds.filter(t => byTeam[t].league === 'NCAA');
  const nhlTeams = teamIds.filter(t => byTeam[t].league === 'NHL');
  const sample = [
    ...ncaaTeams.slice(0, 3),
    ...nhlTeams.slice(0, 2)
  ];

  console.log('\nProbing team-roster endpoint for these teams:');
  for (const tid of sample) {
    const t = byTeam[tid];
    console.log(`\n=== Team ${tid} (${t.team_name}, ${t.league}) — ${t.players.length} players missing pos ===`);

    // Probe a few endpoint shapes
    const endpoints = [
      `/players?teamId=${tid}&limit=5`,
      `/players?team=${tid}&limit=5`,
      `/teams/${tid}/players?limit=5`,
    ];
    for (const ep of endpoints) {
      try {
        const r = await fetch(`https://nhl.highlightly.net${ep}`, {
          headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' }
        });
        const body = await r.json().catch(() => null);
        const arr = body?.data || body;
        const count = Array.isArray(arr) ? arr.length : 0;
        const firstKeys = count > 0 ? Object.keys(arr[0]).sort().join(',') : '(no data)';
        const first = count > 0 ? arr[0] : null;
        console.log(`  ${ep} → HTTP ${r.status} | count=${count} | keys=${firstKeys}`);
        if (first) console.log(`    sample: ${JSON.stringify(first).slice(0, 300)}`);
      } catch (e) {
        console.log(`  ${ep} → ERROR ${e.message}`);
      }
    }
  }
})();
