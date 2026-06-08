const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SERVICE_KEY = '***REMOVED***';

(async () => {
  // Get the full list of incomplete players, but paginated and with full info
  const url = `${SUPABASE_URL}/rest/v1/nhl_players?select=id,full_name,first_name,last_name,position_abbreviation,current_team_abbreviation,current_team_name,birth_date,height,weight,jersey_number,league_name,is_active&or=(is_active.is.null,current_team_name.is.null,current_team_abbreviation.is.null,position_abbreviation.is.null)&order=id&limit=200`;
  const res = await fetch(url, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  });
  if (!res.ok) {
    console.log('HTTP', res.status, await res.text());
    return;
  }
  const rows = await res.json();
  console.log('Total incomplete:', rows.length);
  console.log();
  // Categorize
  const byIssue = {};
  for (const r of rows) {
    const issues = [];
    if (r.is_active === null || r.is_active === undefined) issues.push('is_active');
    if (!r.current_team_name) issues.push('team_name');
    if (!r.current_team_abbreviation) issues.push('team_abbr');
    if (!r.position_abbreviation) issues.push('position');
    byIssue[issues.join(',')] = (byIssue[issues.join(',')] || 0) + 1;
  }
  console.log('Issues breakdown:');
  for (const [k, v] of Object.entries(byIssue).sort((a,b)=>b[1]-a[1])) {
    console.log(`  [${k}]: ${v}`);
  }
  console.log();
  console.log('Full list:');
  console.log(JSON.stringify(rows, null, 2));
})();
