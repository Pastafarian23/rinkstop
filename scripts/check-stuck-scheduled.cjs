#!/usr/bin/env node
/**
 * check-stuck-scheduled.cjs — 2026-10-16 (Piece E Part 1.5, Arnel 01:16)
 *
 * Alert when any league has a game more than 24h past its start time
 * still marked status='scheduled' during that league's season.
 *
 * Output: writes /tmp/stuck-scheduled-alert.json with per-league counts
 * and a one-line summary on stdout. Designed to be called from a cron
 * (system cron at the same cadence as the daily scores ingest, OR an
 * openclaw systemEvent) and the output piped to Telegram/email.
 *
 * Read-only: does not modify any rows.
 */
require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STUCK_HOURS = 24;
const NOW = new Date();
const STUCK_THRESHOLD = new Date(NOW.getTime() - STUCK_HOURS * 3600_000).toISOString();

async function fetchAll(table, select) {
  const PAGE = 1000;
  const all = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function main() {
  const fixtures = await fetchAll('fixtures',
    'id, league_id, scheduled_at, status, season, leagues(slug, name)');

  const byLeague = new Map();
  for (const f of fixtures) {
    if (f.status !== 'scheduled') continue;
    if (!f.scheduled_at || f.scheduled_at >= STUCK_THRESHOLD) continue;
    const slug = f.leagues?.slug || 'unknown';
    if (!byLeague.has(slug)) byLeague.set(slug, { name: f.leagues?.name || slug, rows: [] });
    byLeague.get(slug).rows.push(f);
  }

  const report = {
    generated_at: NOW.toISOString(),
    threshold_hours: STUCK_HOURS,
    per_league: {},
  };
  let totalStuck = 0;
  const alerts = [];
  for (const [slug, { name, rows }] of [...byLeague.entries()].sort((a, b) => b[1].rows.length - a[1].rows.length)) {
    const sorted = rows.slice().sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    const oldest = sorted.slice(0, 3).map(r => ({
      id: r.id,
      scheduled_at: r.scheduled_at,
      age_h: Math.round((NOW - new Date(r.scheduled_at)) / 3600_000),
      season: r.season,
    }));
    report.per_league[slug] = { name, count: rows.length, oldest_3: oldest };
    totalStuck += rows.length;
    if (rows.length > 0) {
      alerts.push(`${slug}: ${rows.length} stuck-scheduled (oldest ${oldest[0]?.age_h}h ago)`);
    }
  }
  report.totals = { total_stuck: totalStuck, leagues_affected: Object.keys(report.per_league).length };

  const fs = require('fs');
  fs.writeFileSync('/tmp/stuck-scheduled-alert.json', JSON.stringify(report, null, 2));

  console.log(`Stuck-scheduled check @ ${NOW.toISOString()} (threshold: ${STUCK_HOURS}h)`);
  console.log(`Total stuck: ${totalStuck} across ${Object.keys(report.per_league).length} leagues`);
  if (alerts.length > 0) {
    console.log('\nAlerts:');
    for (const a of alerts) console.log(`  ⚠ ${a}`);
  }
  console.log('\nWrote /tmp/stuck-scheduled-alert.json');
  process.exit(totalStuck > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(2); });
