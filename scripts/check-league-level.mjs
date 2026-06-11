import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: l } = await s.from('leagues').select('level').not('level','is',null);
const counts = {};
(l||[]).forEach(r => { counts[r.level] = (counts[r.level]||0)+1 });
console.log('Existing levels in DB:', counts);
