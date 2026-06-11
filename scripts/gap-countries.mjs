import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: rinks } = await s.from('rinks').select('country').eq('is_active', true);
const rc = new Set((rinks||[]).map(r=>r.country).filter(Boolean));
const { data: teams } = await s.from('teams').select('country').eq('is_active', true);
const tc = new Set((teams||[]).map(r=>r.country).filter(Boolean));
const { data: leagues } = await s.from('leagues').select('country').eq('is_active', true);
const lc = new Set((leagues||[]).map(r=>r.country).filter(Boolean));

// Filter out region labels from leagues
const regionLabels = new Set(['Asia','Europe','USA/Canada','International','Canada/USA','North America']);
const realL = new Set([...lc].filter(c => !regionLabels.has(c)));

// 41-country gap: has rinks, no teams, no leagues (after filtering region labels)
const gap = [...rc].filter(c => !tc.has(c) && !realL.has(c)).sort();
console.log('Gap countries (rinks=yes, teams=no, leagues=no):', gap.length);
gap.forEach(c => console.log('  -', c));
