// Live verification — resolve historical names for known dates and team-page lookups.
// Run: npx tsx scripts/_test-franchise-name-lookup.ts

import { displayNameForGame, historicalAliasLabel } from '../src/lib/franchise-name-lookup';

let pass = 0;
let fail = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : `\n   ${detail}`}`);
  if (ok) pass++;
  else fail++;
}

// === 1. Date-aware lookups (game pages) ===
const dateCases: Array<[string, string, string]> = [
  ['utah-hockey-club', '1997-01-15', 'Phoenix Coyotes (now Utah Mammoth)'],
  ['utah-hockey-club', '2009-04-10', 'Phoenix Coyotes (now Utah Mammoth)'],
  ['utah-hockey-club', '2017-03-20', 'Arizona Coyotes (now Utah Mammoth)'],
  ['utah-hockey-club', '2024-10-10', 'Utah Hockey Club (now Utah Mammoth)'],
  ['utah-hockey-club', '2025-10-10', 'Utah Mammoth'],
  ['utah-mammoth', '2025-10-10', 'Utah Mammoth'],
  ['utah-mammoth', '2024-10-10', 'Utah Hockey Club (now Utah Mammoth)'],
  ['carolina-hurricanes', '1985-04-10', 'Hartford Whalers (now Carolina Hurricanes)'],
  ['carolina-hurricanes', '1975-01-15', 'New England Whalers (now Carolina Hurricanes)'],
  ['carolina-hurricanes', '2009-04-10', 'Carolina Hurricanes'],
  ['colorado-avalanche', '1993-04-10', 'Quebec Nordiques (now Colorado Avalanche)'],
  ['winnipeg-jets', '2005-11-15', 'Atlanta Thrashers (now Winnipeg Jets)'],
  ['winnipeg-jets', '2015-04-10', 'Winnipeg Jets'],
  ['dallas-stars', '1985-04-10', 'Minnesota North Stars (now Dallas Stars)'],
  ['calgary-flames', '1978-11-15', 'Atlanta Flames (now Calgary Flames)'],
  ['new-jersey-devils', '1980-04-10', 'Colorado Rockies (now New Jersey Devils)'],
  ['new-jersey-devils', '1975-04-10', 'Kansas City Scouts (now New Jersey Devils)'],
  ['boston-bruins', '1985-04-10', 'Boston Bruins'],
  ['toronto-maple-leafs', '2000-04-10', 'Toronto Maple Leafs'],
];

console.log('--- date-aware lookups (game pages) ---');
for (const [slug, date, expected] of dateCases) {
  const got = historicalAliasLabel(slug, date) ?? displayNameForGame(slug, date).display;
  check(
    `${slug} @ ${date}`,
    got === expected,
    `got "${got}" expected "${expected}"`,
  );
}

// === 2. No-date lookups (team pages) ===
// For these, we want: display = the entry's actual name, isHistorical = true if not current,
// currentSlug = the chain's current team.
const noDateCases: Array<[string, string, boolean, string]> = [
  ['utah-mammoth', 'Utah Mammoth', false, 'utah-mammoth'],
  ['utah-hockey-club', 'Utah Hockey Club', true, 'utah-mammoth'],
  ['phoenix-coyotes', 'Phoenix Coyotes', true, 'utah-mammoth'],
  ['arizona-coyotes', 'Arizona Coyotes', true, 'utah-mammoth'],
  ['winnipeg-jets-original', 'Winnipeg Jets', true, 'utah-mammoth'],
  ['carolina-hurricanes', 'Carolina Hurricanes', false, 'carolina-hurricanes'],
  ['hartford-whalers', 'Hartford Whalers', true, 'carolina-hurricanes'],
  ['new-england-whalers', 'New England Whalers', true, 'carolina-hurricanes'],
  ['colorado-avalanche', 'Colorado Avalanche', false, 'colorado-avalanche'],
  ['quebec-nordiques', 'Quebec Nordiques', true, 'colorado-avalanche'],
  ['quebec-nordiques-wha', 'Quebec Nordiques', true, 'colorado-avalanche'],
  ['winnipeg-jets', 'Winnipeg Jets', false, 'winnipeg-jets'],
  ['atlanta-thrashers', 'Atlanta Thrashers', true, 'winnipeg-jets'],
  ['dallas-stars', 'Dallas Stars', false, 'dallas-stars'],
  ['minnesota-north-stars', 'Minnesota North Stars', true, 'dallas-stars'],
  ['calgary-flames', 'Calgary Flames', false, 'calgary-flames'],
  ['atlanta-flames', 'Atlanta Flames', true, 'calgary-flames'],
  ['new-jersey-devils', 'New Jersey Devils', false, 'new-jersey-devils'],
  ['colorado-rockies', 'Colorado Rockies', true, 'new-jersey-devils'],
  ['kansas-city-scouts', 'Kansas City Scouts', true, 'new-jersey-devils'],
  ['boston-bruins', 'Boston Bruins', false, 'boston-bruins'],

  // Standalone chains for defunct teams (current = self or the modern successor
  // that absorbed them). isHistorical = true because the franchise is no longer
  // active under that name.
  ['brooklyn-americans', 'Brooklyn Americans', true, 'brooklyn-americans'],
  ['mighty-ducks-of-anaheim', 'Mighty Ducks of Anaheim', true, 'anaheim-ducks'],
  ['california-golden-seals', 'California Golden Seals', true, 'california-golden-seals'],
  ['cleveland-barons', 'Cleveland Barons', true, 'cleveland-barons'],
  ['detroit-cougars', 'Detroit Cougars', true, 'detroit-cougars'],
  ['detroit-falcons', 'Detroit Falcons', true, 'detroit-falcons'],
  ['hamilton-tigers', 'Hamilton Tigers', true, 'hamilton-tigers'],
  ['montreal-maroons', 'Montreal Maroons', true, 'montreal-maroons'],
  ['montreal-wanderers', 'Montreal Wanderers', true, 'montreal-wanderers'],
  ['new-york-americans', 'New York Americans', true, 'new-york-americans'],
  ['ottawa-senators-original', 'Ottawa Senators', true, 'ottawa-senators-original'],
  ['philadelphia-quakers', 'Philadelphia Quakers', true, 'philadelphia-quakers'],
  ['pittsburgh-pirates', 'Pittsburgh Pirates', true, 'philadelphia-quakers'],
  ['quebec-bulldogs', 'Quebec Bulldogs', true, 'quebec-bulldogs'],
  ['st-louis-eagles', 'St. Louis Eagles', true, 'st-louis-eagles'],
  ['toronto-arenas', 'Toronto Arenas', true, 'toronto-arenas'],
  ['toronto-st-patricks', 'Toronto St. Patricks', true, 'toronto-maple-leafs'],
  ['winnipeg-jets-whl', 'Winnipeg Jets', true, 'winnipeg-jets-whl'],
];

console.log('\n--- no-date lookups (team pages) ---');
for (const [slug, expDisplay, expHist, expCurrent] of noDateCases) {
  const d = displayNameForGame(slug, null);
  const ok = d.display === expDisplay && d.isHistorical === expHist && d.currentSlug === expCurrent;
  check(
    `${slug} -> ${expDisplay} (${expHist ? 'historical' : 'current'})`,
    ok,
    `got display="${d.display}" historical=${d.isHistorical} current=${d.currentSlug}`,
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);