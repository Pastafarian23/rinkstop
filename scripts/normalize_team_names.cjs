#!/usr/bin/env node
/**
 * scripts/normalize_team_names.cjs
 *
 * Fix team_name values in 2025-26 that have orphaned rank prefixes like "– ", "x – ", "e – ".
 * The Wikipedia ingest sometimes leaves these when the prefix tag was outside
 * the <a> tag in the source HTML.
 *
 * Strategy: re-run the same `cleanTeamName` logic the ingest uses, then
 * update the team_name in place. Primary key stays the same (cleanTeamName
 * is deterministic).
 */
require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Same regex as standings_wiki.cjs
const cleanTeamName = (raw) => {
  let n = String(raw || '');
  // Match single-letter prefix (x, y, z, e) with dash, OR orphaned dash
  n = n.replace(/^[a-z][, –\-]+/gi, '').trim();
  n = n.replace(/^[–\-]\s+/, '').trim();
  n = n.replace(/\s*\([A-Z]{2,4}\)\s*$/, '').trim();
  return n;
};

async function main() {
  const SEASON = '2026';
  const leagues = ['AHL', 'ECHL', 'OHL', 'WHL', 'QMJHL', 'USHL', 'NCAA'];

  let totalUpdated = 0;
  for (const lg of leagues) {
    const { data } = await sb
      .from('highlightly_standings')
      .select('id, team_name')
      .eq('league_name', lg)
      .eq('season', SEASON);

    const updates = [];
    for (const r of data) {
      const cleaned = cleanTeamName(r.team_name);
      if (cleaned !== r.team_name && cleaned.length > 0) {
        updates.push({ id: r.id, team_name: cleaned });
      }
    }
    if (updates.length === 0) {
      console.log(`${lg}: 0 to update`);
      continue;
    }
    console.log(`${lg}: updating ${updates.length} team_name values`);
    // Update each row
    for (const u of updates) {
      const { error } = await sb
        .from('highlightly_standings')
        .update({ team_name: u.team_name })
        .eq('id', u.id);
      if (error) console.error(`  ${u.id}: ${error.message}`);
    }
    totalUpdated += updates.length;
  }

  console.log(`\nTotal updated: ${totalUpdated}`);
}
main().catch(e => { console.error(e.message); process.exit(1); });