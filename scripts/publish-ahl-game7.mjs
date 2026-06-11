import { createClient } from '@supabase/supabase-js';
// Load env from the Next.js .env file directly (dotenv is not installed in this project).
import { readFileSync } from 'fs';
const env = readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 1) Publish the draft
const { data, error } = await sb
  .from('posts')
  .update({ status: 'published', published_at: new Date().toISOString() })
  .eq('highlight_id', 140924)
  .eq('status', 'draft')
  .select('id, slug, status, published_at, title');

if (error) { console.error('Publish error:', error); process.exit(1); }
if (!data || data.length === 0) { console.log('No draft to publish (already live?)'); process.exit(0); }
const post = data[0];
console.log('✅ Published');
console.log('  id:           ', post.id);
console.log('  slug:         ', post.slug);
console.log('  status:       ', post.status);
console.log('  published_at: ', post.published_at);
console.log('  URL:          ', `https://rinkstop.com/news/${post.slug}`);
