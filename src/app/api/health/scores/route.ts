// /api/health/scores
//
// Returns data-freshness metrics for the /scores page:
//   - lastCronRun: timestamp + duration + counts from the most recent /api/cron/scores-refresh run
//   - staleness: counts of fixtures in each status, with thresholds:
//       healthy:   scheduled/in_progress whose scheduled_at is within last 4h
//       stale:     scheduled/in_progress whose scheduled_at is >4h past
//       upcoming:  scheduled whose scheduled_at is in future
//   - autoTrigger: if staleness exceeds threshold AND cron hasn't run in 10min,
//     trigger a /api/cron/scores-refresh on demand
//   - alerts: array of human-readable warnings
//
// Per Arnel 2026-09-22 01:39 CDT directive: "We should have protocols in place
// in case there are any cron issues."
//
// This endpoint can be polled by:
//   - The OpenClaw HEARTBEAT (every 30min) for ops visibility
//   - The /scores page client-side (every 5min) for self-healing
//   - On-demand via fetch

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { supabase } from '@/lib/supabase';

interface StalenessBreakdown {
  upcoming: number;          // scheduled, future
  live: number;              // in_progress, within last 4h
  stale_in_progress: number; // in_progress, >4h past (should be completed)
  stale_scheduled: number;   // scheduled, past (should be completed)
  recently_completed: number; // completed within last 7 days
  total: number;
}

interface HealthReport {
  now?: string;
  cronLastRun: string | null;
  cronDurationMs: number | null;
  cronOk: boolean | null;
  cronTotalUpserts: number | null;
  staleness: StalenessBreakdown;
  healthScore: 'green' | 'yellow' | 'red';
  alerts: string[];
  autoTriggered: boolean;
}

const STALE_THRESHOLD_HOURS = 4;
const AUTO_TRIGGER_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

async function readLastCronResult(): Promise<{ result: any | null; timestamp: Date | null }> {
  try {
    const raw = await readFile('/tmp/scores-refresh-result.json', 'utf8');
    const result = JSON.parse(raw);
    return { result, timestamp: new Date(result.startedAt) };
  } catch {
    return { result: null, timestamp: null };
  }
}

async function getStaleness(): Promise<StalenessBreakdown> {
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - STALE_THRESHOLD_HOURS * 3600 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400 * 1000);

  const { data: upcoming } = await supabase
    .from('fixtures')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'scheduled')
    .gte('scheduled_at', now.toISOString());

  const { count: live } = await supabase
    .from('fixtures')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'in_progress')
    .gte('scheduled_at', fourHoursAgo.toISOString())
    .lt('scheduled_at', now.toISOString());

  const { count: stale_in_progress } = await supabase
    .from('fixtures')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'in_progress')
    .lt('scheduled_at', fourHoursAgo.toISOString());

  const { count: stale_scheduled } = await supabase
    .from('fixtures')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'scheduled')
    .lt('scheduled_at', now.toISOString())
    .gte('scheduled_at', sevenDaysAgo.toISOString());

  const { count: recently_completed } = await supabase
    .from('fixtures')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gte('scheduled_at', sevenDaysAgo.toISOString());

  return {
    upcoming: upcoming?.length || 0,
    live: live || 0,
    stale_in_progress: stale_in_progress || 0,
    stale_scheduled: stale_scheduled || 0,
    recently_completed: recently_completed || 0,
    total: (upcoming?.length || 0) + (live || 0) + (stale_in_progress || 0) + (stale_scheduled || 0) + (recently_completed || 0),
  };
}

async function autoTriggerRefresh(lastCron: Date | null): Promise<boolean> {
  // Don't trigger if cron ran recently
  if (lastCron && Date.now() - lastCron.getTime() < AUTO_TRIGGER_COOLDOWN_MS) {
    return false;
  }
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
  try {
    const res = await fetch(`${baseUrl}/api/cron/scores-refresh`, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const autoTrigger = url.searchParams.get('autoTrigger') === '1';

  const { result: lastCronResult, timestamp: lastCronTime } = await readLastCronResult();
  const staleness = await getStaleness();

  const alerts: string[] = [];
  const staleTotal = staleness.stale_in_progress + staleness.stale_scheduled;
  if (staleness.stale_in_progress > 5) {
    alerts.push(`⚠️ ${staleness.stale_in_progress} games stuck in 'in_progress' >4h past their scheduled_at — daily-scores cron may be failing`);
  }
  if (staleness.stale_scheduled > 10) {
    alerts.push(`⚠️ ${staleness.stale_scheduled} games stuck in 'scheduled' but their scheduled_at has passed — likely missed cron run`);
  }
  if (lastCronTime) {
    const ageMin = Math.floor((Date.now() - lastCronTime.getTime()) / 60000);
    if (ageMin > 60) {
      alerts.push(`⚠️ Scores cron last ran ${ageMin}min ago (>1h)`);
    }
    if (lastCronResult && !lastCronResult.ok) {
      alerts.push(`⚠️ Last cron run FAILED: ${lastCronResult.error?.slice(0, 100) || 'unknown'}`);
    }
  } else {
    alerts.push('⚠️ No cron run recorded since endpoint was added');
  }

  let healthScore: 'green' | 'yellow' | 'red';
  if (staleTotal === 0 && (alerts.length === 0 || alerts.every(a => !a.startsWith('⚠️')))) {
    healthScore = 'green';
  } else if (staleTotal > 20) {
    healthScore = 'red';
  } else {
    healthScore = 'yellow';
  }

  let autoTriggered = false;
  if (autoTrigger && (healthScore === 'red' || (healthScore === 'yellow' && staleTotal > 5))) {
    autoTriggered = await autoTriggerRefresh(lastCronTime);
    if (autoTriggered) alerts.push('🔄 Auto-triggered scores refresh');
  }

  const report: HealthReport = {
    now: new Date().toISOString(),
    cronLastRun: lastCronTime?.toISOString() || null,
    cronDurationMs: lastCronResult?.durationMs ?? null,
    cronOk: lastCronResult?.ok ?? null,
    cronTotalUpserts: lastCronResult?.totalUpserts ?? null,
    staleness,
    healthScore,
    alerts,
    autoTriggered,
  };

  return NextResponse.json(report);
}