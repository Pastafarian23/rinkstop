// /api/cron/scores-refresh
//
// Minimal version for Vercel — directly runs the multi-league ingest
// logic in-process. NO exec, NO child_process, NO file path issues.
//
// Per Arnel 2026-09-22 01:39 CDT directive: "How can we guarantee that
// games are continuously updated with scores and moved to recent/past
// games if necessary? We should have protocols in place in case there
// are any cron issues."

import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';

// Direct require — pulls the orchestrator source into the Next.js bundle
// so Vercel deploys it as part of the function.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const orchestrator = require('../../../server/scores/daily-scores-orchestrator.cjs');

async function runOrchestrator(): Promise<{ upserts: number; leagues: string[]; error?: string }> {
  const fs = await import('fs/promises');
  try {
    await orchestrator.main();
    const raw = await fs.readFile('/tmp/daily-scores-all-leagues-result.json', 'utf8');
    const report = JSON.parse(raw);
    return {
      upserts: report.total_upserts || 0,
      leagues: Object.keys(report.results || {}),
    };
  } catch (e) {
    return { upserts: 0, leagues: [], error: (e as Error).message };
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const selfHeal = request.headers.get('x-internal-self-heal') === '1';
  if (!selfHeal && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  try {
    const { upserts, leagues, error } = await runOrchestrator();
    const finishedAt = new Date().toISOString();
    const result = {
      ok: !error,
      startedAt,
      finishedAt,
      durationMs: Date.now() - startMs,
      leaguesProcessed: leagues,
      totalUpserts: upserts,
      totalErrors: error ? 1 : 0,
      error,
    };
    await writeFile(
      '/tmp/scores-refresh-result.json',
      JSON.stringify(result, null, 2)
    ).catch(() => {});
    return NextResponse.json(result);
  } catch (e) {
    const errorMsg = (e as Error).message || 'Unknown error';
    return NextResponse.json({
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startMs,
      leaguesProcessed: [],
      totalUpserts: 0,
      totalErrors: 1,
      error: errorMsg,
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}