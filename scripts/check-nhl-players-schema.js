const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  // Get one row to see all keys
  const { data } = await supabase.from('nhl_players').select('*').limit(1);
  console.log('Current columns:', Object.keys(data[0] || {}));
  console.log('Sample row:', JSON.stringify(data[0], null, 2));
})();
