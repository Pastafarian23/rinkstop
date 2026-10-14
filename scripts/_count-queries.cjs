const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

let count = 0;
const realFetch = global.fetch;
global.fetch = (...args) => {
  const url = (args[0]?.toString ? args[0].toString() : args[0]) || '';
  if (url.includes('/rest/v1/') || url.includes('.supabase.co')) count++;
  return realFetch.apply(global, args);
};

async function fetchGame(id) {
  const { data: probe } = await sb
    .from('fixtures')
    .select('status, scheduled_at')
    .eq('id', id)
    .maybeSingle();
  const { data: fixture } = await sb
    .from('fixtures')
    .select(`id, scheduled_at, status, home_score, away_score, league_id, home_team_id, away_team_id, game_data,
      home_team:teams!fixtures_home_team_id_fkey(id, name, slug, logo_url),
      away_team:teams!fixtures_away_team_id_fkey(id, name, slug, logo_url),
      league:leagues(id, name, slug, level, country)`)
    .eq('id', id)
    .maybeSingle();
  const { data: fss } = await sb
    .from('fixture_scoresheet_settings')
    .select('qr_enabled')
    .eq('fixture_id', id)
    .maybeSingle();
  return { probe, fixture, fss };
}

(async () => {
  const id = process.argv[2] || '68c35920-11db-4be1-b6a9-17ba085edd94';
  for (const run of [1, 2, 3]) {
    count = 0;
    const r = await fetchGame(id);
    console.log(`Render ${run} queries=${count} status=${r.fixture?.status} score=${r.fixture?.home_score}-${r.fixture?.away_score}`);
  }
})();
