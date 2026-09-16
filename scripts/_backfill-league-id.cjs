// Backfill league_id for posts where it's NULL but team_home_id has a known league.
// Updates posts.league_id to match the team's league.

require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Find all posts with NULL league_id but team_home_id set
  console.log('Finding posts with NULL league_id...');
  const { data: nullPosts, error } = await sb
    .from('posts')
    .select('id, slug, title, team_home_id, team_away_id')
    .not('highlight_id', 'is', null)
    .is('league_id', null)
    .not('team_home_id', 'is', null);
  if (error) { console.error(error); return; }
  console.log(`Found ${nullPosts.length} posts with NULL league_id but team_home_id set`);

  // Build team lookup
  const teamIds = [...new Set([
    ...nullPosts.map(p => p.team_home_id),
    ...nullPosts.map(p => p.team_away_id),
  ].filter(Boolean))];
  console.log(`Distinct team IDs: ${teamIds.length}`);

  const teamLookup = {};
  for (let i = 0; i < teamIds.length; i += 50) {
    const batch = teamIds.slice(i, i + 50);
    const { data: teams } = await sb.from('teams').select('id, name, league_id, leagues(name, slug)').in('id', batch);
    for (const t of (teams || [])) {
      teamLookup[t.id] = { name: t.name, league_id: t.league_id, league_name: t.leagues?.name };
    }
  }

  // Group by inferred league
  const byLeague = {};
  const teamless = [];
  for (const p of nullPosts) {
    const t = teamLookup[p.team_home_id];
    if (t?.league_id) {
      const lid = t.league_id;
      if (!byLeague[lid]) byLeague[lid] = { count: 0, posts: [] };
      byLeague[lid].count++;
      byLeague[lid].posts.push(p);
    } else {
      teamless.push(p);
    }
  }

  console.log('\n=== Inferred leagues ===');
  for (const [lid, info] of Object.entries(byLeague)) {
    console.log(`  ${lid}: ${info.count} articles (${teamLookup[byLeague[lid].posts[0].team_home_id]?.league_name || '?'})`);
  }
  console.log(`\nNO_TEAM (no team data): ${teamless.length}`);

  // Update each post's league_id
  console.log('\nUpdating posts.league_id...');
  let updated = 0;
  for (const [lid, info] of Object.entries(byLeague)) {
    for (const p of info.posts) {
      const { error: upErr } = await sb.from('posts').update({ league_id: lid }).eq('id', p.id);
      if (!upErr) updated++;
      else console.error(`  ERR ${p.slug}: ${upErr.message}`);
    }
  }
  console.log(`Updated ${updated} posts with backfilled league_id`);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
