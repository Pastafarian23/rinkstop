// /api/cron/auto-publish
//
// Vercel cron every 30 minutes. Spawns the auto-publish script via
// child_process.execFile (with relative paths — works on Vercel
// where /root/.openclaw paths don't exist). Reads the result JSON
// from /tmp/auto-publish-result.json, posts a summary to RinkStop
// Ops Telegram if anything was published/flagged/errored.
//
// Per Arnel 2026-09-22 12:22 CDT: replaced the OpenClaw agentTurn
// cron (662b0424) with this Vercel cron. The agentTurn version kept
// rate-limiting on the LLM call; this Vercel cron has no LLM
// dependency and runs deterministically.
//
// Auth: Vercel sends Authorization: Bearer ${CRON_SECRET}. Internal
// triggers (x-internal-self-heal) bypass auth for fire-and-forget
// use by the scores-refresh self-heal flow.

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes — Vercel function timeout

const RESULT_FILE = '/tmp/auto-publish-result.json';

async function runAutoPublishScript(): Promise<{ ok: boolean; error?: string }> {
  const scriptPath = resolve(process.cwd(), 'scripts/auto-publish-audit-validated.cjs');
  return new Promise((resolveRun) => {
    const child = spawn('node', [scriptPath], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      resolveRun({ ok: false, error: err.message });
    });
    child.on('close', async (code) => {
      // The script writes its result to RESULT_FILE before exit; read it
      try {
        const raw = await readFile(RESULT_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        resolveRun({ ok: code === 0, ...(code !== 0 ? { error: `exit ${code}: ${stderr.slice(-500)}` } : {}) });
      } catch (e) {
        resolveRun({
          ok: false,
          error: `script exited ${code} without producing ${RESULT_FILE}. stderr: ${stderr.slice(-500)}`,
        });
      }
    });
  });
}

async function postToTelegram(text: string): Promise<{ ok: boolean; error?: string }> {
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!chatId || !token) return { ok: false, error: 'TELEGRAM env vars not set' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    return { ok: res.ok };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const selfHeal = request.headers.get('x-internal-self-heal') === '1';
  if (!selfHeal && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  let result: { ok: boolean; error?: string } = { ok: true };
  try {
    result = await runAutoPublishScript();
  } catch (e) {
    result = { ok: false, error: (e as Error).message };
  }

  let summary: any = null;
  try {
    const raw = await readFile(RESULT_FILE, 'utf8');
    summary = JSON.parse(raw);
  } catch {}

  // Only post to Telegram when something actually changed
  const published = summary?.total_published ?? 0;
  const flagged = summary?.total_flagged ?? 0;
  const errors = summary?.total_errors ?? 0;
  const shouldPost = published > 0 || flagged > 0 || errors > 0;

  let telegramStatus: { ok: boolean; error?: string } | null = null;
  if (shouldPost) {
    const text =
      `📝 Auto-publish (${new Date(startedAt).toLocaleString('en-US', { timeZone: 'America/Chicago' })}): ` +
      `${published} published · ${flagged} flagged · ${errors} errors`;
    telegramStatus = await postToTelegram(text);
  }

  return NextResponse.json({
    ok: result.ok,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startMs,
    summary,
    telegramSent: telegramStatus,
    error: result.error,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
