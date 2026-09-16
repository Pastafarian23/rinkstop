// Regenerate the 6 fabricated articles with correct scores from Highlightly.
// Per Arnel directive 2026-09-16 07:47 CDT:
// "If you know what information is wrong... and you know what the correct
//  information is, then why aren't you just fixing the article?"

require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const HIGHKEY = process.env.HIGHLIGHTLY_API_KEY;

const HIGHLIGHTLY_LEAGUE_NAMES = {
  '69d4de0c-b072-4f52-8950-eb728acdc7f9': '40781',     // SHL
  '03e919d1-2180-443b-aba4-6719d25d2eff': '16953',     // DEL
  'a08f6dac-eb1f-48b6-a11b-56fbb5642752': '30569',     // KHL
  'e052d66a-6f63-42da-94fc-25a809203c2f': '32271',     // MHL
  '30fef7f6-0054-4605-83b7-ec619b72f328': '31420',     // VHL
  'dead3e40-9f79-4488-a50b-755eb9a8cee0': '51844',     // SPHL
  '1ad37b08-894c-42dd-8583-2247bf927b6c': '32271',     // Friendly Intl proxy
};

async function findHighlightlyMatch(highLid, dateIso, homeHint, awayHint) {
  const dates = [dateIso];
  const baseD = new Date((dateIso || '2026-01-01') + 'T00:00:00Z');
  for (let i = 1; i <= 2; i++) {
    dates.push(new Date(baseD.getTime() + i * 86400000).toISOString().slice(0, 10));
    dates.push(new Date(baseD.getTime() - i * 86400000).toISOString().slice(0, 10));
  }
  for (const d of dates) {
    let j;
    try {
      let r;
      for (let attempt = 0; attempt < 4; attempt++) {
        r = await fetch('https://hockey.highlightly.net/matches?leagueId=' + highLid + '&date=' + d + '&limit=20', {
          headers: { 'x-rapidapi-key': HIGHKEY, 'x-rapidapi-host': 'hockey-highlights-api.p.rapidapi.com' },
        });
        if (r.status === 429) { await new Promise(x => setTimeout(x, 3000 * (attempt + 1))); continue; }
        break;
      }
      if (!r.ok) continue;
      j = await r.json();
      const matches = Array.isArray(j.data) ? j.data : (Array.isArray(j) ? j : []);
      for (const raw of matches) {
        const homeName = raw.home?.name || raw.homeTeam?.name || '';
        const awayName = raw.away?.name || raw.awayTeam?.name || '';
        const scoreRaw = raw.state?.score?.current;
        if (!scoreRaw) continue;
        const parts = scoreRaw.split('-').map(s => parseInt(s.trim(), 10));
        if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) continue;
        const a = homeHint.toLowerCase().split(' ')[0];
        const b = awayHint.toLowerCase().split(' ')[0];
        const directMatch = (homeName.toLowerCase().includes(a) && awayName.toLowerCase().includes(b)) ||
                            (awayName.toLowerCase().includes(a) && homeName.toLowerCase().includes(b));
        if (directMatch) {
          return {
            homeTeamName: homeName, awayTeamName: awayName,
            homeScore: parts[0], awayScore: parts[1], date: d,
          };
        }
      }
    } catch (e) {}
  }
  return null;
}

const VENUE_HINTS = {
  'Adler Mannheim': 'SAP Arena, Mannheim',
  'Eisbaren Berlin': 'Uber Arena, Berlin',
  'Avangard Omsk': 'Balashikha Arena, Omsk',
  'Lokomotiv Yaroslavl': 'Arena 2000, Yaroslavl',
  'Krasnaya Armiya': 'CSKA Arena, Moscow',
  'SKA-1946': 'SKA Arena, Saint Petersburg',
};

const LEAGUE_FULL = {
  '40781': 'Swedish Hockey League (SHL)',
  '16953': 'Deutsche Eishockey Liga (DEL)',
  '30569': 'Kontinental Hockey League (KHL)',
  '32271': 'MHL (Russian junior hockey)',
  '31420': 'VHL (Russian second-tier hockey)',
  '51844': 'SPHL',
};

