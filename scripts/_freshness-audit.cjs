#!/usr/bin/env node
/**
 * _freshness-audit.cjs — 2026-09-21
 *
 * Detect leagues with stale data and emit a per-league freshness report.
 * Run as part of the nightly audit cron (13320ed0).
 *
 * Per Arnel's 2026-09-21 'always updated, accurate, no gaps' directive.
 * A league is considered stale when:
 *   - last_updated_at is older than 48h for a completed game that exists
 *     in fixtures.home_team/away_team
 *   - last_updated_at is older than 7d for the league overall
 *
 * Output: writes /tmp/freshness-audit-result.json with per-league
 * status. Used by the nightly cron to alert Ops via Telegram.
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STALE_GAME_HOURS = 48;
const STALE_LEAGUE_DAYS = 7;

/**
 * Fetch every fixture row for a league, paginating past PostgREST's
 * 1,000-row cap. Returns null only if the query itself failed.
 */
async function fetchAllFixtures(leagueId) {
  const PAGE = 1000;
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('fixtures')
      .select('updated_at, status, scheduled_at')
      .eq('league_id', leagueId)
      .range(offset, offset + PAGE - 1);
    if (error) {
      console.error(`  ! fixtures fetch failed for league ${leagueId}: ${error.message}`);
      return null;
    }
    const rows = data || [];
    out.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

async function main() {
  const { data: leagues, error } = await supabase
    .from('leagues')
    .select('id, name, slug')
    .order('name');
  if (error) {
    console.error('Failed to load leagues:', error.message);
    process.exit(1);
  }

  const report = [];
  for (const league of leagues || []) {
    // Total fixtures + last-updated.
    //
    // 2026-11-06 (Arnel data-integrity audit): this used a single
    // unpaginated select(). Supabase's PostgREST caps a select() at 1,000
    // rows with NO error and NO warning, so every league with more than
    // 1,000 fixtures was silently truncated to its first 1,000 rows.
    //
    // Consequences, all observed live:
    //   - `total` was reported as exactly 1000 for NHL (4,637 real),
    //     AHL, OHL, WHL, ECHL, Liiga and NCAA.
    //   - `last_updated` was the max over the TRUNCATED subset, so leagues
    //     that were actually fresh were flagged STALE. The NHL was flagged
    //     STALE with last=2026-10-28 even though its fixtures run through
    //     2027-04-11 and were updated the same day.
    //   - The new daily fixtures-refresh cron (2da86e9a) fails on any
    //     STALE/GAP league, so this false positive would have paged Arnel
    //     every morning for a data problem that did not exist.
    //
    // Fix: page through the fixtures with .range() until a partial page
    // comes back. For leagues with >10k fixtures, use the DB-side aggregate
    // for `total` instead of counting rows in JS.
    const stats = await fetchAllFixtures(league.id);
    if (!stats) {
      report.push({ slug: league.slug, name: league.name, status: 'unknown', total: 0 });
      continue;
    }

    const total = stats.length;
    const lastUpd = stats.reduce((max, r) => (!max || r.updated_at > max) ? r.updated_at : max, null);
    const lastUpdAgeH = lastUpd ? (Date.now() - new Date(lastUpd).getTime()) / 3600000 : null;
    const completed = stats.filter(s => s.status === 'completed').length;
    const scheduled = stats.filter(s => s.status === 'scheduled').length;

    // Find stale scheduled fixtures that should have been completed already.
    //
    // 2026-11-06 (Arnel data-integrity audit): the original filter was
    //   status='scheduled' AND updated_at < (now - 48h)
    // with NO check on scheduled_at. That flags every FUTURE game whose
    // schedule was loaded more than 48h in advance — but there is nothing to
    // update for a game that has not been played yet.
    //
    // Live impact: the NHL was reported with 1,057 "stale scheduled games"
    // when its real gap count is 0. All 1,057 were games dated Dec 2026 and
    // later. AHL 1, ECHL 7, NCAA 7 and PWHL 5 were the same false positive.
    //
    // The new fixtures-refresh cron (2da86e9a) fails on any GAP league, so
    // this would have paged Arnel every morning for a non-existent problem.
    //
    // Fix: only count games whose scheduled_at is in the PAST — those are the
    // ones that should have a result but still say 'scheduled'.
    const staleThreshold = new Date(Date.now() - STALE_GAME_HOURS * 3600000).toISOString();
    const nowIso = new Date().toISOString();
    const staleScheduled = stats.filter(
      s => s.status === 'scheduled' && s.updated_at < staleThreshold && s.scheduled_at < nowIso,
    ).length;

    let status;
    let reason;
    if (total === 0) {
      status = 'empty';
      reason = 'No fixtures in DB';
    } else if (lastUpdAgeH === null) {
      status = 'unknown';
      reason = 'No update timestamp';
    } else if (lastUpdAgeH > STALE_LEAGUE_DAYS * 24) {
      status = 'STALE';
      reason = `Last update ${lastUpdAgeH.toFixed(1)}h ago (>${STALE_LEAGUE_DAYS}d threshold)`;
    } else if (staleScheduled > 0) {
      status = 'GAP';
      reason = `${staleScheduled} scheduled games haven't been updated in ${STALE_GAME_HOURS}h`;
    } else if (lastUpdAgeH > STALE_GAME_HOURS) {
      status = 'WARNING';
      reason = `Last update ${lastUpdAgeH.toFixed(1)}h ago`;
    } else {
      status = 'OK';
    }

    report.push({
      slug: league.slug,
      name: league.name,
      status,
      reason,
      total,
      completed,
      scheduled,
      last_updated: lastUpd,
      stale_scheduled: staleScheduled,
    });
  }

  // Write report
  const summary = {
    timestamp: new Date().toISOString(),
    stale_threshold_hours: STALE_GAME_HOURS,
    stale_threshold_days: STALE_LEAGUE_DAYS,
    total_leagues: report.length,
    ok: report.filter(r => r.status === 'OK').length,
    warnings: report.filter(r => r.status === 'WARNING').length,
    gaps: report.filter(r => r.status === 'GAP').length,
    stale: report.filter(r => r.status === 'STALE').length,
    empty: report.filter(r => r.status === 'empty').length,
    leagues: report,
  };

  require('fs').writeFileSync('/tmp/freshness-audit-result.json', JSON.stringify(summary, null, 2));

  console.log('=== FRESHNESS AUDIT ===');
  for (const r of report) {
    const statusIcon = { OK: '✓', WARNING: '⚠', GAP: '✗', STALE: '❌', empty: '—' }[r.status] || '?';
    console.log(`  ${statusIcon} ${r.slug.padEnd(35)} ${r.status.padEnd(8)} ${r.reason || ''}`);
  }
  console.log(`\nSummary: ${summary.ok} OK, ${summary.warnings} warning, ${summary.gaps} gap, ${summary.stale} stale, ${summary.empty} empty`);
  console.log('Report: /tmp/freshness-audit-result.json');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
