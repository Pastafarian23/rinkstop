require('./load-secrets.cjs');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}` };
const MAP = {'ø':'o','æ':'ae','Æ':'AE','Ø':'O','đ':'d','Đ':'D','ß':'ss','œ':'oe','Œ':'OE'};
const fold = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[øæÆØđĐßœŒ]/g, m=>MAP[m]).replace(/[^a-zA-Z0-9-]/g,'-').replace(/-+/g,'-').toLowerCase();
const fetchAll = async (t, sel) => {
  const out = []; let off = 0;
  while (true) {
    const r = await fetch(`${url}/rest/v1/${t}?select=${sel}&limit=1000&offset=${off}`, { headers: H });
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    out.push(...rows); off += 1000;
    if (rows.length < 1000) break;
  }
  return out;
};
(async () => {
  for (const [table, base] of [['team_workspaces','teams'],['rinks','rinks'],['leagues','leagues']]) {
    const rows = await fetchAll(table, 'id,slug');
    const accented = rows.filter(x => x.slug && fold(x.slug) !== x.slug);
    console.log(`\n=== ${table}: ${rows.length} total, ${accented.length} accented ===`);
    const live = new Set(rows.map(x=>x.slug));
    const map = new Map(); let coll = 0;
    for (const a of accented) {
      const f = fold(a.slug);
      if (live.has(f)) { coll++; console.log('  SKIP (folded = live team):', f); continue; }
      if (map.has(f)) { coll++; console.log('  SKIP fold-collision:', f); continue; }
      map.set(f, a.slug);
    }
    console.log(`  aliases: ${map.size} (skipped ${coll})`);
    require('node:fs').writeFileSync(`/tmp/ascii-alias-${base}.json`, JSON.stringify([...map].map(([from_slug,to_slug])=>({from_slug,to_slug})), null, 1));
  }
})();
