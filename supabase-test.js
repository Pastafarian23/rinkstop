const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
(async () => {
  const { data, error } = await supabase
    .from('fixtures')
    .select(`id, scheduled_at, home_score, away_score, status, series_info,
      home_team:teams!home_team_id(id, name, city),
      away_team:teams!away_team_id(id, name, city),
      league:leagues!league_id(id, name, short_name)`)
    .in('status', ['completed', 'scheduled', 'in_progress'])
    .order('scheduled_at', { ascending: false })
    .limit(20);
  console.log('error:', error);
  console.log('count:', data?.length);
  console.log('first:', JSON.stringify(data?.[0], null, 2));
})();
