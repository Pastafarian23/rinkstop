require('./load-secrets.cjs');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}` };
const MAP = {'ø':'o','æ':'ae','Æ':'AE','Ø':'O','đ':'d','Đ':'D','ß':'ss','œ':'oe','Œ':'OE'};
const fold = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[øæÆØđĐßœŒ]/g, m=>MAP[m]).replace(/[^a-zA-Z0-9-]/g,'-').replace(/-+/g,'-').toLowerCase();
const q = async (t, sel) => {
  const r = await fetch(`${url}/rest/v1/${t}?select=${sel}&limit=5000`, { headers: H });
  if (!r.ok) { console.error(t, r.status); return []; }
  return r.json();
};
(async () => {
  const sets = [['team_workspaces','teams'],['rinks','rinks'],['leagues','leagues']];
  const totals = {};
  for (const [table, base] of sets) {
    const rows = await q(table, 'slug');
    const accented = rows.filter(r => r.slug && fold(r.slug) !== r.slug);
    console.log(`\n=== ${table}: ${rows.length} rows / ${accented.length} accented slugs ===`);
    let n404 = 0; const samples = [];
    for (const r of accented) {
      const f = fold(r.slug);
      if (f === r.slug) continue;
      const res = await fetch(`https://rinkstop.com/directory/${base}/${encodeURIComponent(f)}`, { redirect: 'manual' });
      if (res.status === 404) { n404++; if (samples.length < 10) samples.push(`  404 /directory/${base}/${f}  <- "${r.slug}"`); }
    }
    samples.forEach(s => console.log(s));
    console.log(`  => ${n404} folded-ASCII 404s`);
    totals[table] = n404;
  }
  console.log('\nTOTAL:', JSON.stringify(totals), '=', Object.values(totals).reduce((a,b)=>a+b,0));
})();
