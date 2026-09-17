#!/usr/bin/env node
/**
 * Pre-check: identify any slug collisions between deprecated and canonical
 * league teams. If a team in the deprecated league has the same slug as
 * a team in the canonical league, the UPDATE will fail (UNIQUE constraint
 * on teams.slug).
 *
 * Outputs the conflicting teams so we can decide:
 * - rename the deprecated one before rerouting, or
 * - skip / merge teams, or
 * - investigate whether the teams are actually duplicates
 */
require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const PAIRS = [
  { name: 'khl',    depSlug: 'khl-russia',                       canonSlug: 'khl' },
  { name: 'liiga',  depSlug: 'liiga-finland',                    canonSlug: 'liiga' },
  { name: 'asia',  depSlug: 'asia-league-ice-hockey-world',     canonSlug: 'asia-league-ice-hockey' },
];

(async () => {
  for (const p of PAIRS) {
    console.log(`\n=== ${p.name} ===`);
    const { data: dep } = await sb.from('leagues').select('id').eq('slug', p.depSlug).maybeSingle();
    const { data: canon } = await sb.from('leagues').select('id').eq('slug', p.canonSlug).maybeSingle();
    if (!dep || !canon) { console.log('  leagues not found'); continue; }

    const { data: depTeams } = await sb.from('teams').select('id, slug, name').eq('league_id', dep.id);
    const { data: canonTeams } = await sb.from('teams').select('id, slug, name').eq('league_id', canon.id);
    const canonSlugs = new Set((canonTeams || []).map(t => t.slug));

    const conflicts = (depTeams || []).filter(t => canonSlugs.has(t.slug));
    if (conflicts.length === 0) {
      console.log(`  ✓ no slug conflicts (${depTeams.length} deprecated teams will move cleanly)`);
    } else {
      console.log(`  ✗ ${conflicts.length} slug conflicts — must rename before reroute:`);
      for (const c of conflicts) {
        console.log(`    dep: ${c.slug} → "${c.name}" (id=${c.id.slice(0,8)})`);
        const canonTeam = canonTeams.find(t => t.slug === c.slug);
        if (canonTeam) console.log(`    canon: ${canonTeam.slug} → "${canonTeam.name}" (id=${canonTeam.id.slice(0,8)})`);
      }
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
