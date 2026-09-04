import { readFileSync } from 'node:fs';
const sql = readFileSync('/root/.openclaw/workspace/rinkstop-platform/supabase/migrations/2026-09-04_posts_disable_autolink.sql', 'utf-8');
const res = await fetch('https://api.supabase.com/v1/projects/yszheonqyyskkjoxoexk/database/query', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.SUPABASE_MANAGEMENT_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});
console.log('Status:', res.status);
console.log((await res.text()).slice(0, 1000));
