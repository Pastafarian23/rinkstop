import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const tables = ['iihf_member_nations','national_teams'];
for (const t of tables) {
  const { data, error } = await s.from(t).select('*', { count: 'exact', head: true });
  if (error) console.log(`${t}: ERROR ${error.message}`);
  else console.log(`${t}: ${data === null ? 'exists' : data}`);
}
