import '/root/.openclaw/workspace/rinkstop-platform/scripts/load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await sb.from('rinks').select('slug, notes_generated').in('slug', ['planet-ice-widnes','auchinharvie-leisure-centre','centro-ice-skating-arena']);
for (const r of data||[]) {
  const ng = r.notes_generated||'';
  console.log(r.slug+': '+ng.length+' chars — '+ng.slice(0,80)+'...');
}
