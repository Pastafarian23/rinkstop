import './load-secrets.mjs';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const members = JSON.parse(readFileSync('/tmp/iihf-seed-members.json', 'utf-8'));
const teams = JSON.parse(readFileSync('/tmp/iihf-seed-teams.json', 'utf-8'));

console.log(`Inserting ${members.length} IIHF members...`);
const { data: m1, error: e1 } = await s.from('iihf_member_nations').upsert(members, { onConflict: 'country' });
if (e1) { console.error('Members error:', e1); process.exit(1); }
console.log('  ✓ members inserted');

console.log(`Inserting ${teams.length} national teams...`);
const { data: m2, error: e2 } = await s.from('national_teams').upsert(teams, { onConflict: 'country,team_type' });
if (e2) { console.error('Teams error:', e2); process.exit(1); }
console.log('  ✓ teams inserted');

// Verify
const { count: cn } = await s.from('iihf_member_nations').select('*', { count: 'exact', head: true });
const { count: ct } = await s.from('national_teams').select('*', { count: 'exact', head: true });
console.log(`\nVerification: iihf_member_nations=${cn}, national_teams=${ct}`);

// Sample 5 countries with their team counts
const { data: samp } = await s.from('iihf_member_nations').select('country, iihf_status, mens_ranking, womens_ranking').in('country', ['Sweden','Bahrain','United States','Argentina','Mexico']);
console.log('\nSample members:');
(samp||[]).forEach(m => console.log(`  ${m.country} (${m.iihf_status}): M#${m.mens_ranking ?? '—'} W#${m.womens_ranking ?? '—'}`));
