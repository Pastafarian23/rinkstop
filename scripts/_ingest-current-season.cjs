// Ingest 2025-26 + current NHL games: offsets 0-700 (~4 API pages)
// Covers: Nov 2026 (offset 0) back to ~Sep 2025 (offset 700)
process.chdir('/root/.openclaw/workspace/rinkstop-platform');
require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HL_KEY = process.env.HIGHLIGHTLY_API_KEY;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SB_KEY);

const PAGE = 100; // Highlightly max page size
const MAX_OFFSET = 700;  // covers Nov 2026 → ~Sep 2025

async function main() {
  // Load all teams
  let allTeams = [];
  let from = 0;
  while (true) {
    const { data: page } = await supabase.from('team_workspaces').select('id, slug').range(from, from + 999);
    if (!page || page.length === 0) break;
    allTeams = allTeams.concat(page);
    if (page.length < 1000) break;
    from += 1000;
  }
  const slugToId = new Map(allTeams.map(t => [t.slug, t.id]));
  console.log(`Loaded ${allTeams.length} teams`);

  // abbrev → slug for NHL teams
  const abbrevToSlug = {
    'ANA':'anaheim-ducks','ARI':'arizona-coyotes','BOS':'boston-bruins','BUF':'buffalo-sabres',
    'CGY':'calgary-flames','CAR':'carolina-hurricanes','CHI':'chicago-blackhawks',
    'COL':'colorado-avalanche','CBJ':'columbus-blue-jackets','DAL':'dallas-stars',
    'DET':'detroit-red-wings','EDM':'edmonton-oilers','FLA':'florida-panthers',
    'LAK':'los-angeles-kings','LA':'los-angeles-kings','MIN':'minnesota-wild',
    'MTL':'montreal-canadiens','NSH':'nashville-predators','NJD':'new-jersey-devils',
    'NYI':'new-york-islanders','NYR':'new-york-rangers','OTT':'ottawa-senators',
    'PHI':'philadelphia-flyers','PIT':'pittsburgh-penguins','SJS':'san-jose-sharks',
    'SJ':'san-jose-sharks','SEA':'seattle-kraken','STL':'st-louis-blues',
    'TBL':'tampa-bay-lightning','TB':'tampa-bay-lightning','TOR':'toronto-maple-leafs',
    'UTA':'utah-mammoth','VAN':'vancouver-canucks','VGK':'vegas-golden-knights',
    'WSH':'washington-capitals','WPG':'winnipeg-jets',
  };
  const abbrevToId = new Map();
  for (const [abbr, slug] of Object.entries(abbrevToSlug)) {
    const id = slugToId.get(slug);
    if (id) abbrevToId.set(abbr, id);
  }
  console.log(`Built ${abbrevToId.size} NHL abbrev→team_id mappings`);

  // Get NHL league_id
  const { data: leagues } = await supabase.from('leagues').select('id, name');
  const leagueByName = new Map(leagues.map(l => [l.name, l.id]));
  const nhlId = leagueByName.get('National Hockey League');
  console.log(`NHL league_id: ${nhlId}`);

  // Fetch existing HL ids to skip duplicates
  let allExisting = [];
  let eFrom = 0;
  while (true) {
    const { data: epage, error } = await supabase.from('fixtures')
      .select('game_data')
      .not('game_data', 'is', null)
      .range(eFrom, eFrom + 999);
    if (error || !epage || epage.length === 0) break;
    allExisting = allExisting.concat(epage);
    if (epage.length < 1000) break;
    eFrom += 1000;
  }
  const existingHlIds = new Set(allExisting.map(r => r.game_data?.highlightly_id).filter(Boolean));
  console.log(`Existing fixtures: ${allExisting.length}, with HL id: ${existingHlIds.size}`);

  // Process pages
  let totalFetched = 0, totalMatched = 0, totalUnmapped = 0, totalInserted = 0, totalUpdated = 0;
  let offset = 0;
  const upsertBuffer = [];

  while (offset <= MAX_OFFSET) {
    const res = await fetch(`https://nhl.highlightly.net/matches?limit=${PAGE}&offset=${offset}`, {
      headers: { 'x-rapidapi-key': HL_KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' },
    });
    if (!res.ok) {
      console.error(`\nHL fetch failed at offset=${offset}: ${res.status}`);
      break;
    }
    const data = await res.json();
    const matches = data.data || [];
    totalFetched += matches.length;
    if (matches.length === 0) break;

    for (const m of matches) {
      // Only process NHL matches (most recent offsets are all NHL preseason/regular)
      const hl = m.homeTeam?.abbreviation;
      const al = m.awayTeam?.abbreviation;
      const homeTeamId = abbrevToId.get(hl);
      const awayTeamId = abbrevToId.get(al);
      if (!homeTeamId || !awayTeamId) { totalUnmapped++; continue; }
      totalMatched++;

      const row = {
        home_team_id: homeTeamId, away_team_id: awayTeamId, league_id: nhlId,
        scheduled_at: m.date, home_score: null, away_score: null,
        status: 'scheduled',
        season: m.season ? `${m.season}-${(m.season + 1).toString().slice(-2)}` : null,
        game_data: { highlightly_id: m.id, round: m.round || null, league: m.league },
      };
      if (existingHlIds.has(m.id)) { totalUpdated++; continue; }
      upsertBuffer.push(row);
      if (upsertBuffer.length >= 50) {
        const { error } = await supabase.from('fixtures').insert(upsertBuffer);
        if (!error) totalInserted += upsertBuffer.length;
        else console.error(`\nUpsert error: ${error.message}`);
        upsertBuffer.length = 0;
      }
    }
    process.stdout.write(`  offset=${offset} fetched=${totalFetched} matched=${totalMatched} unmapped=${totalUnmapped} inserted=${totalInserted}\r`);
    offset += PAGE;
    // Highlightly free: 200 req/day. We do 4 calls here. Sleep 1s between.
    await new Promise(r => setTimeout(r, 1000));
  }
  if (upsertBuffer.length > 0) {
    const { error } = await supabase.from('fixtures').insert(upsertBuffer);
    if (!error) totalInserted += upsertBuffer.length;
  }
  console.log(`\n=== Done ===`);
  console.log(`Total fetched: ${totalFetched}`);
  console.log(`Matched (NHL teams found): ${totalMatched}`);
  console.log(`Unmapped (non-NHL): ${totalUnmapped}`);
  console.log(`Skipped (already in DB): ${totalUpdated}`);
  console.log(`Inserted (new): ${totalInserted}`);
}
main().catch(e => { console.error('Failed:', e); process.exit(1); });
