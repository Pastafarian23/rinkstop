import './load-secrets.mjs';
// Apply migration via Supabase Management API
import { readFileSync } from 'node:fs';
const sql = readFileSync('supabase/migrations/2026-06-11_iihf_national_teams.sql', 'utf-8');

const res = await fetch(`https://api.supabase.com/v1/projects/yszheonqyyskkjoxoexk/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.SUPABASE_MANAGEMENT_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});
const text = await res.text();
console.log('Status:', res.status);
console.log(text.slice(0, 2000));
