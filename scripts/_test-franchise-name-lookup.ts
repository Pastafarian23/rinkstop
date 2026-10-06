// Live verification — resolve historical names for known dates.
// Run: npx tsx scripts/_test-franchise-name-lookup.ts

import { displayNameForGame, historicalAliasLabel } from '../src/lib/franchise-name-lookup';

const cases: Array<[string, string, string]> = [
  ['utah-hockey-club', '1997-01-15', 'Phoenix Coyotes (now Utah Hockey Club)'],
  ['utah-hockey-club', '2009-04-10', 'Phoenix Coyotes (now Utah Hockey Club)'],
  ['utah-hockey-club', '2017-03-20', 'Arizona Coyotes (now Utah Hockey Club)'],
  ['utah-hockey-club', '2025-10-10', 'Utah Hockey Club'],
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

let pass = 0, fail = 0;
for (const [slug, date, expected] of cases) {
  const got = historicalAliasLabel(slug, date) ?? displayNameForGame(slug, date).display;
  const ok = got === expected;
  console.log(`${ok ? '✓' : '✗'} ${slug} @ ${date} → "${got}"${ok ? '' : ` (expected "${expected}")`}`);
  if (ok) pass++; else fail++;
}
console.log(`\n${pass}/${cases.length} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);