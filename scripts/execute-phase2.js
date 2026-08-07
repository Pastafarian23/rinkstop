require('./load-secrets.cjs');
// Execute Phase 2 migration via Supabase RPC
// Runs each SQL block as a separate query
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SQL = fs.readFileSync('sql/phase2-migration.sql', 'utf8');

(async () => {
  // Supabase REST query endpoint (db query API) — sends raw SQL
  // Endpoint: POST /rest/v1/rpc/<fn> OR POST /v1/query on management API
  // We use management API: api.supabase.com/v1/projects/{ref}/database/query
  const ref = 'yszheonqyyskkjoxoexk';
  const managementToken = 'sbp_personal_access_token_here'; // TODO

  // Actually, we need to use the Supabase management API with a PAT
  // Without that, we use the pg_query approach via REST.
  // Let me try the management API first.
  console.log('Will use management API with PAT...');

  // First check if we have a stored PAT
  let pat = null;
  try {
    const creds = JSON.parse(fs.readFileSync('.env', 'utf8'));
    pat = creds.pat;
  } catch (e) {
    console.log('No supabase.json credentials file');
  }

  if (!pat) {
    console.log('No management PAT stored. Cannot run raw SQL via REST.');
    console.log('Will execute individual UPDATEs via PostgREST instead.');
    return;
  }

  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: SQL })
  });

  console.log('Response status:', r.status);
  const text = await r.text();
  console.log('Response:', text.slice(0, 2000));
})();
