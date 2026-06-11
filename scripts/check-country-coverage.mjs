import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Counts per country from each table
const tables = ['rinks','teams','leagues','players'];
const out = {};
for (const tbl of tables) {
  const { data } = await supabase.from(tbl).select('country').not('country','is',null);
  const c = {};
  (data||[]).forEach(r=>{c[r.country]=(c[r.country]||0)+1});
  for (const [k,v] of Object.entries(c)) out[k] = out[k] || {};
  for (const [k,v] of Object.entries(c)) out[k][tbl] = v;
}

// Build CSV-style report
const allCountries = Object.keys(out).sort();
console.log('COUNTRY'.padEnd(25), 'RINKS'.padStart(7), 'TEAMS'.padStart(7), 'LEAGUES'.padStart(9), 'PLAYERS'.padStart(9));
for (const c of allCountries) {
  const r = out[c];
  console.log(
    c.padEnd(25),
    String(r.rinks||0).padStart(7),
    String(r.teams||0).padStart(7),
    String(r.leagues||0).padStart(9),
    String(r.players||0).padStart(9)
  );
}

// Countries with IIHF member status but ZERO coverage anywhere
const { data: iihfMembers } = await supabase.from('iihf_member_nations').select('country_name');
console.log('\n--- IIHF members in DB:', (iihfMembers||[]).length);
