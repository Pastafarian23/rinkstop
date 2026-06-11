require('./load-secrets.cjs');
// Find the correct URL slug for each of the top 10 teams on collegehockeyinc.com
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Top 10 by missing count
  const teamNames = [
    'Air Force Falcons',
    'Canisius Golden Griffins',
    'Niagara Purple Eagles',
    'UMass Lowell  River Hawks',
    'Bowling Green Falcons',
    'Colgate Raiders',
    'Merrimack Warriors',
    'Princeton Tigers',
    'Yale Bulldogs',
    'Ferris State Bulldogs'
  ];

  console.log('Teams to scrape (top 10 by missing count):');
  for (const n of teamNames) console.log(`  - ${n}`);

  // Now we need to know each team's URL slug on collegehockeyinc.com
  // The pattern is /teams/{slug}/roster25.php
  // Search for the link in the NCAA teams listing
  const r = await fetch('https://collegehockeyinc.com/mens-teams-and-conferences/');
  const html = await r.text();
  // Extract all /teams/.../index.php links
  const links = html.match(/\/teams\/[a-z0-9-]+\/index\.php/g) || [];
  console.log('\nFound team links on the NCAA teams page:');
  const uniqueLinks = [...new Set(links)].sort();
  for (const l of uniqueLinks) console.log(' ', l);

  // Try to match each team to a slug
  const slugMap = {
    'Air Force Falcons': 'air-force',
    'Canisius Golden Griffins': 'canisius',
    'Niagara Purple Eagles': 'niagara',
    'UMass Lowell  River Hawks': 'umass-lowell',
    'Bowling Green Falcons': 'bowling-green',
    'Colgate Raiders': 'colgate',
    'Merrimack Warriors': 'merrimack',
    'Princeton Tigers': 'princeton',
    'Yale Bulldogs': 'yale',
    'Ferris State Bulldogs': 'ferris-state'
  };

  console.log('\nProposed slugs (educated guesses — need to verify by checking each):');
  for (const [name, slug] of Object.entries(slugMap)) {
    console.log(`  ${name.padEnd(35)} -> ${slug}`);
  }
})();
