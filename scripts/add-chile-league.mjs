import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: lr, error: le } = await s.from('leagues').upsert({
  name: 'Liga Hockey Chile',
  slug: 'liga-hockey-chile',
  description: 'Liga Hockey Chile is the national ice hockey competition in Chile, organized by the Federación Deportiva de Hockey sobre Hielo y en Línea de Chile.',
  country: 'Chile',
  level: 'amateur',
  website_url: 'https://www.chilenationalicehockey.com',
  is_active: true,
}, { onConflict: 'slug' }).select('id');
if (le) { console.error('Error:', le); process.exit(1); }
const leagueId = lr[0].id;
console.log('Created Liga Hockey Chile:', leagueId);

const teams = ['Red Star','Black Star','Siberianos','Serena del Fuego','Drakons','Kotaix','Los Dominicos','Green Wheels'];
for (const t of teams) {
  const slug = 'chile-' + t.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const { error: te } = await s.from('teams').upsert({
    name: t, slug, country: 'Chile', league_id: leagueId, is_active: true,
  }, { onConflict: 'slug' });
  if (te) console.error('Team error', t, te);
}
console.log('Chile teams added');

// Verify
const { data: v } = await s.from('leagues').select('country');
const { data: vt } = await s.from('teams').select('country');
const regionLabels = new Set(['Asia','Europe','USA/Canada','International','Canada/USA','North America']);
const lc = new Set((v||[]).map(r=>r.country).filter(c => !regionLabels.has(c)));
const tc = new Set((vt||[]).map(r=>r.country).filter(c => !regionLabels.has(c)));
console.log(`Now: ${lc.size} countries with leagues, ${tc.size} with teams`);
