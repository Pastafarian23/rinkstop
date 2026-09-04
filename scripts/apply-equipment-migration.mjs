import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const envPath = join(ROOT, '.env');
if (!existsSync(envPath)) { console.error('Missing .env'); process.exit(1); }

const envContent = readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const PAT = process.env.SUPABASE_MANAGEMENT_PAT;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!PAT) { console.error('SUPABASE_MANAGEMENT_PAT missing'); process.exit(1); }
if (!SUPABASE_URL) { console.error('NEXT_PUBLIC_SUPABASE_URL missing'); process.exit(1); }

const projectId = SUPABASE_URL.match(/\/\/([^.]+)\.supabase\.co/)?.[1];
const migrationFile = join(ROOT, 'supabase', 'migrations', '2026-09-04_equipment_and_rentals.sql');
const sql = readFileSync(migrationFile, 'utf8');

console.log(`Applying ${migrationFile}`);
console.log(`Project: ${projectId}`);
console.log(`SQL size: ${sql.length} bytes`);

const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${PAT}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

console.log('HTTP status:', res.status);
const text = await res.text();
console.log(text.slice(0, 4000));
if (res.status >= 400) process.exit(1);
console.log('OK');
