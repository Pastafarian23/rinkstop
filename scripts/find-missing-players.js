require('./load-secrets.cjs');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  // Query with filters for nulls - PostgREST can't easily do OR across columns
  // So just fetch a sample and check, or use a single column check
  const url = `${SUPABASE_URL}/rest/v1/nhl_players?select=id,full_name,first_name,last_name,position_abbreviation,current_team_abbreviation,current_team_name,birth_date,height,weight,jersey_number,league_name,is_active&or=(is_active.is.null,current_team_name.is.null,current_team_abbreviation.is.null,position_abbreviation.is.null)&order=id&limit=20`;
  const res = await fetch(url, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  });
  if (!res.ok) {
    console.log('HTTP', res.status, await res.text());
    return;
  }
  const rows = await res.json();
  console.log('Incomplete players:', rows.length);
  console.log(JSON.stringify(rows, null, 2));
})();
