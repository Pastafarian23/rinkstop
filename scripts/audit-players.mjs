import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { count: totalPlayers } = await s.from('players').select('*', { count: 'exact', head: true });
console.log('Total players in DB:', totalPlayers);

const { data: pSample } = await s.from('players').select('*').limit(3);
console.log('Sample player rows:');
(pSample||[]).forEach(p => console.log('  ', Object.keys(p).join(','), '\n  ', JSON.stringify(p).slice(0,300)));

// What fields are in the players table?
const { data: p1 } = await s.from('players').select('*').limit(1);
const keys = p1 && p1[0] ? Object.keys(p1[0]) : [];
console.log('\nPlayers table columns:', keys.join(', '));

// How many have nationality = one of 60+ IIHF country codes?
const { data: natCounts } = await s.from('players').select('nationality');
const ncounts = {};
(natCounts||[]).forEach(r=>{ncounts[r.nationality]=(ncounts[r.nationality]||0)+1});
console.log('\nNationality counts (top 20):');
Object.entries(ncounts).filter(([k])=>k).sort((a,b)=>b[1]-a[1]).slice(0,20).forEach(([k,v])=>console.log(`  ${k}: ${v}`));
console.log('Distinct nationalities:', Object.keys(ncounts).filter(k=>k).length);
