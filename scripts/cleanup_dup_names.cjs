#!/usr/bin/env node
/**
 * scripts/cleanup_dup_names.cjs
 *
 * Issue: Wikipedia team names sometimes include rank prefixes (e.g. "x – ", "e – ", "y – ", "z – ")
 * OUTSIDE the <a> tag, so cleanTeamName was leaving the prefix in some old rows.
 * This left rows like "e– Tucson Roadrunners" alongside "Tucson Roadrunners" — same team, different IDs.
 *
 * Fix: find rows in 2025-26 where the team_name starts with a rank-prefix
 * marker followed by a space + space + another team_name that exists in the
 * same (league, season). Delete the prefixed row (the unprefixed one is canonical).
 */
require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SEASON = '2026';

async function main() {
  const leagues = ['AHL', 'ECHL', 'OHL', 'WHL', 'QMJHL', 'USHL', 'NCAA'];

  for (const lg of leagues) {
    const { data, error } = await sb
      .from('highlightly_standings')
      .select('id, team_name, points')
      .eq('league_name', lg)
      .eq('season', SEASON);

    if (error) { console.error(`${lg}: ${error.message}`); continue; }
    if (!data) continue;

    // Build set of clean names + list of prefixed names
    const cleanNames = new Set();
    const prefixed = [];
    // Match any of: x/y/z/e prefix + dash + space, OR just a dash (orphaned prefix)
    const stripPrefix = (n) => String(n || '').replace(/^\s*(?:[xyze]\s*|–\s*)+/i, '').trim();
    for (const r of data) {
      const n = String(r.team_name || '').trim();
      const stripped = stripPrefix(n);
      if (stripped !== n && stripped.length > 0) {
        prefixed.push({ ...r, _stripped: stripped });
      } else {
        cleanNames.add(n);
      }
    }

    const toDelete = [];
    for (const r of prefixed) {
      if (cleanNames.has(r._stripped)) toDelete.push(r);
    }

    if (toDelete.length === 0) {
      console.log(`${lg}: 0 to delete`);
      continue;
    }
    console.log(`${lg}: deleting ${toDelete.length} duplicate rows (prefixed):`);
    for (const r of toDelete.slice(0, 5)) console.log(`  ${r.id}  ${r.team_name}  P=${r.points}`);
    if (toDelete.length > 5) console.log(`  ... +${toDelete.length - 5} more`);

    // Delete in batches of 100
    const ids = toDelete.map(r => r.id);
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { error: delErr } = await sb.from('highlightly_standings').delete().in('id', chunk);
      if (delErr) { console.error(`  delete error: ${delErr.message}`); break; }
    }
  }

  // Final verification
  console.log('\n=== Post-cleanup counts ===');
  for (const lg of ['NHL', 'AHL', 'ECHL', 'OHL', 'WHL', 'QMJHL', 'USHL', 'NCAA']) {
    const { count } = await sb.from('highlightly_standings').select('*', { count: 'exact', head: true }).eq('league_name', lg).eq('season', SEASON);
    console.log(`  ${lg}: ${count} teams`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });