import './load-secrets.mjs';
// Apply a single migration file via Supabase Management API
import { createClient } from '@supabase/supabase-js';

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.log('Usage: node apply-migration.mjs <sql-file>');
  process.exit(1);
}

import { readFile } from 'fs/promises';
const sql = await readFile(sqlFile, 'utf-8');

// Supabase Management API: POST /v1/projects/{ref}/database/query
// The PAT (Personal Access Token) is stored in credentials/supabase.json
import { readFile as rf } from 'fs/promises';
const creds = JSON.parse(await rf('/root/.openclaw/credentials/supabase.json', 'utf-8'));
const pat = creds.pat;
const ref = 'yszheonqyyskkjoxoexk'; // from SUPABASE URL

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${pat}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

const result = await res.json();
console.log('Status:', res.status);
console.log('Result:', JSON.stringify(result, null, 2).substring(0, 2000));
