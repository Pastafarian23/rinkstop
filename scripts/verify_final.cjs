#!/usr/bin/env node
require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const eastern16 = ['Boston Bruins','Buffalo Sabres','Florida Panthers','Montréal Canadiens','Ottawa Senators','Tampa Bay Lightning','Toronto Maple Leafs','Carolina Hurricanes','Columbus Blue Jackets','New Jersey Devils','New York Islanders','New York Rangers','Philadelphia Flyers','Pittsburgh Penguins','Washington Capitals'];
  let allOk = true;
  for (const season of ['2025', '2026', '2027']) {
    const { data, count, error } = await sb
      .from('highlightly_standings')
      .select('team_name,points,wins,losses,overtime_losses,played', { count: 'exact' })
      .eq('league_name', 'NHL')
      .eq('season', season)
      .order('points', { ascending: false });

    if (error) { console.error(`Season ${season}: ${error.message}`); allOk = false; continue; }
    const names = data.map(r => r.team_name);
    const nameCount = {};
    for (const n of names) nameCount[n] = (nameCount[n] || 0) + 1;
    const dups = Object.entries(nameCount).filter(([, c]) => c > 1).map(([n]) => n);
    const eastMissing = eastern16.filter(e => !names.includes(e));

    // Spot-check math on first 5 teams
    const mathErrors = [];
    for (const r of data.slice(0, 5)) {
      const GP = r.played, W = r.wins, L = r.losses, OTL = r.overtime_losses ?? 0, PTS = r.points;
      if (W + L + OTL !== GP) mathErrors.push(`${r.team_name}: GP(${GP}) != W(${W})+L(${L})+OTL(${OTL})`);
      if (2 * W + OTL !== PTS) mathErrors.push(`${r.team_name}: PTS(${PTS}) != 2*W(${W})+OTL(${OTL})`);
    }

    const status = (dups.length === 0 && eastMissing.length === 0 && mathErrors.length === 0) ? '✓' : '✗';
    console.log(`Season=${season}: ${status} ${count} rows, ${Object.keys(nameCount).length} distinct${dups.length ? ' [DUP: ' + dups.join(',') + ']' : ''}${eastMissing.length ? ' [East missing: ' + eastMissing.join(', ') + ']' : ''}`);
    if (mathErrors.length) mathErrors.forEach(e => console.log(`  MATH ERR: ${e}`));
    if (dups.length || eastMissing.length || mathErrors.length) allOk = false;
  }
  console.log(allOk ? '\nAll checks passed ✓' : '\nSome checks failed ✗');
}
main().catch(e => { console.error(e.message); process.exit(1); });