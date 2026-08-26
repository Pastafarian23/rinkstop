import './load-secrets.mjs';
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/migrations/2026-08-25_booking_payment_columns.sql', 'utf-8');

// Try with SUPABASE_MANAGEMENT_TOKEN from env or credentials
const mgmtToken = process.env.SUPABASE_MANAGEMENT_TOKEN;

if (!mgmtToken) {
  console.log('No SUPABASE_MANAGEMENT_TOKEN in env, trying service role key...');
  // Try service role key directly
  const res = await fetch(`https://api.supabase.com/v1/projects/yszheonqyyskkjoxoexk/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log(text.slice(0, 2000));
} else {
  const res = await fetch(`https://api.supabase.com/v1/projects/yszheonqyyskkjoxoexk/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mgmtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log(text.slice(0, 2000));
}
