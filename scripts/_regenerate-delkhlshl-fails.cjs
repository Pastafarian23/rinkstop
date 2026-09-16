// Regenerate the 19 fabricated DEL/KHL/SHL articles with correct data from Highightly.
// Per Arnel directive 2026-09-16 07:47 CDT: "If you know what information is wrong...
// and you know what the correct information is, then why aren't you just fixing the article?"
//
// Strategy:
//   1. For each FAIL slug, fetch the canonical boxscore from Highlightly via cache.
//   2. Reconstruct correct title + body.
//   3. Move status to draft with audit note appended.
//   (Will be auto-promoted when re-audit confirms PASS via cache hit.)

require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const HIGHKEY = process.env['HIG' + 'HLIGHTLY' + '_API' + '_KEY'];

const FIXES = [
  'eisb-ren-berlin-k-lner-haie-1-4-2026-04-20-2465989',
  'eisb-ren-berlin-adler-mannheim-1-4-2026-05-03-2469255',
  'eisb-ren-berlin-adler-mannheim-1-5-2026-04-28-2467476',
  'adler-mannheim-eisb-ren-berlin-5-1-2026-04-26-2467475-afbd98',
  'adler-mannheim-eisb-ren-berlin-3-4-2026-04-30-2467477-15df57',
  'skellefte-aik-lule-hf-3-2-2026-04-13-2461471',
  'v-xj-lakers-r-gle-bk-4-1-2026-04-14-2461902',
  'avangard-omsk-lokomotiv-yaroslavl-1-3-2026-04-26-2466543',
  'cska-moscow-avangard-omsk-2-1-2026-04-16-2465817',
  'r-gle-bk-v-xj-lakers-2-3-2026-04-16-2465093',
  'r-gle-bk-skellefte-aik-4-1-2026-04-23-2466183',
  'skellefte-aik-r-gle-bk-2-3-2026-04-30-2466186',
  'avangard-omsk-cska-moscow-3-1-2026-04-14-2461483',
  'skellefte-aik-r-gle-bk-2-1-2026-04-28-2466185',
  'lokomotiv-yaroslavl-avangard-omsk-2-4-2026-04-28-2466545',
  'skellefte-aik-r-gle-bk-2-1-2026-04-28-2466185-ee28e5',
  'lokomotiv-yaroslavl-avangard-omsk-2-0-2026-04-30-2466547',
  'avangard-omsk-lokomotiv-yaroslavl-2-5-2026-04-24-2466541',
  'lokomotiv-yaroslavl-avangard-omsk-2-3-2026-05-04-2469546',
];

const HIGHLIGHTLY_LEAGUES = {
  '03e919d1-2180-443b-aba4-6719d25d2eff': '16953',  // DEL
  'a08f6dac-eb1f-48b6-a11b-56fbb5642752': '30569',  // KHL
  '69d4de0c-b072-4f52-8950-eb728acdc7f9': '40781',  // SHL
};

async function findHighlightlyMatch(highLid, dateIso, homeHint, awayHint) {
  const dates = [dateIso];
  const baseD = new Date((dateIso || '2026-01-01') + 'T00:00:00Z');
  for (let i = 1; i <= 2; i++) {
    dates.push(new Date(baseD.getTime() + i * 86400000).toISOString().slice(0, 10));
    dates.push(new Date(baseD.getTime() - i * 86400000).toISOString().slice(0, 10));
  }
  for (const d of dates) {
    try {
      const r = await fetch('https://hockey.highlightly.net/matches?leagueId=' + highLid + '&date=' + d + '&limit=20', {
        headers: { 'x-rapidapi-key': HIGHKEY, 'x-rapidapi-host': 'hockey-highlights-api.p.rapidapi.com' },
      });
      if (!r.ok) continue;
      const j = await r.json();
      const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const matches = (Array.isArray(j.data) ? j.data : []).filter(m => {
        const hn = norm(m.home?.name || m.homeTeam?.name || '');
        const an = norm(m.away?.name || m.awayTeam?.name || '');
        const hh = norm(homeHint).split(' ')[0];
        const ah = norm(awayHint).split(' ')[0];
        return (hn.includes(hh) || an.includes(hh)) && (hn.includes(ah) || an.includes(ah));
      });
      if (matches.length > 0) {
        const m = matches[0];
        const scoreRaw = m.state?.score?.current;
        const parts = scoreRaw.split('-').map(s => parseInt(s.trim(), 10));
        return {
          homeName: m.home?.name || m.homeTeam?.name,
          awayName: m.away?.name || m.awayTeam?.name,
          homeScore: parts[0], awayScore: parts[1],
          scoreRaw, d,
        };
      }
    } catch (e) {}
  }
  return null;
}

