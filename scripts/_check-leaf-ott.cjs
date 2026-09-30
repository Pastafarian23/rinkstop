require('fs').readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
  // First see what columns exist on posts (introspect via select '*' limit 1)
  const { data: sample, error: sampleErr } = await sb.from('posts').select('*').limit(1);
  if (sampleErr) { console.log('sample err:', sampleErr.message); return; }
  if (sample && sample[0]) {
    console.log('POSTS COLUMNS:', Object.keys(sample[0]).join(', '));
  }

  const { data: posts, error } = await sb
    .from('posts')
    .select('id, title, slug, status, game_date, source_url, created_at, updated_at, published_at, scheduled_at, seo_title, subtitle')
    .or('title.ilike.%Maple Leafs%,title.ilike.%Senators%,title.ilike.%Toronto%,title.ilike.%Ottawa%,title.ilike.%leafs%')
    .order('game_date', { ascending: false })
    .limit(20);
  if (error) console.log('posts err:', error.message);
  else {
    console.log('Found', (posts||[]).length, 'posts');
    for (const p of (posts||[])) {
      console.log(JSON.stringify({
        id: p.id, title: p.title, status: p.status, game_date: p.game_date,
        source_url: p.source_url,
        published_at: p.published_at, scheduled_at: p.scheduled_at,
        updated_at: p.updated_at, created_at: p.created_at
      }, null, 2));
    }
  }
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
