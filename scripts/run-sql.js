require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sql = process.argv[2] || '';
const sqlFromFile = process.argv[3];
const text = sqlFromFile ? fs.readFileSync(sqlFromFile, 'utf8') : sql;
(async () => {
  const { data, error } = await supabase.rpc('exec_sql', { sql: text });
  if (error) console.log('Error:', error.message);
  else console.log('OK:', data);
})();
