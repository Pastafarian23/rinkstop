import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Does iihf_member_nations table exist? What tables have "nation" or "iihf" in name?
console.log('--- IIHF/National table check ---');
for (const t of ['iihf_member_nations','national_teams','iihf_rankings','nations']) {
  const { data, error } = await s.from(t).select('*', { count: 'exact', head: true });
  console.log(`${t}: ${error ? error.message : data}`);
}

// 2. Total distinct countries with rinks
const { data: rinkCountries } = await s.from('rinks').select('country').eq('is_active', true);
const rc = new Set((rinkCountries||[]).map(r=>r.country).filter(Boolean));
console.log('\nDistinct countries with rinks (active):', rc.size);

// 3. Of those, how many have teams, leagues, players?
const { data: teamCountries } = await s.from('teams').select('country').eq('is_active', true);
const tc = new Set((teamCountries||[]).map(r=>r.country).filter(Boolean));
console.log('Distinct countries with teams (active):', tc.size);

const { data: leagueCountries } = await s.from('leagues').select('country').eq('is_active', true);
const lc = new Set((leagueCountries||[]).map(r=>r.country).filter(Boolean));
console.log('Distinct countries with leagues (active):', lc.size);

// 4. Players table - what does the field look like?
const { data: samplePlayers } = await s.from('players').select('id, first_name, last_name, nationality, country, team_id').limit(3);
console.log('\nSample players:');
(samplePlayers||[]).forEach(p => console.log(' ', JSON.stringify(p)));

// 5. Teams table - sample
const { data: sampleTeams } = await s.from('teams').select('id, name, country, league_id').limit(5);
console.log('\nSample teams:');
(sampleTeams||[]).forEach(t => console.log(' ', JSON.stringify(t)));

// 6. Leagues table - sample
const { data: sampleLeagues } = await s.from('leagues').select('id, name, country, level').limit(5);
console.log('\nSample leagues:');
(sampleLeagues||[]).forEach(l => console.log(' ', JSON.stringify(l)));

// 7. Top 5 countries by rink count
const rk = {};
(rinkCountries||[]).forEach(r => { rk[r.country] = (rk[r.country]||0)+1 });
console.log('\nTop 5 countries by rinks:');
Object.entries(rk).sort((a,b)=>b[1]-a[1]).slice(0,5).forEach(([c,n]) => console.log(`  ${c}: ${n}`));

// 8. Countries with rinks but no teams/leagues (gaps)
const gaps = [...rc].filter(c => !tc.has(c) && !lc.has(c));
console.log('\nCountries with rinks but NO teams AND NO leagues:', gaps.length);
console.log('Examples:', gaps.slice(0,10).join(', '));
