// Link highlight_backups → posts by (home_team_name, away_team_name, game_date).
// Uses Highlightly's `match.homeTeam.name` vs posts.title for matching.
// Skips highlights without a matching post to avoid noisy links.

require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = require('@supabase/supabase-js').createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Normalize a team name for matching.
//   - lowercase
//   - strip diacritics
//   - collapse whitespace
//   - strip common suffixes (Winnipeg Jets → Winnipeg)
function norm(s) {
  if (!s) return '';
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Normalize a date to YYYY-MM-DD string.
function normDate(s) {
  if (!s) return '';
  return s.slice(0, 10);
}

(async () => {
  console.log('Step 1: Loading highlights...');
  let off = 0;
  const allHl = [];
  while (true) {
    const { data } = await sb.from('highlight_backups')
      .select('id, home_team_name, away_team_name, match_date')
      .is('post_id', null) // only unlinked
      .range(off, off + 999);
    if (!data || data.length === 0) break;
    allHl.push(...data);
    off += data.length;
    if (data.length < 1000) break;
  }
  console.log('Unlinked highlights:', allHl.length);

  console.log('Step 2: Loading posts grouped by (norm_home, norm_away, date)...');
  const { data: posts } = await sb.from('posts')
    .select('id, title, game_date')
    .not('highlight_id', 'is', null);
  console.log('Posts:', posts.length);
  const postByKey = {};
  for (const p of posts) {
    const date = normDate(p.game_date);
    if (!date) continue;
    // Try every (home,away) combination from the title.
    const t = p.title || '';
    // Pattern: "<TeamA> top <TeamB> <score>"
    let m = t.match(/^(.+?)\s+(?:top|defeat|beat|edge|down)\s+(.+?)\s+\d+[-\u2013]\d+/i);
    if (!m) {
      // Pattern: "<TeamA> vs <TeamB>"
      m = t.match(/^(.+?)\s+(?:vs\.?|versus)\s+(.+)/i);
    }
    if (!m) continue;
    const h = norm(m[1]);
    const a = norm(m[2]);
    if (!h || !a) continue;
    const k1 = `${h}|${a}|${date}`;
    const k2 = `${a}|${h}|${date}`; // swapped
    if (!postByKey[k1] && !postByKey[k2]) postByKey[k1] = p.id;
  }
  console.log('Unique post keys built:', Object.keys(postByKey).length);

  console.log('Step 3: Linking highlights...');
  let linked = 0, unmatched = 0;
  let batch = [];
  for (const h of allHl) {
    const date = normDate(h.match_date);
    const hn = norm(h.home_team_name);
    const an = norm(h.away_team_name);
    if (!date || !hn || !an) { unmatched++; continue; }
    const k1 = `${hn}|${an}|${date}`;
    const k2 = `${an}|${hn}|${date}`;
    const postId = postByKey[k1] || postByKey[k2];
    if (!postId) { unmatched++; continue; }
    batch.push({ id: h.id, post_id: postId, post_link_method: 'name+date' });
    if (batch.length >= 200) {
      // Flush batch using a single SQL upsert via upsert API
      await sb.from('highlight_backups').upsert(batch, { onConflict: 'id' });
      linked += batch.length;
      batch = [];
      process.stdout.write('.');
    }
  }
  if (batch.length > 0) {
    await sb.from('highlight_backups').upsert(batch, { onConflict: 'id' });
    linked += batch.length;
    process.stdout.write('.');
  }
  console.log();

  console.log('\n=== RESULTS ===');
  console.log('linked:    ' + linked);
  console.log('unmatched: ' + unmatched);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
