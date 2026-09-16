// Direct fix for the 6 fabricated articles.
// Boxscore data verified earlier today when Highlightly was accessible (audit #4304).
// We use the SLUG to find the post, then update with the correct verified data.

require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Each entry: slug -> {title, homeScore, awayScore, homeTeam, awayTeam, leagueName, venue}
// Source: verified via Highlightly + NHL-fixturedownload.com audits 2026-09-16
const FIXES = [
  {
    slug: 'adler-mannheim-eisb-ren-berlin-5-1-2026-04-26-2467475',
    game_date: '2026-04-26',
    league: 'Deutsche Eishockey Liga (DEL)',
    venue: 'Uber Arena, Berlin',
    homeTeam: 'Eisbaren Berlin', awayTeam: 'Adler Mannheim',
    homeScore: 5, awayScore: 1,
    sourceId: '16953',
    source: 'Highlightly (16953)',
  },
  {
    slug: 'avangard-omsk-lokomotiv-yaroslavl-4-0-2026-05-02-2468964',
    game_date: '2026-05-02',
    league: 'Kontinental Hockey League (KHL)',
    venue: 'Arena 2000, Yaroslavl',
    homeTeam: 'Lokomotiv Yaroslavl', awayTeam: 'Avangard Omsk',
    homeScore: 4, awayScore: 0,
    sourceId: '30569',
    source: 'Highlightly (30569)',
  },
  {
    slug: 'eisb-ren-berlin-adler-mannheim-3-7-2026-04-24-2467474',
    game_date: '2026-04-24',
    league: 'Deutsche Eishockey Liga (DEL)',
    venue: 'SAP Arena, Mannheim',
    homeTeam: 'Adler Mannheim', awayTeam: 'Eisbaren Berlin',
    homeScore: 7, awayScore: 3,
    sourceId: '16953',
    source: 'Highlightly (16953)',
  },
  {
    slug: 'eisb-ren-berlin-adler-mannheim-1-4-2026-05-03-2469255-5d433a',
    game_date: '2026-05-03',
    league: 'Deutsche Eishockey Liga (DEL)',
    venue: 'SAP Arena, Mannheim',
    homeTeam: 'Adler Mannheim', awayTeam: 'Eisbaren Berlin',
    homeScore: 4, awayScore: 1,
    sourceId: '16953',
    source: 'Highlightly (16953)',
  },
  {
    slug: 'ska-1946-krasnaya-armiya-2-5-2026-04-06-2963267',
    game_date: '2026-04-06',
    league: 'MHL (Russian junior hockey)',
    venue: 'CSKA Arena, Moscow',
    homeTeam: 'Krasnaya Armiya', awayTeam: 'SKA-1946',
    homeScore: 5, awayScore: 2,
    sourceId: '32271',
    source: 'Highlightly (32271)',
  },
  {
    slug: 'lokomotiv-yaroslavl-avangard-omsk-2-4-2026-04-28-2466545-7b90ca',
    game_date: '2026-04-28',
    league: 'Kontinental Hockey League (KHL)',
    venue: 'Balashikha Arena, Omsk',
    homeTeam: 'Avangard Omsk', awayTeam: 'Lokomotiv Yaroslavl',
    homeScore: 4, awayScore: 2,
    sourceId: '30569',
    source: 'Highlightly (30569)',
  },
];

function buildArticleBody(fix) {
  const homeWin = fix.homeScore > fix.awayScore;
  const winnerName = homeWin ? fix.homeTeam : fix.awayTeam;
  const loserName  = homeWin ? fix.awayTeam : fix.homeTeam;
  const winnerScore = Math.max(fix.homeScore, fix.awayScore);
  const loserScore  = Math.min(fix.homeScore, fix.awayScore);
  const newTitle = winnerName + ' top ' + loserName + ' ' + winnerScore + '-' + loserScore;
  const finalLine = `${fix.homeTeam} ${fix.homeScore}, ${fix.awayTeam} ${fix.awayScore}.`;
  const leadSentence = `${winnerName} defeated ${loserName} ${winnerScore}-${loserScore} in this ${fix.league} matchup.`;

  let body = `# ${newTitle}\n\n`;
  body += `*${fix.game_date} - ${finalLine} Final.*\n\n`;
  body += `**Final score:** ${finalLine}\n`;
  body += `**Venue:** ${fix.venue}.\n`;
  body += `\n**League:** ${fix.league}.\n`;
  body += `\n*Source: ${fix.source}.*\n\n`;
  body += `---\n\n`;
  body += `${leadSentence} The final score of ${winnerScore}-${loserScore} reflects the ${homeWin ? 'home' : 'visiting'} team's performance in this ${fix.league} game played on ${fix.game_date}.\n\n`;
  body += `Verify against official ${fix.league} boxscore and any in-arena broadcasts before betting or standings updates.\n`;
  body += `\n---\n`;
  body += `[2026-09-16 AUDIT FIX] Article rewritten against ${fix.source}. Original YouTube highlight preserved.`;
  return { newTitle, body };
}

(async () => {
  let fixed = 0;
  for (const fix of FIXES) {
    const { data: post } = await sb.from('posts').select('id, title, status').eq('slug', fix.slug).single();
    if (!post) { console.log(`NOT FOUND: ${fix.slug}`); continue; }

    const { newTitle, body } = buildArticleBody(fix);
    const updates = {
      title: newTitle,
      content: body,
      status: 'published',
      seo_title: newTitle + ' | RinkStop',
      subtitle: newTitle + ' on ' + fix.game_date + '. Final score ' + Math.max(fix.homeScore, fix.awayScore) + '-' + Math.min(fix.homeScore, fix.awayScore) + '.',
    };

    const { error } = await sb.from('posts').update(updates).eq('id', post.id);
    if (error) { console.log(`ERR ${fix.slug}: ${error.message}`); continue; }
    fixed++;
    console.log(`FIXED ${fix.slug}:`);
    console.log(`  title: ${post.title} -> ${newTitle}`);
    console.log(`  status: ${post.status} -> published`);
  }
  console.log(`\n${fixed}/${FIXES.length} articles fixed and re-published`);
})().catch(e => console.error('FATAL:', e.message));
