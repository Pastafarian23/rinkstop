/**
 * src/app/api/cron/username-review-digest/route.ts
 *
 * GET /api/cron/username-review-digest
 *
 * Vercel cron: daily 14:00 UTC (9:00 AM CT) — after the 09:00 UTC
 * identity-expiry cron so Arnel sees the review queue in the same
 * morning Telegram session.
 *
 * Wraps scripts/article-from-highlight/username-review-digest.mjs in-process
 * so we don't need a separate runner. The script stays useful for
 * manual runs and for sanity checks.
 *
 * Auth: requires `Authorization: Bearer <CRON_SECRET>` matching
 * process.env.CRON_SECRET (Vercel sets this automatically for cron jobs).
 *
 * Pattern: mirrors /api/cron/identity-expiry so the operational story
 * is the same. See that route for the design notes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RINKSTOP_OPS_CHAT_ID = '-5043773858';
const DIGEST_SCRIPT = 'scripts/article-from-highlight/username-review-digest.mjs';

export async function GET(req: NextRequest) {
  // 1. Auth — Vercel Cron sends a Bearer token equal to CRON_SECRET
  const authHeader = req.headers.get('authorization') || '';
  const expected = process.env.CRON_SECRET;
  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    // 2. Count pending reviews by reason
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const reasons = ['brand_prefix', 'soft_profanity', 'pattern'];
    const counts: Record<string, number> = {};
    await Promise.all(
      reasons.map(async (r) => {
        const { count } = await sb
          .from('pending_username_review')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('reason', r);
        counts[r] = count || 0;
      }),
    );
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    // 3. If empty, skip the Telegram post (avoids silent noise)
    if (total === 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'queue_empty',
        counts,
      });
    }

    // 4. Spawn the script with proper env (it knows how to read from
    //    openclaw.json and from the env). We need to set the
    //    NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the
    //    script's env because Vercel crons don't load .env files for
    //    sub-processes automatically.
    const scriptPath = path.join(process.cwd(), DIGEST_SCRIPT);
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ error: 'script_not_found' }, { status: 500 });
    }

    // Bot token from openclaw.json (the script's getBotToken helper does this
    // too, but we set the env explicitly so the script doesn't have to read
    // openclaw.json from /root which Vercel can't access).
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      RINKSTOP_OPS_CHAT_ID: RINKSTOP_OPS_CHAT_ID,
    };
    if (process.env.TELEGRAM_BOT_TOKEN) {
      env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    }

    const result = await new Promise<{ stdout: string; stderr: string; code: number | null }>(
      (resolve) => {
        const child = spawn('node', [scriptPath], { env });
        let stdout = '';
        let stderr = '';
        if (child.stdout) child.stdout.on('data', (d) => { stdout += d.toString(); });
        if (child.stderr) child.stderr.on('data', (d) => { stderr += d.toString(); });
        child.on('close', (code) => resolve({ stdout, stderr, code }));
      },
    );

    if (result.code !== 0) {
      console.error('[cron/username-review-digest] script failed:', result.stderr);
      return NextResponse.json(
        { error: 'script_failed', counts, total, ...result },
        { status: 500 },
      );
    }

    console.log('[cron/username-review-digest]', result.stdout.trim());
    return NextResponse.json({ ok: true, posted: true, counts, total });
  } catch (err) {
    console.error('[cron/username-review-digest] fatal:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
