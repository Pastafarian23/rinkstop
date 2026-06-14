// Debug: get the first 3 posts and run getMatchData on each, timing each step.
import { readFileSync, existsSync } from 'fs';

const ENV_FILE = '/root/.openclaw/workspace/rinkstop-platform/.env';
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { getMatchData, normalizeLeague } = await import('./match-data.mjs');

console.log('Fetching first 3 published articles with highlight_id...');
const { data: posts } = await sb
  .from('posts')
  .select('id, highlight_id, title')
  .eq('status', 'published')
  .not('highlight_id', 'is', null)
  .order('published_at', { ascending: false })
  .limit(3);

const hlIds = posts.map(p => p.highlight_id);
const { data: hls } = await sb
  .from('highlight_backups')
  .select('id, home_team_name, away_team_name, match_date, league_name')
  .in('id', hlIds);
const hlMap = new Map((hls || []).map(h => [h.id, h]));

for (const p of posts) {
  const h = hlMap.get(p.highlight_id);
  console.log(`\n--- ${p.title} ---`);
  if (!h) { console.log('no highlight'); continue; }
  const teams = [h.home_team_name, h.away_team_name].filter(Boolean);
  const date = (h.match_date || '').slice(0, 10);
  const league = normalizeLeague(h.league_name);
  console.log('teams:', teams, 'date:', date, 'league:', league);
  const t0 = Date.now();
  try {
    const m = await Promise.race([
      getMatchData({ teams, date, league, apiKey: process.env.HIGHLIGHTLY_API_KEY }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('30s timeout')), 30000)),
    ]);
    console.log(`(${Date.now() - t0}ms) match:`, JSON.stringify(m, null, 2));
  } catch (e) {
    console.log(`(${Date.now() - t0}ms) ERROR:`, e.message);
  }
}
