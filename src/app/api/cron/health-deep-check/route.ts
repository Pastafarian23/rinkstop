// /api/cron/health-deep-check
//
// Runs every 5 minutes. Exercises supabaseAdmin + supabase to catch the
// class of "module imports but throws at runtime" bug that broke the
// dashboard on 2026-08-26 (PR #169 fail-loud throw fired despite env var
// being set, because of Next.js module-evaluation timing).
//
// Catches env-var / module failures within 5 minutes of them appearing,
// instead of waiting for a user to hit /dashboard. Alerts via Telegram
// on any failure.

import { NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CheckResult {
  ok: boolean;
  error?: string;
  ms?: number;
}

async function check(name: string, fn: () => Promise<void>): Promise<CheckResult> {
  const start = Date.now();
  try {
    await fn();
    return { ok: true, ms: Date.now() - start };
  } catch (e) {
    return { ok: false, error: (e as Error).message?.slice(0, 200), ms: Date.now() - start };
  }
}

async function notifyTelegram(text: string): Promise<void> {
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!chatId || !token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
  } catch {
    // Don't let notification failure mask the health check failure.
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checks: Record<string, CheckResult> = {};

  checks.supabaseAdmin = await check('supabaseAdmin', async () => {
    const { error } = await supabaseAdmin
      .from('profiles')
      .select('user_id', { count: 'exact', head: true })
      .limit(1);
    if (error) throw new Error(error.message);
  });

  checks.supabaseAnon = await check('supabaseAnon', async () => {
    const { error } = await supabase
      .from('profiles')
      .select('user_id', { count: 'exact', head: true })
      .limit(1);
    // RLS may deny anon SELECT — that's fine. Throw only on connectivity errors.
    if (error && !error.message.toLowerCase().includes('permission') && error.code !== 'PGRST301') {
      throw new Error(error.message);
    }
  });

  const allOk = Object.values(checks).every((c) => c.ok);

  if (!allOk) {
    const failures = Object.entries(checks)
      .filter(([, v]) => !v.ok)
      .map(([k, v]) => `  ${k}: ${v.error}`)
      .join('\n');
    await notifyTelegram(
      `🚨 *RinkStop deep health check FAILED* (${new Date().toISOString()})\n${failures}`,
    );
  }

  return NextResponse.json(
    {
      ok: allOk,
      ts: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}