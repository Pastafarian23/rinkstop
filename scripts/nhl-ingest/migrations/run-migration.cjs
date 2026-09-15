require('../../load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const fs = require('node:fs');
const path = require('node:path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const migrationFile = process.argv[2] || '001_ingest_audit_tables.sql';
  const sqlPath = path.join(__dirname, '001_ingest_audit_tables.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log(`[migration] Running: ${migrationFile}`);
  console.log(`[migration] File size: ${sql.length} chars`);

  // Split into statements and run one by one
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`[migration] ${statements.length} statements`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt) continue;
    console.log(`[migration] stmt ${i + 1}/${statements.length}: ${stmt.slice(0, 80)}...`);
    const { error } = await supabase.rpc('exec', { query: stmt }).catch(async () => {
      // Try via postgrest raw
      return { error: { message: 'rpc not available' } };
    });
    if (error) {
      console.error(`[migration] ERROR on stmt ${i + 1}: ${error.message}`);
      // Try via direct SQL endpoint
      const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Prefer': 'return=minimal'
        },
        body: stmt
      });
      if (!r.ok && r.status !== 201 && r.status !== 204) {
        console.error(`[migration] direct SQL also failed: ${r.status} ${await r.text().catch(() => '')}`);
      }
    }
  }
  console.log('[migration] Done');
}
main().catch(e => console.error(e.message));
