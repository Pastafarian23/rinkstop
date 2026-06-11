import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: t1 } = await s.from('teams').select('*').limit(1);
console.log('Teams columns:', t1 && t1[0] ? Object.keys(t1[0]).join(', ') : 'empty');
const { data: l1 } = await s.from('leagues').select('*').limit(1);
console.log('Leagues columns:', l1 && l1[0] ? Object.keys(l1[0]).join(', ') : 'empty');
