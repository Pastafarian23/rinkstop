// Add post_id column to highlight_backups and backfill via team/date matching.
// Strategy: for each highlight_backups row, find the posts row that matches
// on (team_home_id, team_away_id, match_date). Store found post_id.

require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = require('@supabase/supabase-js').createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Step 1: Add post_id column to highlight_backups (idempotent)
  const PAT = process.env.SUPABASE_MANAGEMENT_PAT;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const projectId = SUPABASE_URL.match(/\/\/([^.]+)\.supabase\.co/)?.[1];

  const alterSql = `
    ALTER TABLE public.highlight_backups
      ADD COLUMN IF NOT EXISTS post_id uuid,
      ADD COLUMN IF NOT EXISTS post_link_method text;
    CREATE INDEX IF NOT EXISTS idx_highlight_backups_post_id
      ON public.highlight_backups(post_id);
  `;

  const res = await fetch('https://api.supabase.com/v1/projects/' + projectId + '/database/query', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: alterSql }),
  });
  console.log('Schema status:', res.status);

  // Step 2: Build highlight → teams lookup from cache
  // Read ALL highlight_backups
  console.log('Step 2: Loading highlight_backups...');
  let off = 0;
  const allHl = [];
  while (true) {
    const { data } = await sb.from('highlight_backups')
      .select('id, home_team_id, away_team_id, match_date')
      .range(off, off + 999);
    if (!data || data.length === 0) break;
    allHl.push(...data);
    off += data.length;
    if (data.length < 1000) break;
  }
  console.log('Highlights total:', allHl.length);

  // Step 3: Build posts lookup grouped by (home_team_id, away_team_id, match_date)
  console.log('Step 3: Loading posts...');
  const allPosts = [];
  off = 0;
  while (true) {
    const { data } = await sb.from('posts')
      .select('id, team_home_id, team_away_id, game_date')
      .not('highlight_id', 'is', null)
      .range(off, off + 999);
    if (!data || data.length === 0) break;
    allPosts.push(...data);
    off += data.length;
    if (data.length < 1000) break;
  }
  console.log('Posts total:', allPosts.length);

  // Build posts-by-key lookup
  const postByKey = {};
  for (const p of allPosts) {
    if (!p.team_home_id || !p.team_away_id || !p.game_date) continue;
    const key = `${p.team_home_id}|${p.team_away_id}|${p.game_date}`;
    if (!postByKey[key]) postByKey[key] = p.id;
  }
  console.log('Unique post keys:', Object.keys(postByKey).length);

  // Step 4: For each highlight, find matching post
  console.log('Step 4: Linking highlights to posts...');
  let linked = 0, unmatched = 0;
  let updates = 0;
  const unmatchedSamples = [];
  const linkMethod = 'team_home+away+date';
  for (const h of allHl) {
    if (!h.home_team_id || !h.away_team_id || !h.match_date) { unmatched++; continue; }
    // Normalize date (highlight match_date might be ISO with time)
    const date = (h.match_date || '').slice(0, 10);
    if (!date) { unmatched++; continue; }
    const key = `${h.home_team_id}|${h.away_team_id}|${date}`;
    const postId = postByKey[key];
    if (!postId) {
      unmatched++;
      if (unmatchedSamples.length < 3) unmatchedSamples.push(h.id);
      continue;
    }
    const { error } = await sb.from('highlight_backups')
      .update({ post_id: postId, post_link_method: linkMethod })
      .eq('id', h.id);
    if (error) {
      console.error('update err for highlight', h.id, ':', error.message);
    } else {
      linked++;
      updates++;
    }
  }

  console.log('\n=== RESULTS ===');
  console.log('linked:    ' + linked);
  console.log('unmatched: ' + unmatched);
  if (unmatchedSamples.length > 0) {
    console.log('Sample unmatched highlight ids:', unmatchedSamples);
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
