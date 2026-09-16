#!/usr/bin/env node
/**
 * Regenerate the 27 WHL FAIL articles with correct boxscore data from HockeyTech.
 *
 * For each failed article:
 *  - Fetch the article from Supabase
 *  - Fetch the correct boxscore from HockeyTech (using team names from current title + game_date)
 *  - Rewrite title, subtitle, content with correct winner/score/OT
 *  - Keep slug, og_image_url (YouTube ID), game_date, league_id, team ids — these are correct
 *  - Status stays 'published' (was already published)
 *
 * Run: node scripts/_regenerate-whl-fails.cjs [--dry-run] [--limit=N]
 *
 * --dry-run: show what would change without writing
 * --limit=N: only process first N (for testing)
 */

require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const AUDIT_FILE = '/tmp/audit-full2.json';
const WHL_LEAGUE_ID = '46f49db9-e63d-407d-a99c-802f87576ab2';
const WHL_CFG = { clientCode: 'whl', key: 'f1aa699db3d81487' };
const PLACE_NAMES = {};

// --- HockeyTech season loader (cached in-memory) ---
let whlSchedule = null;
async function loadWhlSchedule() {
  if (whlSchedule) return whlSchedule;
  const allGames = new Map();
  for (const sid of [285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295]) {
    try {
      const r = await fetch(`https://lscluster.hockeytech.com/feed/?feed=modulekit&view=schedule&key=f1aa699db3d81487&client_code=${WHL_CFG.clientCode}&fmt=json&lang=en&season_id=${sid}`);
      if (r.ok) {
        const j = await r.json();
        for (const g of (j.SiteKit?.Schedule || [])) {
          if (!allGames.has(g.id)) allGames.set(g.id, g);
        }
      }
    } catch (e) {}
  }
  whlSchedule = [...allGames.values()];
  return whlSchedule;
}

function findGame(schedule, gameDate, teams) {
  const d0 = new Date(gameDate + 'T00:00:00Z');
  const dayBefore = new Date(d0); dayBefore.setUTCDate(d0.getUTCDate() - 1);
  const dayAfter = new Date(d0); dayAfter.setUTCDate(d0.getUTCDate() + 1);
  const dateKeys = [dayBefore.toISOString().slice(0,10), gameDate, dayAfter.toISOString().slice(0,10)];
  const teamKeys = teams.map(t => ({ full: t.toLowerCase(), last: t.toLowerCase().split(' ').pop() }));
  // Prefer exact date match; fall back to ±1 day window
  const exact = schedule.find(g => {
    if ((g.date_played || '').slice(0, 10) !== gameDate) return false;
    if (g.final !== '1') return false;
    const h = (g.home_team_name || '').toLowerCase();
    const a = (g.visiting_team_name || '').toLowerCase();
    return teamKeys.some(k => h.includes(k.last)) && teamKeys.some(k => a.includes(k.last));
  });
  if (exact) return exact;
  return schedule.find(g => {
    if (!dateKeys.includes((g.date_played || '').slice(0, 10))) return false;
    if (g.final !== '1') return false;
    const h = (g.home_team_name || '').toLowerCase();
    const a = (g.visiting_team_name || '').toLowerCase();
    return teamKeys.some(k => h.includes(k.last)) && teamKeys.some(k => a.includes(k.last));
  });
}

function buildNewArticle(currentArticle, game) {
  const homeName = game.home_team_name;
  const awayName = game.visiting_team_name;
  const homeScore = parseInt(game.home_goal_count, 10);
  const awayScore = parseInt(game.visiting_goal_count, 10);
  const wasOT = game.overtime === '1';
  const wasSO = game.shootout === '1';

  const winnerIsHome = homeScore > awayScore;
  const winnerName = winnerIsHome ? homeName : awayName;
  const winnerScore = winnerIsHome ? homeScore : awayScore;
  const loserName = winnerIsHome ? awayName : homeName;
  const loserScore = winnerIsHome ? awayScore : homeScore;

  const dateStr = (currentArticle.game_date || '').slice(0, 10);
  const otSuffix = wasSO ? ' in SO' : (wasOT ? ' in OT' : '');
  const newTitle = `${winnerName} top ${loserName} ${winnerScore}-${loserScore}${otSuffix}`;

  const newSubtitle = `${winnerName} top ${loserName} ${winnerScore}-${loserScore}${wasOT ? ' (overtime)' : wasSO ? ' (shootout)' : ''} on ${formatDate(dateStr)}. WHL game recap and series context on RinkStop.`;

  const otLine = wasSO ? 'The game was decided in a shootout.' :
                  wasOT ? 'The game was decided in overtime.' :
                  '';

  const leadLine = `*${dateStr} — ${awayName} ${awayScore}, ${homeName} ${homeScore}. Final${wasOT ? ' in OT' : wasSO ? ' in SO' : ''}.*`;

  const finalScoreLine = `**Final score:** ${awayName} ${awayScore}, ${homeName} ${homeScore}.`;
  const venueLine = `**Venue:** ${game.location || 'See HockeyTech'}.`;
  const leagueLine = `**League:** Western Hockey League.`;
  const sourceLine = `*Source: HockeyTech league stats.*`;

  const contentParts = [
    `# ${newTitle}`,
    '',
    leadLine,
    '',
    finalScoreLine,
    otLine,
    venueLine,
    '',
    leagueLine,
    '',
    sourceLine,
  ].filter(Boolean);

  return {
    title: newTitle,
    subtitle: newSubtitle,
    content: contentParts.join('\n'),
    seo_title: newTitle,
  };
}

function formatDate(isoDate) {
  // isoDate = '2026-04-19'
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
  const { reports } = JSON.parse(require('fs').readFileSync(AUDIT_FILE, 'utf8'));
  const whlFails = reports.filter(a => a.league_id === WHL_LEAGUE_ID && a.results?.some(r => r.status === 'FAIL'));
  const targets = limit ? whlFails.slice(0, limit) : whlFails;
  console.log(`Found ${whlFails.length} WHL FAIL articles; processing ${targets.length}${dryRun ? ' (DRY RUN)' : ''}\n`);

  const schedule = await loadWhlSchedule();
  console.log(`Loaded ${schedule.length} WHL games\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const fail of targets) {
    const { data: post, error: fetchErr } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', fail.slug)
      .single();
    if (fetchErr || !post) {
      console.error(`  [ERR fetch] ${fail.slug}: ${fetchErr?.message}`);
      errors++;
      continue;
    }

    // Extract teams from current title (which has the right teams, just wrong winner)
    const tm = (post.title || '').match(/^(.+?)\s+(?:top|defeat|beat|edge|down)\s+(.+?)\s+\d+-\d+/);
    if (!tm) {
      console.error(`  [ERR parse] ${fail.slug}: cannot extract teams from title`);
      errors++;
      continue;
    }
    const teams = [tm[1].trim(), tm[2].trim()];
    const game = findGame(schedule, post.game_date, teams);
    if (!game) {
      console.error(`  [ERR no-game] ${fail.slug}: no HockeyTech game for ${teams.join(' vs ')} on ${post.game_date}`);
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
  console.log(`DONE: ${updated} updated, ${skipped} skipped (no game found), ${errors} errors`);
  if (dryRun) console.log('(DRY RUN — nothing written to DB)');
})().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
