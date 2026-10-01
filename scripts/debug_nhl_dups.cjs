#!/usr/bin/env node
require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Get ALL NHL rows, check for duplicates by team_name per season
  const { data, error } = await sb
    .from('highlightly_standings')
    .select('id,team_name,season,points,wins')
    .eq('league_name', 'NHL')
    .order('season');

  if (error) { console.error(error.message); return; }

  // Group by season
  const bySeason = {};
  for (const r of data) {
    if (!bySeason[r.season]) bySeason[r.season] = [];
    bySeason[r.season].push(r);
  }

  for (const [sz, rows] of Object.entries(bySeason)) {
    console.log(`\n=== Season=${sz} (${rows.length} rows) ===`);
    const byName = {};
    for (const r of rows) {
      if (!byName[r.team_name]) byName[r.team_name] = [];
      byName[r.team_name].push(r);
    }
    // Show duplicates
    const dups = Object.entries(byName).filter(([, v]) => v.length > 1);
    if (dups.length) {
      console.log(`DUPLICATES (${dups.length} teams):`);
      for (const [name, rows] of dups) {
        console.log(`  ${name}:`);
        for (const r of rows) {
          console.log(`    id=${r.id} pts=${r.points} W=${r.wins}`);
        }
      }
    } else {
      console.log('No duplicates');
    }
    // Show missing eastern
    const eastern = ['Boston Bruins','Buffalo Sabres','Florida Panthers','Montreal Canadiens','Ottawa Senators','Tampa Bay Lightning','Toronto Maple Leafs','Carolina Hurricanes','Columbus Blue Jackets','New Jersey Devils','New York Islanders','New York Rangers','Philadelphia Flyers','Pittsburgh Penguins','Washington Capitals'];
    const present = Object.keys(byName);
    const missing = eastern.filter(e => !present.includes(e));
    console.log(`Eastern missing: ${missing.join(', ') || 'none'}`);
    console.log(`Total: ${rows.length} rows, ${Object.keys(byName).length} distinct teams`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });