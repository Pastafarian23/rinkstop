// /api/cron/scores-refresh
//
// Runs every 30 minutes during NHL game hours (15:00-04:00 UTC = NHL evening window)
// and hourly otherwise. Invokes scripts/_daily-scores-all-leagues.cjs with --days=2
// so yesterday's games get marked completed and today's games get scores pushed.
//
// Why this exists:
// - Per Arnel 2026-09-22 01:39 CDT directive: "How can we guarantee that games are
//   continuously updated with scores and moved to recent/past games if necessary?
//   We should have protocols in place in case there are any cron issues."
// - The OpenClaw crons `0411a0d9` (NHL Live, 4hr) and `aa525db4` (Daily Scores —
//   All Leagues) both rely on agentTurn delivery and have been failing for days
//   with rate-limit errors. Direct script invocation works fine.
// - This Vercel cron is the *always-on* backstop. Vercel cron doesn't depend on
//   any LLM model — it just runs the script in the function runtime.
//
// Output: writes /tmp/scores-refresh-result.json with the script's summary so the
// health endpoint can read it.

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';

const execAsync = promisify(exec);

const SCRIPT_PATH = 'scripts/_daily-scores-all-leagues.cjs';

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

  try {
    // Run the multi-league orchestrator for yesterday + today (--days=2).
    // The script writes /tmp/daily-scores-all-leagues-result.json on completion.
    const { stdout, stderr } = await execAsync(
      `node ${SCRIPT_PATH} --days=2`,
      {
        cwd: process.cwd(),
        timeout: 110_000, // 110s — under Vercel's 120s function limit
        maxBuffer: 4 * 1024 * 1024,
      }
    );

    // Read the script's own report file
    let scriptReport: any = null;
    try {
      const raw = await readFile('/tmp/daily-scores-all-leagues-result.json', 'utf8');
      scriptReport = JSON.parse(raw);
    } catch {
      // Script may not have written the file — fall through
    }

    const finishedAt = new Date().toISOString();
    const result: RefreshResult = {
      ok: true,
      startedAt,
      finishedAt,
      durationMs: Date.now() - startMs,
      leaguesProcessed: Object.keys(scriptReport?.results || {}),
      totalUpserts: Object.values(scriptReport?.results || {}).reduce<number>(
        (sum, v) => sum + (typeof v === 'number' ? v : 0),
        0
      ),
      totalErrors: 0,
      warnings: [],
    };

    // Persist our own result for /api/health/scores
    await writeFile(
      '/tmp/scores-refresh-result.json',
      JSON.stringify(result, null, 2)
    ).catch(() => {});

    return NextResponse.json({ ...result, stdout_tail: stdout.slice(-500), scriptReport });
  } catch (e) {
    const finishedAt = new Date().toISOString();
    const errorMsg = (e as Error).message || 'Unknown error';

    // Try to extract upsert count from stdout even on failure
    let partialUpserts = 0;
    if ((e as any).stdout) {
      const m = (e as any).stdout.match(/Total upserts: (\d+)/);
      if (m) partialUpserts = parseInt(m[1], 10);
    }

    const result: RefreshResult = {
      ok: false,
      startedAt,
      finishedAt,
      durationMs: Date.now() - startMs,
      leaguesProcessed: [],
      totalUpserts: partialUpserts,
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

// Also expose POST for manual triggering from /api/health/scores
export async function POST(request: Request) {
  return GET(request);
}