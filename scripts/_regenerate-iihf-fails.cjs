#!/usr/bin/env node
/**
 * Regenerate IIHF (international) articles that failed the audit.
 * Uses fixturedownload.com for canonical boxscore data.
 *
 * Run: node scripts/_regenerate-iihf-fails.cjs [--dry-run] [--limit=N]
 */

require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const AUDIT_FILE = '/tmp/audit-result.json';

async function fetchIihfGames(years) {
  const allGames = [];
  for (const year of years) {
    try {
      const r = await fetch(`https://fixturedownload.com/feed/json/iihf-ice-hockey-world-championship-${year}`);
      if (r.ok) {
        const j = await r.json();
        const games = Array.isArray(j) ? j : (j.games || []);
        for (const g of games) allGames.push({ ...g, _year: year });
      }
    } catch (e) {}
  }
  return allGames;
}

function findGame(games, gameDate, teams) {
  const d0 = new Date(gameDate + 'T00:00:00Z');
  const dayBefore = new Date(d0); dayBefore.setUTCDate(d0.getUTCDate() - 1);
  const dayAfter = new Date(d0); dayAfter.setUTCDate(d0.getUTCDate() + 1);
  const dateKeys = [dayBefore.toISOString().slice(0, 10), gameDate, dayAfter.toISOString().slice(0, 10)];
  const teamKeys = teams.map(t => ({ full: t.toLowerCase(), last: t.toLowerCase().split(' ').pop() }));
  // Prefer exact date
  const exact = games.find(g => {
    if ((g.DateUtc || '').slice(0, 10) !== gameDate) return false;
    if (g.HomeTeamScore === null || g.AwayTeamScore === null) return false;
    const h = (g.HomeTeam || '').toLowerCase();
    const a = (g.AwayTeam || '').toLowerCase();
    return teamKeys.some(k => h.includes(k.last)) && teamKeys.some(k => a.includes(k.last));
  });
  if (exact) return exact;
  return games.find(g => {
    if (!dateKeys.includes((g.DateUtc || '').slice(0, 10))) return false;
    if (g.HomeTeamScore === null || g.AwayTeamScore === null) return false;
    const h = (g.HomeTeam || '').toLowerCase();
    const a = (g.AwayTeam || '').toLowerCase();
    return teamKeys.some(k => h.includes(k.last)) && teamKeys.some(k => a.includes(k.last));
  });
}

function buildNewArticle(currentArticle, game) {
  const homeName = game.HomeTeam;
  const awayName = game.AwayTeam;
  const homeScore = game.HomeTeamScore;
  const awayScore = game.AwayTeamScore;
  const winnerIsHome = homeScore > awayScore;
  const winnerName = winnerIsHome ? homeName : awayName;
  const winnerScore = winnerIsHome ? homeScore : awayScore;
  const loserName = winnerIsHome ? awayName : homeName;
  const loserScore = winnerIsHome ? awayScore : homeScore;
  const dateStr = (currentArticle.game_date || '').slice(0, 10);
  const newTitle = `${winnerName} top ${loserName} ${winnerScore}-${loserScore}`;
  const newSubtitle = `${winnerName} top ${loserName} ${winnerScore}-${loserScore} on ${formatDate(dateStr)}. IIHF World Championship game recap on RinkStop.`;
  const leadLine = `*${dateStr} — ${awayName} ${awayScore}, ${homeName} ${homeScore}. Final.*`;
  const finalScoreLine = `**Final score:** ${awayName} ${awayScore}, ${homeName} ${homeScore}.`;
  const venueLine = `**Venue:** ${game.Location || 'See iihf.com'}.`;
  const leagueLine = `**League:** IIHF World Championship.`;
  const sourceLine = `*Source: IIHF / FixtureDownload.*`;
  const contentParts = [
    `# ${newTitle}`,
    '',
    leadLine,
    '',
    finalScoreLine,
    venueLine,
    '',
    leagueLine,
    '',
    sourceLine,
  ].filter(Boolean);
  return { title: newTitle, subtitle: newSubtitle, content: contentParts.join('\n'), seo_title: newTitle };
}

function formatDate(isoDate) {
  const d = new Date(isoDate + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

(async () => {
  const dryRun = process.argv.includes('--dry-run');
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

  if (!require('fs').existsSync(AUDIT_FILE)) {
    console.error(`Audit file not found: ${AUDIT_FILE}`);
    process.exit(1);
  }
  const audit = JSON.parse(require('fs').readFileSync(AUDIT_FILE, 'utf8'));
  const slugs = audit.failSlugs || [];
  const targets = limit ? slugs.slice(0, limit) : slugs;
  console.log(`Found ${slugs.length} FAIL articles; processing ${targets.length}${dryRun ? ' (DRY RUN)' : ''}\n`);

  // Unique slugs only (dedupe -069224, -537d9e etc that are duplicates)
  const uniqueSlugs = [...new Set(targets)];
  console.log(`Unique slugs: ${uniqueSlugs.length}`);

  const games2026 = await fetchIihfGames([2026]);
  const games2025 = await fetchIihfGames([2025]);
  const allGames = [...games2026, ...games2025];
  console.log(`Loaded ${allGames.length} IIHF games`);

  let updated = 0, skipped = 0, errors = 0;

  for (const slug of uniqueSlugs) {
    const { data: post, error: fetchErr } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .single();
    if (fetchErr || !post) {
      console.error(`  [ERR fetch] ${slug}: ${fetchErr?.message}`);
      errors++;
      continue;
    }

    const tm = (post.title || '').match(/^(.+?)\s+(?:top|defeat|beat|edge|down)\s+(.+?)\s+\d+-\d+/);
    if (!tm) { console.error(`  [ERR parse] ${slug}`); errors++; continue; }
    const teams = [tm[1].replace(/^\*\*/, '').trim(), tm[2].trim()];
    const game = findGame(allGames, post.game_date, teams);
    if (!game) {
      console.error(`  [ERR no-game] ${slug}: no IIHF game for ${teams.join(' vs ')} on ${post.game_date}`);
      skipped++;
      continue;
    }

    const rewrite = buildNewArticle(post, game);
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`SLUG: ${post.slug}`);
    console.log(`OLD: ${post.title}`);
    console.log(`NEW: ${rewrite.title}`);
    if (dryRun) continue;

    const { error: updateErr } = await supabase
      .from('posts')
      .update({
        title: rewrite.title,
        subtitle: rewrite.subtitle,
        content: rewrite.content,
        seo_title: rewrite.seo_title,
      })
      .eq('id', post.id);

    if (updateErr) {
      console.error(`  [ERR update] ${updateErr.message}`);
      errors++;
    } else {
      console.log(`  ✓ updated`);
      updated++;
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`DONE: ${updated} updated, ${skipped} skipped, ${errors} errors`);
  if (dryRun) console.log('(DRY RUN — nothing written)');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
