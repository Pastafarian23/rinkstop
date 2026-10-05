process.chdir('/root/.openclaw/workspace/rinkstop-platform');
require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HL_KEY = process.env.HIGHLIGHTLY_API_KEY;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SB_KEY);

const PAGE = 100;
const SEASON = 2027;  // 2026-27 NHL season
const MAX_OFFSET = 600;

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

  // abbrev → team_id
  const abbrevToId = new Map();
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
  for (const [abbr, slug] of Object.entries(abbrevToSlug)) {
    const id = slugToId.get(slug);
    if (id) abbrevToId.set(abbr, id);
  }
  console.log(`Built ${abbrevToId.size} NHL abbrev→team_id mappings`);

  const { data: leagues } = await supabase.from('leagues').select('id, name');
  const nhlId = leagues.find(l => l.name === 'National Hockey League')?.id;
  if (!nhlId) { console.error('NHL league not found'); return; }
  console.log(`NHL league_id: ${nhlId}`);

  // Fetch existing fixtures for dedup — both by HL id AND by natural key
  let allExisting = [];
  let eFrom = 0;
  while (true) {
    const { data: epage, error } = await supabase.from('fixtures')
      .select('game_data, scheduled_at, home_team_id, away_team_id, league_id, season')
      .not('game_data', 'is', null)
      .range(eFrom, eFrom + 999);
    if (error || !epage || epage.length === 0) break;
    allExisting = allExisting.concat(epage);
    if (epage.length < 1000) break;
    eFrom += 1000;
  }
  const existingHlIds = new Set(allExisting.map(r => r.game_data?.highlightly_id).filter(Boolean));
  const existingNaturalKeys = new Set(
    allExisting.map(r => `${r.league_id}|${r.season}|${r.scheduled_at}|${r.home_team_id}|${r.away_team_id}`)
  );
  console.log(`Existing fixtures: ${allExisting.length}, with HL id: ${existingHlIds.size}, with natural_key: ${existingNaturalKeys.size}`);

  let totalFetched = 0, totalMatched = 0, totalUnmapped = 0, totalInserted = 0;
  let offset = 0;
  const upsertBuffer = [];

  while (offset <= MAX_OFFSET) {
    const res = await fetch(`https://nhl.highlightly.net/matches?limit=${PAGE}&offset=${offset}&season=${SEASON}`, {
      headers: { 'x-rapidapi-key': HL_KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' },
    });
    if (!res.ok) {
      console.error(`HL fetch failed at offset=${offset}: ${res.status}`);
      break;
    }
    const data = await res.json();
    const matches = data.data || [];
    totalFetched += matches.length;
    if (matches.length === 0) break;

    for (const m of matches) {
      const homeId = abbrevToId.get(m.homeTeam?.abbreviation);
      const awayId = abbrevToId.get(m.awayTeam?.abbreviation);
      if (!homeId || !awayId) { totalUnmapped++; continue; }
      totalMatched++;

      if (existingHlIds.has(m.id)) continue;  // skip existing

      // Map Highlightly state to our DB status enum
      const hlState = m.state?.report || 'Scheduled';
      const status = hlState === 'Final' ? 'completed' : 'scheduled';

      // Dedup by natural key too (in case the same game exists with no HL id)
      const naturalKey = `${nhlId}|${SEASON}|${m.date}|${homeId}|${awayId}`;
      if (existingNaturalKeys.has(naturalKey)) continue;
      existingNaturalKeys.add(naturalKey);

      upsertBuffer.push({
        home_team_id: homeId,
        away_team_id: awayId,
        league_id: nhlId,
        scheduled_at: m.date,
        status,
        season: String(SEASON),
        home_score: null,
        away_score: null,
        game_data: { highlightly_id: m.id, hl_state: hlState, hl_season: SEASON },
      });
    }

    // Insert in chunks of 50 with ignoreDuplicates
    if (upsertBuffer.length >= 50) {
      const chunk = upsertBuffer.splice(0, 50);
      const { error, count } = await supabase.from('fixtures').insert(chunk, {
        ignoreDuplicates: true,
        count: 'exact',
      });
      if (error) console.error(`Insert error:`, error.message);
      else totalInserted += count ?? chunk.length;
    }

    console.log(`  offset=${offset} fetched=${totalFetched} matched=${totalMatched} unmapped=${totalUnmapped} inserted=${totalInserted}`);
    offset += PAGE;
  }

  // Flush remainder
  if (upsertBuffer.length > 0) {
    const { error, count } = await supabase.from('fixtures').insert(upsertBuffer, {
      ignoreDuplicates: true,
      count: 'exact',
    });
    if (error) console.error(`Final insert error:`, error.message);
    else totalInserted += count ?? upsertBuffer.length;
  }

  console.log(`\n=== Done ===`);
  console.log(`Total fetched: ${totalFetched}`);
  console.log(`Matched (NHL): ${totalMatched}`);
  console.log(`Unmapped: ${totalUnmapped}`);
  console.log(`Inserted: ${totalInserted}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