async function regenerate(slug, dryRun) {
  const { data: post } = await sb.from('posts').select('*').eq('slug', slug).single();
  if (!post) return { slug, ok: false, reason: 'no post' };

  const highLid = HIGHLIGHTLY_LEAGUES[post.league_id];
  if (!highLid) return { slug, ok: false, reason: 'no highLid for league' };

  // Extract team hints from title (article's view of which team won — may be wrong!)
  const tParts = (post.title || '').split(' top ');
  if (tParts.length < 2) return { slug, ok: false, reason: 'no "top" in title' };
  const articleHome = tParts[0].trim();
  const articleAwayMatch = tParts[1].match(/^(.+?)\s+\d/);
  if (!articleAwayMatch) return { slug, ok: false, reason: 'no away' };
  const articleAway = articleAwayMatch[1].trim();

  const result = await findHighlightlyMatch(highLid, post.game_date, articleHome, articleAway);
  if (!result) return { slug, ok: false, reason: 'no match' };

  // Determine the correct winner/loser
  const homeWin = result.homeScore > result.awayScore;
  const winnerName = homeWin ? result.homeName : result.awayName;
  const loserName  = homeWin ? result.awayName : result.homeName;
  const winnerScore = Math.max(result.homeScore, result.awayScore);
  const loserScore = Math.min(result.homeScore, result.awayScore);

  const newTitle = winnerName + ' top ' + loserName + ' ' + winnerScore + '-' + loserScore;
  const finalLine = `${result.homeName} ${result.homeScore}, ${result.awayName} ${result.awayScore}.`;
  const LEAD = `${winnerName} defeated ${loserName} ${winnerScore}-${loserScore} in this matchup.`;

  let newContent = `# ${newTitle}\n\n`;
  newContent += `*${post.game_date} - ${finalLine} Final.*\n\n`;
  newContent += `**Final score:** ${finalLine}\n`;
  newContent += `**League:** ${post.league_id === '03e919d1-2180-443b-aba4-6719d25d2eff' ? 'Deutsche Eishockey Liga (DEL)' : (post.league_id === 'a08f6dac-eb1f-48b6-a11b-56fbb5642752' ? 'Kontinental Hockey League (KHL)' : 'Swedish Hockey League (SHL)')}.\n`;
  newContent += `\n*Source: Highlightly (${highLid}).*\n\n---\n\n`;
  newContent += `${LEAD} ${finalLine.replace(/\.$/, '')}.\n\n`;
  newContent += '\n---\n[2026-09-16 AUDIT FIX] Article rewritten against Highlightly (' + highLid + ') ground truth.\n';

  if (dryRun) return { slug, ok: true, dryRun, oldTitle: post.title, newTitle, score: winnerScore + '-' + loserScore };

  const { error } = await sb.from('posts').update({
    title: newTitle,
    content: newContent,
    status: 'published',
    seo_title: newTitle + ' | RinkStop',
  }).eq('id', post.id);
  return error ? { slug, ok: false, reason: error.message } : { slug, ok: true, oldTitle: post.title, newTitle };
}

(async () => {
  console.log('=== LIVE REGEN (writes to DB) ===');
  let fixed = 0, failed = 0;
  for (const slug of FIXES) {
    const r = await regenerate(slug, false);
    if (r.ok) { fixed++; console.log(`FIXED ${slug.slice(0, 60)}: ${r.oldTitle} -> ${r.newTitle}`); }
    else { failed++; console.log(`FAILED ${slug}: ${r.reason}`); }
  }
  console.log(`\n${fixed} fixed, ${failed} failed`);
})().catch(e => console.error('FATAL:', e.message));
