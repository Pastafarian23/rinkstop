// Small-scale test: ingest only 50 matches from offset 0 (most recent 2026 games)
process.chdir('/root/.openclaw/workspace/rinkstop-platform');
require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HL_KEY = process.env.HIGHLIGHTLY_API_KEY;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SB_KEY);

async function main() {
  const res = await fetch('https://nhl.highlightly.net/matches?limit=50&offset=0', {
    headers: { 'x-rapidapi-key': HL_KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' },
  });
  const data = await res.json();
  console.log(`Got ${data.data.length} matches`);

  // Get teams and league cache — paginate to get ALL teams
  let allTeams = [];
  let from = 0;
  while (true) {
    const { data: page } = await supabase.from('team_workspaces').select('id, slug').range(from, from + 999);
    if (!page || page.length === 0) break;
    allTeams = allTeams.concat(page);
    if (page.length < 1000) break;
    from += 1000;
  }
  console.log(`Loaded ${allTeams.length} teams total`);
  const slugToId = new Map(allTeams.map(t => [t.slug, t.id]));

  // abbrev → slug mapping
  const abbrevMap = {
    'ANA':'anaheim-ducks','ARI':'arizona-coyotes','BOS':'boston-bruins','BUF':'buffalo-sabres',
    'CGY':'calgary-flames','CAR':'carolina-hurricanes','CHI':'chicago-blackhawks',
    'COL':'colorado-avalanche','CBJ':'columbus-blue-jackets','DAL':'dallas-stars',
    'DET':'detroit-red-wings','EDM':'edmonton-oilers','FLA':'florida-panthers',
    'LAK':'los-angeles-kings','MIN':'minnesota-wild','MTL':'montreal-canadiens',
    'NSH':'nashville-predators','NJD':'new-jersey-devils','NYI':'new-york-islanders',
    'NYR':'new-york-rangers','OTT':'ottawa-senators','PHI':'philadelphia-flyers',
    'PIT':'pittsburgh-penguins','SJS':'san-jose-sharks','SEA':'seattle-kraken',
    'STL':'st-louis-blues','TBL':'tampa-bay-lightning','TOR':'toronto-maple-leafs',
    'UHC':'utah-hockey-club','UTA':'utah-mammoth','VAN':'vancouver-canucks',
    'VGK':'vegas-golden-knights','WSH':'washington-capitals','WPG':'winnipeg-jets',
  };
  const abbrevToSlug = abbrevMap;
  const abbrevToId = new Map();
  for (const [abbr, slug] of Object.entries(abbrevToSlug)) {
    const id = slugToId.get(slug);
    if (id) abbrevToId.set(abbr, id);
  }
  console.log(`Built ${abbrevToId.size} abbrev→team_id mappings`);

  // League cache
  const { data: leagues } = await supabase.from('leagues').select('id, name');
  const leagueByName = new Map(leagues.map(l => [l.name, l.id]));
  const leagueId = leagueByName.get('National Hockey League');
  console.log(`NHL league_id: ${leagueId}`);

  // Try matching each match
  let matched = 0, unmapped = 0;
  for (const m of data.data) {
    const h = abbrevToId.get(m.homeTeam?.abbreviation);
    const a = abbrevToId.get(m.awayTeam?.abbreviation);
    if (h && a) matched++;
    else unmapped++;
  }
  console.log(`Matched: ${matched}, Unmapped: ${unmapped}`);

  // Try inserting the first 5 matched ones
  let inserted = 0;
  const rowsToInsert = [];
  for (const m of data.data.slice(0, 50)) {
    const h = abbrevToId.get(m.homeTeam?.abbreviation);
    const a = abbrevToId.get(m.awayTeam?.abbreviation);
    if (!h || !a) continue;
    rowsToInsert.push({
      home_team_id: h, away_team_id: a, league_id: leagueId,
      scheduled_at: m.date, home_score: null, away_score: null,
      status: 'scheduled', season: `${m.season}-${(m.season + 1).toString().slice(-2)}`,
      game_data: { highlightly_id: m.id, round: m.round || null },
    });
  }
  console.log(`Prepared ${rowsToInsert.length} rows to insert`);

  // Check if any already exist (HL id dedupe)
  const { data: existing } = await supabase.from('fixtures').select('game_data').contains('game_data', {});
  const existingIds = new Set((existing || []).map(r => r.game_data?.highlightly_id).filter(Boolean));
  console.log(`Existing fixtures: ${existing.length}, with HL id: ${existingIds.size}`);

  const newRows = rowsToInsert.filter(r => !existingIds.has(r.game_data.highlightly_id));
  console.log(`New rows to insert: ${newRows.length}`);

  if (newRows.length > 0) {
    const { data: ins, error } = await supabase.from('fixtures').insert(newRows).select();
    if (error) console.error('Insert error:', error);
    else console.log(`Inserted ${ins.length} fixtures!`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
