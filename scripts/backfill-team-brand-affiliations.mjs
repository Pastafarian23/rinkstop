// Backfill teams.brand_id based on known NHL equipment suppliers.
// AHL teams inherit equipment from their NHL parent clubs, so this gives
// 32 of the 32 AHL teams a brand assignment.
//
// Source: public knowledge of 2024-25 NHL/AHL equipment sponsors. If any
// team switches brand, run this script after the change.
//
// Future: extend to NHL (32 teams), ECHL (28), PWHL (6), etc.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// AHL teams → their NHL parent club's equipment sponsor (2024-25 season).
// Teams without an entry are NOT backfilled.
const AHL_TEAM_BRAND = {
  'Bakersfield Condors': 'Bauer',         // Edmonton Oilers affiliate
  'Belleville Senators': 'CCM',            // Ottawa Senators affiliate
  'Calgary Wranglers': 'Bauer',            // Calgary Flames affiliate
  'Charlotte Checkers': 'Bauer',           // Florida Panthers affiliate
  'Chicago Wolves': 'Bauer',               // Carolina Hurricanes affiliate
  'Cleveland Monsters': 'Bauer',           // Columbus Blue Jackets affiliate
  'Coachella Valley Firebirds': 'Bauer',   // Seattle Kraken affiliate
  'Colorado Eagles': 'Bauer',              // Colorado Avalanche affiliate
  'Grand Rapids Griffins': 'Bauer',        // Detroit Red Wings affiliate
  'Hartford Wolf Pack': 'Bauer',           // New York Rangers affiliate
  'Henderson Silver Knights': 'Bauer',     // Vegas Golden Knights affiliate
  'Hershey Bears': 'Bauer',                // Washington Capitals affiliate
  'Iowa Wild': 'Bauer',                    // Minnesota Wild affiliate
  'Laval Rocket': 'Bauer',                 // Montreal Canadiens affiliate
  'Lehigh Valley Phantoms': 'Bauer',       // Philadelphia Flyers affiliate
  'Manitoba Moose': 'Bauer',              // Winnipeg Jets affiliate
  'Milwaukee Admirals': 'CCM',             // Nashville Predators affiliate
  'Ontario Reign': 'Bauer',               // Los Angeles Kings affiliate
  'Providence Bruins': 'Bauer',            // Boston Bruins affiliate
  'Rochester Americans': 'Bauer',          // Buffalo Sabres affiliate
  'Rockford IceHogs': 'CCM',               // Chicago Blackhawks affiliate
  'San Diego Gulls': 'Bauer',              // Anaheim Ducks affiliate
  'San Jose Barracuda': 'Bauer',           // San Jose Sharks affiliate
  'Springfield Thunderbirds': 'Bauer',     // St. Louis Blues affiliate
  'Syracuse Crunch': 'Bauer',              // Tampa Bay Lightning affiliate
  'Texas Stars': 'Bauer',                  // Dallas Stars affiliate
  'Toronto Marlies': 'Bauer',              // Toronto Maple Leafs affiliate
  'Tucson Roadrunners': 'Bauer',           // Utah Hockey Club affiliate
  'Utica Comets': 'Bauer',                 // New Jersey Devils affiliate
  'Wilkes-Barre/Scranton Penguins': 'Bauer', // Pittsburgh Penguins affiliate
  'Abbotsford Canucks': 'Bauer',           // Vancouver Canucks affiliate
  'Bridgeport Islanders': 'CCM',            // New York Islanders affiliate
};

// Get the AHL league ID
const { data: ahlLeague } = await supabase
  .from('leagues')
  .select('id, name')
  .ilike('name', '%American Hockey League%')
  .maybeSingle();

if (!ahlLeague) {
  console.log('❌ AHL league not found');
  process.exit(1);
}

console.log(`AHL league: ${ahlLeague.name} (${ahlLeague.id})`);

// Get all AHL teams
const { data: ahlTeams, error } = await supabase
  .from('teams')
  .select('id, name, city')
  .eq('league_id', ahlLeague.id);

if (error) {
  console.log('❌ Error fetching AHL teams:', error.message);
  process.exit(1);
}

console.log(`Found ${ahlTeams.length} AHL teams in DB`);

// Get brand IDs
const { data: brands } = await supabase
  .from('brands')
  .select('id, name, slug');

const brandByName = new Map();
(brands || []).forEach(b => brandByName.set(b.name, b));

const stats = { applied: 0, skipped: 0, unmapped: 0 };

for (const team of ahlTeams || []) {
  const brandName = AHL_TEAM_BRAND[team.name];
  if (!brandName) {
    console.log(`  ⚠️ No mapping for: ${team.name}`);
    stats.unmapped++;
    continue;
  }
  const brand = brandByName.get(brandName);
  if (!brand) {
    console.log(`  ❌ Brand not found: ${brandName}`);
    stats.skipped++;
    continue;
  }
  const { error: uerr } = await supabase
    .from('teams')
    .update({ brand_id: brand.id, updated_at: new Date().toISOString() })
    .eq('id', team.id);
  if (uerr) {
    console.log(`  ❌ ${team.name}: ${uerr.message}`);
    stats.skipped++;
  } else {
    stats.applied++;
  }
}

console.log(`\n=== Backfill complete ===`);
console.log(`Applied: ${stats.applied}`);
console.log(`Skipped: ${stats.skipped}`);
console.log(`Unmapped: ${stats.unmapped}`);

// Verify
const { data: bauTeams } = await supabase
  .from('teams')
  .select('id, name, brand_id')
  .not('brand_id', 'is', null);

const { data: brandMap } = await supabase
  .from('brands')
  .select('id, name, slug')
  .in('id', [...new Set((bauTeams || []).map(t => t.brand_id))]);

console.log(`\n=== Verification: teams with brand_id ===`);
const brandById = new Map();
(brandMap || []).forEach(b => brandById.set(b.id, b));
const byBrand = {};
(bauTeams || []).forEach(t => {
  const b = brandById.get(t.brand_id);
  if (b) byBrand[b.name] = (byBrand[b.name] || 0) + 1;
});
console.log(JSON.stringify(byBrand, null, 2));
