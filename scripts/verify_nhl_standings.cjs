#!/usr/bin/env node
require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const eastern = [
    'Boston Bruins','Buffalo Sabres','Florida Panthers','Montreal Canadiens',
    'Ottawa Senators','Tampa Bay Lightning','Toronto Maple Leafs',
    'Carolina Hurricanes','Columbus Blue Jackets','New Jersey Devils',
    'New York Islanders','New York Rangers','Philadelphia Flyers',
    'Pittsburgh Penguins','Washington Capitals',
  ];

  const western = [
    'Colorado Avalanche','Dallas Stars','Minnesota Wild','Nashville Predators',
    'St. Louis Blues','Utah Hockey Club','Winnipeg Jets','Chicago Blackhawks',
    'Anaheim Ducks','Calgary Flames','Edmonton Oilers','Los Angeles Kings',
    'San Jose Sharks','Seattle Kraken','Vegas Golden Knights','Vancouver Canucks',
  ];

  for (const season of ['2025', '2026', '2027']) {
    const { data, count, error } = await sb
      .from('highlightly_standings')
      .select('team_name,points,wins,losses,season', { count: 'exact' })
      .eq('league_name', 'NHL')
      .eq('season', season);

    if (error) { console.error(`Season ${season}: ERROR ${error.message}`); continue; }
    if (!data) { console.log(`Season ${season}: no data`); continue; }

    const names = data.map(r => r.team_name);
    const eastFound = names.filter(n => eastern.includes(n));
    const westFound = names.filter(n => western.includes(n));
    const top3 = [...data].sort((a,b) => b.points - a.points).slice(0,3);

    console.log(`\n=== NHL season=${season} (${count} teams) ===`);
    console.log(`Eastern: ${eastFound.length}/16 — ${eastFound.length < 16 ? 'MISSING: ' + eastern.filter(e => !eastFound.includes(e)).join(', ') : '✓'}`);
    console.log(`Western: ${westFound.length}/16`);
    console.log(`Top 3: ${top3.map(r => r.team_name + ' P=' + r.points).join(', ')}`);
  }

  // Also check total rows per league
  const { count: total } = await sb
    .from('highlightly_standings')
    .select('*', { count: 'exact', head: true })
    .eq('league_name', 'NHL');
  console.log(`\nTotal NHL rows in DB: ${total}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });