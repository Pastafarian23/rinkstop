// Link NO_TEAM articles to existing team IDs in DB
require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Title → { home_team_name, away_team_name }
const MATCHES = [
  { title: 'Adler Mannheim top Eisbären Berlin 5-1', date: '2026-04-26', home: 'Adler Mannheim', away: 'Eisbären Berlin' },
  { title: 'Adler Mannheim top Eisbären Berlin 7-3', date: '2026-04-24', home: 'Adler Mannheim', away: 'Eisbären Berlin' },
  { title: 'Kölner Haie top Eisbären Berlin 4-1', date: '2026-04-20', home: 'Kölner Haie', away: 'Eisbären Berlin' },
  { title: 'Adler Mannheim top Eisbären Berlin 5-1', date: '2026-04-28', home: 'Adler Mannheim', away: 'Eisbären Berlin' },
  { title: 'Adler Mannheim top Eisbären Berlin 4-1', date: '2026-05-03', home: 'Adler Mannheim', away: 'Eisbären Berlin' },
  { title: 'Adler Mannheim top Eisbären Berlin 4-1', date: '2026-05-03', home: 'Adler Mannheim', away: 'Eisbären Berlin' },
  { title: 'Adler Mannheim top Eisbären Berlin 5-1', date: '2026-04-26', home: 'Adler Mannheim', away: 'Eisbären Berlin' },
  { title: 'Eisbären Berlin top Adler Mannheim 4-3', date: '2026-04-30', home: 'Eisbären Berlin', away: 'Adler Mannheim' },
  { title: 'Växjö Lakers top Rögle BK 4-1', date: '2026-04-14', home: 'Växjö Lakers', away: 'Rögle BK' },
  { title: 'Skellefteå AIK top Luleå HF 3-2', date: '2026-04-13', home: 'Skellefteå AIK', away: 'Luleå HF' },
  { title: 'Växjö Lakers top Rögle BK 3-2', date: '2026-04-16', home: 'Växjö Lakers', away: 'Rögle BK' },
  { title: 'Lokomotiv top Avangard 4-3 in OT', date: '2026-05-05', home: 'Lokomotiv Yaroslavl', away: 'Avangard Omsk' },
  { title: 'Rögle BK top Skellefteå AIK 4-1', date: '2026-04-23', home: 'Rögle BK', away: 'Skellefteå AIK' },
  // Add more as needed
];

(async () => {
  // Find team IDs
  const allNames = [...new Set(MATCHES.flatMap(m => [m.home, m.away]))];
  const { data: teams } = await sb.from('teams').select('id, name').in('name', allNames);
  const teamByName = {};
  for (const t of teams || []) teamByName[t.name] = t.id;
  console.log('Found teams:', Object.keys(teamByName));

  // Find posts by title + date
  for (const m of MATCHES) {
    const { data: posts } = await sb
      .from('posts')
      .select('id, title, game_date')
      .ilike('title', `%${m.home}%`)
      .ilike('title', `%${m.away}%`)
      .eq('game_date', m.date);
    
    if (posts && posts.length > 0) {
      const p = posts[0];
      const homeId = teamByName[m.home];
      const awayId = teamByName[m.away];
      if (homeId && awayId) {
        const { error } = await sb.from('posts').update({ team_home_id: homeId, team_away_id: awayId }).eq('id', p.id);
        if (!error) console.log(`✓ ${p.title} → linked ${m.home} vs ${m.away}`);
        else console.log(`✗ ${p.title}: ${error.message}`);
      } else {
        console.log(`✗ ${p.title}: missing team IDs (home=${!!homeId}, away=${!!awayId})`);
      }
    } else {
      console.log(`? Not found: ${m.home} vs ${m.away} on ${m.date}`);
    }
  }
})().catch(e => console.error(e.message));