#!/usr/bin/env node
require('./load-secrets.cjs');
/**
 * scripts/collect-cron-health.js
 *
 * Collects OpenClaw cron job state, writes a snapshot to
 * Supabase `cron_health_snapshots` table. The Vercel /admin/cron-health
 * page reads from this table.
 *
 * Run by an OpenClaw isolated cron every 5 min via:
 *   openclaw cron add --name "Cron Health Collector (5min)" \
 *     --schedule "every 5 minutes" --tz "Asia/Manila" \
 *     --command "node /root/.openclaw/workspace/rinkstop-platform/scripts/collect-cron-health.js"
 */

const { execFileSync } = require('child_process');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function runOpenclaw(args) {
  return execFileSync('openclaw', args, {
    encoding: 'utf-8',
    timeout: 20000,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function extractJson(out) {
  // The output starts with "Config warnings:" preamble; the JSON starts at first '{'
  const first = out.indexOf('{');
  if (first === -1) throw new Error('no JSON found in output');
  return JSON.parse(out.slice(first));
}

async function main() {
  console.log('[cron-health] Collecting OpenClaw cron state...');

  // Step 1: list (with state for last-run data)
  const listOut = runOpenclaw(['cron', 'list', '--all', '--json']);
  const listJson = extractJson(listOut);
  const jobs = listJson.jobs || [];
  console.log(`[cron-health] Got ${jobs.length} jobs from list`);

  // Step 2: for each job, fetch recent runs to count 24h failures
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const crons = [];
  let failedLast24h = 0;
  let healthyCount = 0;

  for (const job of jobs) {
    const state = job.state || {};
    const lastRunAt = state.lastRunAtMs || null;
    const lastRunStatus = (state.lastRunStatus || job.status || '').toLowerCase();
    const isEnabled = job.enabled !== false;
    const target = job.sessionTarget || '';
    const delivery = job.delivery?.mode || '';
    const deliveryChannel = job.delivery?.channel || '';

    // Count 24h failures from runs
    let failedInWindow = 0;
    try {
      const runsOut = runOpenclaw(['cron', 'runs', '--id', job.id, '--limit', '50']);
      const runsJson = extractJson(runsOut);
      const entries = runsJson.entries || [];
      for (const r of entries) {
        const ts = r.runAtMs || r.ts || 0;
        const st = (r.status || '').toLowerCase();
        if (ts >= oneDayAgo && (st === 'failed' || st === 'error')) {
          failedInWindow += 1;
        }
      }
    } catch (e) {
      // Some jobs may not have runs (e.g., never run yet); not fatal
    }

    failedLast24h += failedInWindow;
    if (lastRunStatus === 'ok' || lastRunStatus === 'success') healthyCount += 1;

    crons.push({
      id: job.id,
      name: job.name,
      enabled: isEnabled,
      lastRunAt: lastRunAt ? new Date(lastRunAt).toISOString() : null,
      lastRunStatus: lastRunStatus || null,
      lastDurationMs: state.lastDurationMs || null,
      failedLast24h: failedInWindow,
      target,
      delivery: delivery ? `${delivery} -> ${deliveryChannel}` : '',
    });
  }

  // Step 3: write to Supabase
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cron_health_snapshots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({
      crons,
      total_crons: crons.length,
      healthy_count: healthyCount,
      failed_last_24h: failedLast24h,
      source: 'collect-cron-health.js',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[cron-health] Supabase write failed: ${res.status} ${err}`);
    process.exit(1);
  }

  console.log(
    `[cron-health] OK: ${crons.length} crons, ${healthyCount} healthy, ${failedLast24h} failed in 24h`
  );
}

main().catch((e) => {
  console.error('[cron-health] FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
