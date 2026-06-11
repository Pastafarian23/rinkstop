require('./load-secrets.cjs');
// Check current state of nhl_players table
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env (NOT .env.local)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}
console.log('Env URL prefix:', (process.env.NEXT_PUBLIC_SUPABASE_URL || '').slice(0, 30));
console.log('Service role key prefix:', (process.env.SUPABASE_SERVICE_ROLE_KEY || '').slice(0, 20));

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Total count
  const { count: total, error: e1 } = await supabaseAdmin
    .from('nhl_players')
    .select('*', { count: 'exact', head: true });
  console.log('Total NHL players:', total);

  // Check if any are populated at all
  const { count: populated } = await supabaseAdmin
    .from('nhl_players')
    .select('*', { count: 'exact', head: true })
    .not('position', 'is', null);
  console.log('Players with position populated:', populated);

  // Get list of all player IDs
  console.log('Fetching all player IDs...');
  const allIds = [];
  let from = 0;
  const batch = 1000;
  while (true) {
    const { data } = await supabaseAdmin
      .from('nhl_players')
      .select('id, full_name')
      .range(from, from + batch - 1);
    if (!data || data.length === 0) break;
    for (const r of data) allIds.push({ id: r.id, name: r.full_name });
    if (data.length < batch) break;
    from += batch;
  }
  console.log('Total IDs fetched:', allIds.length);
  console.log('First 3:', allIds.slice(0, 3));
  fs.writeFileSync('/tmp/nhl-player-ids.json', JSON.stringify(allIds));
  console.log('Saved to /tmp/nhl-player-ids.json');
})();
