// scripts/apply-nhl-official-standings.mjs
// Apply the nhl_official_standings migration via Supabase Management API.
// One-shot — kept around in case rollback is needed.
import './load-secrets.mjs';
import { readFileSync } from 'node:fs';
const sql = readFileSync('supabase/migrations/2026-10-16_nhl_official_standings.sql', 'utf-8');
const res = await fetch(`https://api.supabase.com/v1/projects/yszheonqyyskkjoxoexk/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.SUPABASE_MANAGEMENT_PAT}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});
const text = await res.text();
console.log('Status:', res.status);
console.log(text.slice(0, 4000));
if (!res.ok) process.exit(1);
