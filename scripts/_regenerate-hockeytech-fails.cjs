#!/usr/bin/env node
/**
 * Regenerate HockeyTech-sourced articles that failed the audit.
 *
 * Supports: WHL, AHL, QMJHL, OHL, ECHL (any league with HockeyTech adapter)
 * For NULL-league articles, looks up the league from team_home_id.
 *
 * For each failed article:
 *  - Fetch from Supabase
 *  - Fetch the correct boxscore from HockeyTech (using team names + date)
 *  - Rewrite title, subtitle, content with correct winner/score/OT
 *  - Preserve slug, og_image_url (YouTube ID), game_date, league_id, team IDs
 *
 * Run: node scripts/_regenerate-hockeytech-fails.cjs [--dry-run] [--limit=N]
 */

require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const AUDIT_FILE = '/tmp/audit-v2.json';

// HockeyTech league configs
const LEAGUES = {
  'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611': { clientCode: 'ahl',   key: '50c2cd9b5e18e390' },
  '46f49db9-e63d-407d-a99c-802f87576ab2': { clientCode: 'whl',   key: 'f1aa699db3d81487' },
  'deb6816a-ccaf-48bf-9f5e-5a7c3387f922': { clientCode: 'lhjmq', key: 'f1aa699db3d81487' },
  'd767362d-c13b-4c7a-8c8c-27ec33990882': { clientCode: 'ohl',   key: 'f1aa699db3d81487' },
  '85e8e902-441c-4102-b111-5a37f0350484': { clientCode: 'echl',  key: '2c2b89ea7345cae8' },
  'cf714ebc-0631-4ad9-b3e7-3822372be945': { clientCode: 'echl',  key: '2c2b89ea7345cae8' },
};

// Cache team→league lookup
const teamLeagueCache = new Map();
async function getTeamLeague(teamId) {
  if (teamLeagueCache.has(teamId)) return teamLeagueCache.get(teamId);
  const { data } = await supabase.from('teams').select('league_id').eq('id', teamId).single();
  const result = data?.league_id || null;
  teamLeagueCache.set(teamId, result);
  return result;
}

// Cache schedules per client_code
const scheduleCache = new Map();
async function loadSchedule(clientCode, key) {
  const cacheKey = clientCode;
  if (scheduleCache.has(cacheKey)) return scheduleCache.get(cacheKey);
  const allGames = new Map();
  // WHL uses 3-digit season IDs (285-295); AHL/OHL/QMJHL/ECHL use 2-digit (76-95)
  const seasonIds = [76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295];
  for (const sid of seasonIds) {
    try {
      const r = await fetch(`https://lscluster.hockeytech.com/feed/?feed=modulekit&view=schedule&key=${key}&client_code=${clientCode}&fmt=json&lang=en&season_id=${sid}`);
      if (r.ok) {
        const j = await r.json();
        for (const g of (j.SiteKit?.Schedule || [])) {
          if (!allGames.has(g.id)) allGames.set(g.id, g);
        }
      }
    } catch (e) {}
  }
  scheduleCache.set(cacheKey, [...allGames.values()]);
  return scheduleCache.get(cacheKey);
}

function findGame(schedule, gameDate, teams) {
  const d0 = new Date(gameDate + 'T00:00:00Z');
  const dayBefore = new Date(d0); dayBefore.setUTCDate(d0.getUTCDate() - 1);
  const dayAfter = new Date(d0); dayAfter.setUTCDate(d0.getUTCDate() + 1);
  const dateKeys = [dayBefore.toISOString().slice(0, 10), gameDate, dayAfter.toISOString().slice(0, 10)];
  const teamKeys = teams.map(t => ({ full: t.toLowerCase(), last: t.toLowerCase().split(' ').pop() }));
  // Prefer exact-date match
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
  const otClause = wasSO ? 'shootout' : wasOT ? 'overtime' : 'regulation';
  const newSubtitle = `${winnerName} top ${loserName} ${winnerScore}-${loserScore}${wasOT || wasSO ? ' (' + otClause + ')' : ''} on ${formatDate(dateStr)}. Game recap and series context on RinkStop.`;
  const otLine = wasSO ? 'The game was decided in a shootout.' : wasOT ? 'The game was decided in overtime.' : '';
  const leadLine = `*${dateStr} — ${awayName} ${awayScore}, ${homeName} ${homeScore}. Final${wasOT ? ' in OT' : wasSO ? ' in SO' : ''}.*`;
  const finalScoreLine = `**Final score:** ${awayName} ${awayScore}, ${homeName} ${homeScore}.`;
  const venueLine = `**Venue:** ${game.location || 'See HockeyTech'}.`;
  const sourceLine = `*Source: HockeyTech league stats.*`;
  const leagueLine = `**League:** ${getLeagueName(currentArticle.league_id, game)}.`;
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
  return { title: newTitle, subtitle: newSubtitle, content: contentParts.join('\n'), seo_title: newTitle };
}

const LEAGUE_LABELS = {
  'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611': 'American Hockey League',
  '46f49db9-e63d-407d-a99c-802f87576ab2': 'Western Hockey League',
  'deb6816a-ccaf-48bf-9f5e-5a7c3387f922': 'Quebec Major Junior Hockey League',
  'd767362d-c13b-4c7a-8c8c-27ec33990882': 'Ontario Hockey League',
  '85e8e902-441c-4102-b111-5a37f0350484': 'ECHL',
  'cf714ebc-0631-4ad9-b3e7-3822372be945': 'ECHL',
};

function getLeagueName(leagueId, game) {
  if (leagueId && LEAGUE_LABELS[leagueId]) return LEAGUE_LABELS[leagueId];
  // Look up team league as fallback
  return 'Professional Hockey';
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
  const { reports } = JSON.parse(require('fs').readFileSync(AUDIT_FILE, 'utf8'));
  const fails = reports.filter(a => a.results?.some(r => r.status === 'FAIL'));
  const targets = limit ? fails.slice(0, limit) : fails;
  console.log(`Found ${fails.length} FAIL articles; processing ${targets.length}${dryRun ? ' (DRY RUN)' : ''}\n`);

  let updated = 0, skipped = 0, errors = 0;

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

    // Determine league: prefer posts.league_id, fall back to team's league
    let leagueId = post.league_id;
    if (!leagueId && post.team_home_id) {
      leagueId = await getTeamLeague(post.team_home_id);
    }
    const cfg = LEAGUES[leagueId];
    if (!cfg) {
      console.error(`  [SKIP] ${fail.slug}: no HockeyTech adapter for league_id ${leagueId || 'NULL'}`);
      skipped++;
      continue;
    }

    const schedule = await loadSchedule(cfg.clientCode, cfg.key);
    const tm = (post.title || '').match(/^(.+?)\s+(?:top|defeat|beat|edge|down)\s+(.+?)\s+\d+-\d+/);
    if (!tm) { console.error(`  [ERR parse] ${fail.slug}`); errors++; continue; }
    const teams = [tm[1].replace(/^\*\*/, '').trim(), tm[2].trim()];
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
  console.log(`DONE: ${updated} updated, ${skipped} skipped, ${errors} errors`);
  if (dryRun) console.log('(DRY RUN — nothing written to DB)');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
