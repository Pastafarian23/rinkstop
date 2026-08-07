import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  const env = await import('fs').then(fs => fs.readFileSync('.env', 'utf8'));
  const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim();
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || get('NEXT_PUBLIC_SUPABASE_URL');
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || get('SUPABASE_SERVICE_ROLE_KEY');
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
for (const { table, col } of [
  { table: 'rinks', col: 'created_at' },
  { table: 'team_workspaces', col: 'created_at' },
  { table: 'players', col: 'created_at' },
  { table: 'posts', col: 'created_at' },
  { table: 'posts', col: 'country_slug' },
]) {
  const { error } = await supabase.from(table).select(col).limit(1);
  console.log(`${table}.${col}: ${error ? 'MISSING (' + error.message.split('\n')[0] + ')' : 'EXISTS'}`);
}
