// Test: do DB Air Force player names match ANY of these public sources?
// Sources: collegehockeyinc.com/roster25.php, hockeydb.com/0005582025.html, goairforcefalcons.com/roster/2024-25
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 1. Get DB Air Force names
  const r = await supabase.from('nhl_players')
    .select('id,full_name,first_name,last_name')
    .eq('current_team_name', 'Air Force Falcons')
    .eq('league_name', 'NCAA')
    .order('full_name');
  const dbNames = (r.data || []).map(p => p.full_name);
  console.log(`DB Air Force: ${dbNames.length} players`);
  for (const n of dbNames) console.log(`  ${n}`);

  // 2. Get public Air Force 2024-25 names (from the search result, copy-paste for now)
  // These are all the names that appear in hockeydb.com/0005582025.html and collegehockeyinc.com/teams/air-force/roster25.php
  // (the search result snippets confirm they match each other)
  const publicNames2025 = [
    'Guy Blessing', 'Beau Janzig', 'Ren Morque', 'Will Jones', 'Anthony Yu',
    'Jake Peterson', 'Ethan Ullrick', 'Austin Schwartz', 'Sam Jacobs', 'James Callahan',
    'Mason McCormick', 'Will Dawson', 'Owen Dubois', 'Michael Kadlecik', 'Holt Oliphant',
    'Nolan Cunningham', 'Chris Hedden', 'Nick Sajevic', 'Clayton Cosentino', 'Sam Stitz',
    'Mitchell Digby', 'Jasper Lester', 'Dominik Wasik', 'Carter Clafton', 'Toby Hopp',
    'Will Staring', 'Nick Remissong', 'Brendan Gibbons', 'Andrew DeCarlo'
  ];

  // 3. Get public Air Force 2025-26 names (from the earlier roster26.php fetch)
  const publicNames2026 = [
    'Guy Blessing', 'Jasper Lester', 'Brendan Gibbons', 'Will Staring', 'Holt Oliphant',
    'Mason McCormick', 'Austin Schwartz', 'Owen Dubois', 'Nolan Cunningham', 'Mitchell Digby',
    'Michael Kadlecik', 'Sam Jacobs', 'Carter Clafton', 'Chris Hedden', 'James Callahan',
    'Andrew DeCarlo', 'Beau Janzig', 'Ren Morque', 'Nick Sajevic', 'Will Dawson',
    'Jake Peterson', 'Dominik Wasik', 'Nick Remissong', 'Sam Stitz', 'Toby Hopp',
    'Ethan Ullrick', 'Anthony Yu', 'Will Jones', 'Simon Houge', 'Cole Christian', 'Oliver Genest'
  ];

  // 4. Try matching DB names against public 2024-25 and 2025-26 rosters
  console.log(`\nPublic 2024-25: ${publicNames2025.length} players`);
  console.log(`Public 2025-26: ${publicNames2026.length} players`);

  const match2425 = dbNames.filter(n => publicNames2025.some(p => p.toLowerCase() === n.toLowerCase()));
  const match2526 = dbNames.filter(n => publicNames2026.some(p => p.toLowerCase() === n.toLowerCase()));
  const matchEither = dbNames.filter(n =>
    publicNames2025.some(p => p.toLowerCase() === n.toLowerCase()) ||
    publicNames2026.some(p => p.toLowerCase() === n.toLowerCase())
  );

  console.log(`\nMatches: 2024-25 only = ${match2425.length}, 2025-26 only = ${match2526.length}, either = ${matchEither.length}, neither = ${dbNames.length - matchEither.length}`);

  const unmatched = dbNames.filter(n => !matchEither.includes(n));
  console.log(`\nUnmatched (${unmatched.length}):`);
  for (const n of unmatched) console.log(`  ${n}`);
})();
