// scripts/apply-ws17-pr1-migration.mjs
// Apply WS17 PR1 migration to dev DB via Supabase Management API.
//
// Usage:
//   node scripts/apply-ws17-pr1-migration.mjs
//
// Prerequisites:
//   - SUPABASE_MANAGEMENT_PAT in .env (Supabase account-level PAT)
//   - .env contains NEXT_PUBLIC_SUPABASE_URL pointing at the dev project

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const envPath = join(ROOT, '.env');
if (!existsSync(envPath)) {
  console.error('Missing .env at', envPath);
  process.exit(1);
}

const envContent = readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const PAT = process.env.SUPABASE_MANAGEMENT_PAT;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!PAT) {
  console.error('SUPABASE_MANAGEMENT_PAT missing from .env');
  process.exit(1);
}
if (!SUPABASE_URL) {
  console.error('NEXT_PUBLIC_SUPABASE_URL missing from .env');
  process.exit(1);
}

const projectId = SUPABASE_URL.match(/\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectId) {
  console.error('Could not extract project id from', SUPABASE_URL);
  process.exit(1);
}

const migrationFile = join(ROOT, 'supabase', 'migrations', '2026-08-04_rink_programming_and_events.sql');
const sql = readFileSync(migrationFile, 'utf8');

console.log(`Applying ${migrationFile} to project ${projectId}`);
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
