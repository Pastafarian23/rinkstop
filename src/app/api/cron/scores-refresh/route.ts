// /api/cron/scores-refresh
//
// Runs every 30 minutes during NHL game hours (15:00-04:00 UTC = NHL evening window)
// and hourly otherwise. Invokes the multi-league orchestrator in-process via
// direct require() — runs the script synchronously without spawning a child
// process. Vercel bundles the orchestrator source because it's imported here.
//
// Why in-process and not exec: Vercel's function bundle does NOT include
// /scripts/ — exec('node scripts/...') returns ENOENT. Importing via
// require() pulls the file into the bundle, so it works on Vercel.
//
// Per Arnel 2026-09-22 01:39 CDT directive: "How can we guarantee that games
// are continuously updated with scores and moved to recent/past games if
// necessary? We should have protocols in place in case there are any cron
// issues."

import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
// Use eval to bypass Next.js bundler analysis of the .cjs file (which it
// doesn't natively support as a module). The orchestrator's exports become
// accessible via the module.exports object the .cjs file sets.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const orchestrator = require('../../../server/scores/daily-scores-orchestrator.cjs');

interface RefreshResult {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  leaguesProcessed: string[];
  totalUpserts: number;
  totalErrors: number;
  error?: string;
  warnings: string[];
}

async function runOrchestrator(): Promise<{ upserts: number; leagues: string[]; error?: string }> {
  // Set CWD to repo root so load-secrets.cjs finds .env.local if present
  // (no-op on Vercel where env vars are set by the platform).
  const path = await import('path');
  const fs = await import('fs/promises');
  // process.cwd() on Vercel is /var/task which is the repo root in the bundle.
  // load-secrets.cjs will find .env.local if it exists, otherwise no-op.
  try {
    const result = await orchestrator.main();
    // The orchestrator writes /tmp/daily-scores-all-leagues-result.json
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
  // Vercel cron sends Bearer ${CRON_SECRET}. Client-side self-heal sends
  // x-internal-self-heal: 1 (no secret). Both are permitted; external
  // requests without either are rejected.
  const selfHeal = request.headers.get('x-internal-self-heal') === '1';
  if (!selfHeal && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  // Enforce 110s timeout (Vercel function limit is 120s)
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Orchestrator timeout after 110s')), 110_000)
  );

  try {
    const { upserts, leagues, error } = await Promise.race([
      runOrchestrator(),
      timeoutPromise,
    ]);

    const finishedAt = new Date().toISOString();
    const result: RefreshResult = {
      ok: !error,
      startedAt,
      finishedAt,
      durationMs: Date.now() - startMs,
      leaguesProcessed: leagues,
      totalUpserts: upserts,
      totalErrors: error ? 1 : 0,
      error,
      warnings: [],
    };

    await writeFile(
      '/tmp/scores-refresh-result.json',
      JSON.stringify(result, null, 2)
    ).catch(() => {});

    return NextResponse.json(result);
  } catch (e) {
    const finishedAt = new Date().toISOString();
    const errorMsg = (e as Error).message || 'Unknown error';
    const result: RefreshResult = {
      ok: false,
      startedAt,
      finishedAt,
      durationMs: Date.now() - startMs,
      leaguesProcessed: [],
      totalUpserts: 0,
      totalErrors: 1,
      error: errorMsg,
      warnings: [],
    };

    await writeFile(
      '/tmp/scores-refresh-result.json',
      JSON.stringify(result, null, 2)
    ).catch(() => {});

    return NextResponse.json(result, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}