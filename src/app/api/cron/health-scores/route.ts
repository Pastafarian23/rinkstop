// /api/cron/health-scores
//
// Runs every 15 minutes. Probes /api/health/scores?autoTrigger=1, which:
//   - Reports staleness breakdown (upcoming / live / stale_in_progress / stale_scheduled)
//   - Auto-triggers /api/cron/scores-refresh if staleness exceeds threshold and
//     last cron run is >10min old
//   - Returns healthScore (green/yellow/red) + alerts
//
// If healthScore=red AND autoTriggered failed, posts alert to RinkStop Ops Telegram.
//
// Per Arnel 2026-09-22 01:39 CDT directive: "We should have protocols in place
// in case there are any cron issues."

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';

  try {
    const res = await fetch(`${baseUrl}/api/health/scores?autoTrigger=1`, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      cache: 'no-store',
    });
    const report = await res.json();

    // If red and auto-trigger didn't work, alert
    if (report.healthScore === 'red' && !report.autoTriggered) {
      const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (chatId && token && report.alerts?.length > 0) {
        const text = `🚨 RinkStop scores staleness RED\n\n${report.alerts.join('\n')}\n\nLast run: ${report.cronLastRun || 'never'}\nStale in_progress: ${report.staleness?.stale_in_progress}\nStale scheduled: ${report.staleness?.stale_scheduled}`;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
        }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, report });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}