// Regenerate articles that fail the audit via Highlightly boxscore
// Handles SHL, DEL, KHL, MHL, VHL, SPHL

require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const HIGHLIGHTLY_LEAGUE_NAMES = {
  '69d4de0c-b072-4f52-8950-eb728acdc7f9': '40781',
  '03e919d1-2180-443b-aba4-6719d25d2eff': '16953',
  'a08f6dac-eb1f-48b6-a11b-56fbb5642752': '30569',
  'e052d66a-6f63-42da-94fc-25a809203c2f': '32271',
  '30fef7f6-0054-4605-83b7-ec619b72f328': '31420',
  'dead3e40-9f79-4488-a50b-755eb9a8cee0': '51844',
  '1ad37b08-894c-42dd-8583-2247bf927b6c': '32271',
};

const HIGHKEY = process.env.HIGHLIGHTLY_API_KEY;

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
      const matches = j.data || j || [];
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
            homeScore: parts[0], awayScore: parts[1],
            date: d,
          };
        }
      }
    } catch (e) {}
  }
  return null;
}

async function regenerate(slug) {
  const { data: post } = await sb.from('posts').select('*').eq('slug', slug).single();
  if (!post) return { ok: false, reason: 'no post' };

  const highLid = HIGHLIGHTLY_LEAGUE_NAMES[post.league_id];
  if (!highLid) return { ok: false, reason: 'no highlightly adapter for league ' + post.league_id };

  // Extract team hints from title like "Adler Mannheim top Eisbären Berlin 5-1"
  const title = post.title || '';
  const tParts = title.split(' top ');
  if (tParts.length < 2) return { ok: false, reason: 'title parse fail' };
  const homeHint = tParts[0].trim();
  const restAfter = tParts[1];
  const awayMatch = restAfter.match(/^(.+?)\s+\d/);
  if (!awayMatch) return { ok: false, reason: 'away parse fail' };
  const awayHint = awayMatch[1].trim();

  const result = await findHighlightlyMatch(highLid, post.game_date, homeHint, awayHint);
  if (!result) return { ok: false, reason: 'no match in highlightly' };

  // The article title is FABRICATED — fix it to match the actual result.
  // Article says: "X top Y X-Y" (X=winner article-side)
  // Actual: result with maybe reversed home/away
  // We rebuild the title based on the ACTUAL boxscore.
  const winner = result.homeScore > result.awayScore ? result.homeTeamName : result.awayTeamName;
  const loser = result.homeScore > result.awayScore ? result.awayTeamName : result.homeTeamName;
  const winnerScore = Math.max(result.homeScore, result.awayScore);
  const loserScore = Math.min(result.homeScore, result.awayScore);
  const newTitle = winner + ' top ' + loser + ' ' + winnerScore + '-' + loserScore;

  // Rewrite article body
  const newBody = `The ${winner} ${result.homeScore > result.awayScore ? 'defeated' : 'edged'} the ${loser} ${winnerScore}-${loserScore} on this date. The ${result.homeScore > result.awayScore ? 'home' : 'visiting'} team's effort produced the difference in this matchup.\n\nFinal score: ${result.homeTeamName} ${result.homeScore}, ${result.awayTeamName} ${result.awayScore}.\n\nBoxscore source: Highlightly (${highLid}).`;

  // Preserve essential fields; only update title + body
  const { error } = await sb.from('posts').update({
    title: newTitle,
    body: newBody,
    status: 'draft',  // Move to draft until human review confirms
  }).eq('id', post.id);
  if (error) return { ok: false, reason: error.message };
  return { ok: true, oldTitle: title, newTitle, homeTeam: result.homeTeamName, awayTeam: result.awayTeamName, score: result.homeScore + '-' + result.awayScore };
}

// Run on all 6 articles
const SLUGS = [
  'adler-mannheim-eisb-ren-berlin-5-1-2026-04-26-2467475',
  'avangard-omsk-lokomotiv-yaroslavl-4-0-2026-05-02-2468964',
  'eisb-ren-berlin-adler-mannheim-3-7-2026-04-24-2467474',
  'eisb-ren-berlin-adler-mannheim-1-4-2026-05-03-2469255-5d433a',
  'ska-1946-krasnaya-armiya-2-5-2026-04-06-2963267',
  'lokomotiv-yaroslavl-avangard-omsk-2-4-2026-04-28-2466545-7b90ca',
];

(async () => {
  for (const slug of SLUGS) {
    const r = await regenerate(slug);
    console.log(JSON.stringify(r, null, 2));
  }
})().catch(e => console.error(e.message));
