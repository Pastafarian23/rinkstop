#!/usr/bin/env node
require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const leagues = ['NHL', 'AHL', 'ECHL', 'OHL', 'WHL', 'QMJHL', 'USHL', 'NCAA'];
  for (const lg of leagues) {
    const { data } = await sb
      .from('highlightly_standings')
      .select('team_name, points, played, wins, losses, overtime_losses, season')
      .eq('league_name', lg)
      .order('season');
    const bySeason = {};
    for (const r of data) {
      if (!bySeason[r.season]) bySeason[r.season] = [];
      bySeason[r.season].push(r.team_name);
    }
    const seasons = Object.keys(bySeason).sort();
    const summary = seasons.map(s => {
      const names = bySeason[s];
      const distinct = new Set(names);
      const dupCount = names.length - distinct.size;
      return `${s}=${distinct.size}${dupCount > 0 ? `[${dupCount}DUP]` : ''}`;
    }).join(', ');
    console.log(`${lg.padEnd(6)} | total=${data.length} | ${summary}`);
    const prefixed = data.filter(r => /^[–\-\s]*[xyze][–\-\s]|^[–\-]\s/i.test(r.team_name || ''));
    if (prefixed.length) {
      console.log(`  WARNING: ${prefixed.length} prefixed names remain:`, prefixed.slice(0, 3).map(r => r.team_name));
    }
  }
})();