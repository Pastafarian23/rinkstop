/**
 * Restore the remaining ~10 NHL playoff games that Highlightly doesn't have.
 * Match against NHL.com by team + score + date ± 1 day.
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient('https://yszheonqyyskkjoxoexk.supabase.co', '***REMOVED***');
const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const HL_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const NHL_ABBREV_TO_TEAM_ID = {
  ANA: '219a6bb2-1103-4e27-931e-5de440e59f84', BOS: 'ae6d0878-1ac2-4c13-afc8-890c6647b668',
  BUF: '5a510c0e-1058-460d-8237-09855dfa98f4', CAR: 'e4977c12-28b3-4756-a788-cf86b40fc237',
  CBJ: '6ca5c5f0-3c27-4cd5-8457-78fc3ba45344', CGY: '626458da-d2d4-4a4f-816b-f3796b84cfc4',
  CHI: '553a6b7b-6416-4b74-a9b3-fa15d06d52ab', COL: 'f453fd29-12e4-4897-8f8a-ecf23d6a4122',
  DAL: '4c61f05e-8d34-40be-b0a8-adf37e14435c', DET: 'f3fa0794-ee39-4991-af45-961cb3e8f404',
  EDM: '5b487d74-5e9c-43c8-b104-35185fc93350', FLA: '7772070c-6c9b-4ca0-a442-dfe5b8beabcb',
  LAK: 'df9b5d1e-c5d9-46af-a524-99de500e95bf', MIN: 'd3947cbf-8b3c-4c16-8ab6-b8f8d0f5a1fe',
  MTL: 'cff8bd78-5fee-49dc-b0ee-374722efd7b5', NJD: '486e6592-5873-48a0-8cdd-8411c8eb1105',
  NSH: '2d3d8a64-c0d7-4b8e-a327-a1201cc92f72', NYI: 'acc8b466-ef9b-4d81-8ea5-6f13fc180d9e',
  NYR: '2869d1cd-d8f4-4ffb-9726-30bdfdbc14d3', OTT: 'a1f8b7f1-f7ea-42ee-9861-0eb0addf437d',
  PHI: 'cf53124a-dbb5-4588-9cb2-2f6054918f99', PIT: '4b75202e-b11b-4574-8ae6-7447f962cb55',
  SJS: '16c9d078-ecc9-4e7c-8bf3-e1b6e9a6ae10', SEA: 'bf324536-424b-4a3d-b486-1347aa735aae',
  STL: '7efc04e6-6a75-4b1f-a0da-3966d6e7359c', TBL: '2f4c6364-2139-4e57-97ad-e01dc55418fa',
  TOR: 'bac49d62-fd43-48f5-8811-090ec8f4c76d', UTA: '3b80d876-f931-4740-a47f-0ed15c0e410f',
  VAN: 'dc828fd7-65ae-4c1d-92ea-66975eb38fce', VGK: 'cf05f5b0-6605-465f-86f3-a6f1710afc20',
  WPG: '88d85b2b-7a91-4679-b1d4-e45d73e3838f', WSH: '2df72ff0-5a54-4663-91eb-13bb2a2830aa',
};

// Reverse map: team_id → abbrev (need from DB)
async function buildTeamMap() {
  const { data } = await supabase.from('teams').select('id, slug, name').eq('league_id', NHL_LEAGUE_ID);
  const slugToAbbr = {
    'anaheim-ducks':'ANA','boston-bruins':'BOS','buffalo-sabres':'BUF','carolina-hurricanes':'CAR',
    'columbus-blue-jackets':'CBJ','calgary-flames':'CGY','chicago-blackhawks':'CHI','colorado-avalanche':'COL',
    'dallas-stars':'DAL','detroit-red-wings':'DET','edmonton-oilers':'EDM','florida-panthers':'FLA',
    'los-angeles-kings':'LAK','minnesota-wild':'MIN','montreal-canadiens':'MTL','nashville-predators':'NSH',
    'new-jersey-devils':'NJD','new-york-islanders':'NYI','new-york-rangers':'NYR','ottawa-senators':'OTT',
    'philadelphia-flyers':'PHI','pittsburgh-penguins':'PIT','san-jose-sharks':'SJS','seattle-kraken':'SEA',
    'st-louis-blues':'STL','tampa-bay-lightning':'TBL','toronto-maple-leafs':'TOR','utah-hockey-club':'UTA',
    'vancouver-canucks':'VAN','vegas-golden-knights':'VGK','washington-capitals':'WSH','winnipeg-jets':'WPG',
  };
  const idToAbbr = {};
  for (const t of (data || [])) {
    idToAbbr[t.id] = slugToAbbr[t.slug] || t.name?.slice(0, 3).toUpperCase();
  }
  return idToAbbr;
}

async function nhlFetch(date) {
  const r = await fetch(`https://api-web.nhle.com/v1/score/${date}`, { headers: { 'User-Agent': HL_UA } });
  if (!r.ok) return [];
  const j = await r.json();
  return j.games || [];
}

async function main() {
  const idToAbbr = await buildTeamMap();
  const { data: broken } = await supabase
    .from('fixtures')
    .select('id, scheduled_at, home_team_id, away_team_id')
    .eq('league_id', NHL_LEAGUE_ID)
    .eq('status', 'scheduled')
    .is('home_score', null)
    .lt('scheduled_at', new Date().toISOString());
  console.log(`Restoring ${broken?.length || 0} remaining NHL games via NHL.com`);

  let restored = 0, notFound = 0;
  for (const f of (broken || [])) {
    const homeAbbr = idToAbbr[f.home_team_id];
    const awayAbbr = idToAbbr[f.away_team_id];
    // Try scheduled_at date, and date -1 day
    const baseDate = new Date(f.scheduled_at);
    const datesToTry = [
      baseDate.toISOString().slice(0, 10),
      new Date(baseDate.getTime() - 86400000).toISOString().slice(0, 10),
    ];
    let found = null;
    for (const d of datesToTry) {
      const games = await nhlFetch(d);
      for (const g of games) {
        if (g.homeTeam?.abbrev === homeAbbr && g.awayTeam?.abbrev === awayAbbr) {
          found = g;
          break;
        }
      }
      if (found) break;
    }
    if (found) {
      const homeScore = found.homeTeam?.score;
      const awayScore = found.awayTeam?.score;
      await supabase.from('fixtures').update({
        status: 'completed',
        home_score: homeScore,
        away_score: awayScore,
        game_data: { ...(found), nhl_game_id: found.gamePk || found.id },
        updated_at: new Date().toISOString(),
      }).eq('id', f.id);
      console.log(`  ${f.scheduled_at.slice(0,16)} ${awayAbbr}@${homeAbbr}: restored ${awayScore}-${homeScore}`);
      restored++;
    } else {
      console.log(`  ${f.scheduled_at.slice(0,16)} ${awayAbbr}@${homeAbbr}: NOT FOUND on NHL.com`);
      notFound++;
    }
  }
  console.log(`\nRestored: ${restored}, Not found: ${notFound}`);
}

main().catch(e => { console.error(e); process.exit(1); });
