#!/usr/bin/env node
// Find duplicate league rows in the DB.
// Usage: node scripts/_dup_leagues.cjs
require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(s) {
  if (!s) return '';
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

(async () => {
  // Fetch all leagues (with pagination)
  const all = [];
  let off = 0;
  while (true) {
    const { data } = await sb.from('leagues').select('id, name, slug, is_active').range(off, off + 999);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    off += data.length;
  }
  console.log(`Total leagues: ${all.length}`);

  // Group by normalized name
  const groups = new Map();
  for (const l of all) {
    const n = normalize(l.name);
    if (!groups.has(n)) groups.set(n, []);
    groups.get(n).push(l);
  }

  console.log('\n=== Duplicate name groups ===');
  for (const [n, items] of [...groups.entries()].sort()) {
    if (items.length < 2) continue;
    console.log(`\nNormalized: "${n}"`);
    for (const l of items) {
      const { count } = await sb.from('fixtures').select('id', { count: 'exact', head: true }).eq('league_id', l.id);
      console.log(`  id=${l.id.slice(0,8)} slug=${(l.slug||'').padEnd(30)} name="${l.name}" active=${l.is_active} fixtures=${count || 0}`);
    }
  }

  // Slug collisions
  const slugGroups = new Map();
  for (const l of all) {
    const s = l.slug || '';
    if (!slugGroups.has(s)) slugGroups.set(s, []);
    slugGroups.get(s).push(l);
  }
  console.log('\n=== Duplicate slug groups ===');
  for (const [s, items] of slugGroups.entries()) {
    if (items.length < 2) continue;
    console.log(`  slug="${s}":`, items.map(i => `${i.id.slice(0,8)}=${i.name}`).join(', '));
  }
})().catch(e => { console.error(e); process.exit(1); });