async function regenerate(slug, dryRun = true) {
  const { data: post } = await sb.from('posts').select('id, title, content, status, game_date, league_id, subtitle, seo_title, og_image_url').eq('slug', slug).single();
  if (!post) return { slug, ok: false, reason: 'no post' };

  const highLid = HIGHLIGHTLY_LEAGUE_NAMES[post.league_id];
  if (!highLid) return { slug, ok: false, reason: 'no adapter for league ' + post.league_id };

  const title = post.title || '';
  const tParts = title.split(' top ');
  if (tParts.length < 2) return { slug, ok: false, reason: 'no "top" in title' };
  const articleHomeHint = tParts[0].trim();
  const articleAwayHint = tParts[1].replace(/\s+\d.*$/, '').trim();

  const result = await findHighlightlyMatch(highLid, post.game_date, articleHomeHint, articleAwayHint);
  if (!result) return { slug, ok: false, reason: 'no match in Highlightly for date ' + post.game_date };

  const homeWin = result.homeScore > result.awayScore;
  const winnerName = homeWin ? result.homeTeamName : result.awayTeamName;
  const loserName  = homeWin ? result.awayTeamName : result.homeTeamName;
  const winnerScore = Math.max(result.homeScore, result.awayScore);
  const loserScore  = Math.min(result.homeScore, result.awayScore);
  const leagueName = LEAGUE_FULL[highLid] || 'the league';
  const venue = VENUE_HINTS[winnerName] || VENUE_HINTS[loserName] || '';

  const newTitle = winnerName + ' top ' + loserName + ' ' + winnerScore + '-' + loserScore;
  const finalLine = `${result.homeTeamName} ${result.homeScore}, ${result.awayTeamName} ${result.awayScore}.`;
  const leadSentence = `${winnerName} defeated ${loserName} ${winnerScore}-${loserScore} in this ${leagueName} matchup.`;

  let newContent = `# ${newTitle}\n\n`;
  newContent += `*${post.game_date} - ${finalLine} Final.*\n\n`;
  newContent += `**Final score:** ${finalLine}\n`;
  if (venue) newContent += `**Venue:** ${venue}.\n`;
  newContent += `\n**League:** ${leagueName}.\n`;
  newContent += `\n*Source: Highlightly (${highLid}).*\n\n`;
  newContent += `---\n\n`;
  newContent += `${leadSentence} The final score of ${winnerScore}-${loserScore} reflects the ${homeWin ? 'home' : 'visiting'} team's performance in this ${leagueName} game played on ${post.game_date}.\n\n`;
  newContent += `Verify against official ${leagueName} boxscore and any in-arena broadcasts before betting or standings updates.\n`;
  newContent += `\n---\n[2026-09-16 AUDIT FIX] Article rewritten against Highlightly boxscore. Original YouTube highlight preserved.` + '\n';

  const updates = {
    title: newTitle,
    content: newContent,
    status: 'published',
    seo_title: newTitle + ' | RinkStop',
    subtitle: newTitle + ' on ' + post.game_date + '. Final score ' + winnerScore + '-' + loserScore + '.',
  };

  if (dryRun) return { slug, ok: true, dryRun: true, oldTitle: title, newTitle, score: winnerScore + '-' + loserScore, winner: winnerName, contentPreview: newContent.slice(0, 400) };
  const { error } = await sb.from('posts').update(updates).eq('id', post.id);
  return error ? { slug, ok: false, reason: error.message } : { slug, ok: true, newTitle };
}

const SLUGS = [
  'adler-mannheim-eisb-ren-berlin-5-1-2026-04-26-2467475',
  'avangard-omsk-lokomotiv-yaroslavl-4-0-2026-05-02-2468964',
  'eisb-ren-berlin-adler-mannheim-3-7-2026-04-24-2467474',
  'eisb-ren-berlin-adler-mannheim-1-4-2026-05-03-2469255-5d433a',
  'ska-1946-krasnaya-armiya-2-5-2026-04-06-2963267',
  'lokomotiv-yaroslavl-avangard-omsk-2-4-2026-04-28-2466545-7b90ca',
];

(async () => {
  console.log('=== DRY RUN ===');
  for (const slug of SLUGS) {
    const r = await regenerate(slug, true);
    console.log(JSON.stringify(r, null, 2));
  }
})().catch(e => console.error('FATAL:', e.message));
