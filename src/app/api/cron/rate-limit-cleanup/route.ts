/**
 * src/app/api/cron/rate-limit-cleanup/route.ts
 *
 * GET /api/cron/rate-limit-cleanup
 *
 * OWASP A09 follow-up 2026-08-26: the `rate_limit_hits` table grows
 * unbounded (its `maybeCleanup()` is a documented no-op). On every
 * `checkRateLimit` call we `count + insert` against this table; as
 * traffic grows, the count query slows down even with the timestamp
 * index. Pruning old rows keeps it bounded.
 *
 * Hit by Vercel Cron daily at 03:00 UTC (vercel.json: "0 3 * * *").
 * Retains 7 days of history — long enough for legitimate sliding
 * windows (max windowMs is 24h, so 7d gives 6× headroom for debugging),
 * short enough that the table stays under 100k rows at current traffic.
 *
 * Auth: requires `Authorization: Bearer <CRON_SECRET>` matching
 * process.env.CRON_SECRET (Vercel sets this automatically for cron jobs).
 *
 * Idempotent: re-running deletes already-deleted rows with no effect.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RETENTION_DAYS = 7;

export async function GET(req: NextRequest) {
  // 1. Auth
  const authHeader = req.headers.get('authorization') || '';
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'cron_secret_unset' }, { status: 503 });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const cutoff = new Date(
      Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    // 2. Delete hits older than the retention window.
    const { count, error: delErr } = await supabaseAdmin
      .from('rate_limit_hits')
      .delete({ count: 'exact' })
      .lt('hit_at', cutoff);

    if (delErr) {
      console.error('[cron/rate-limit-cleanup] delete failed:', delErr);
      return NextResponse.json({ error: 'delete_failed', message: delErr.message }, { status: 500 });
    }

    // 3. Optional: surface table size for monitoring.
    const { count: totalRows } = await supabaseAdmin
      .from('rate_limit_hits')
      .select('*', { count: 'exact', head: true });

    console.log(
      `[cron/rate-limit-cleanup] deleted ${count ?? 0} rows older than ${RETENTION_DAYS}d, ${totalRows ?? '?'} rows remaining`,
    );

    return NextResponse.json({
      ok: true,
      deleted: count ?? 0,
      remaining: totalRows ?? null,
      cutoff,
      retention_days: RETENTION_DAYS,
    });
  } catch (e: any) {
    console.error('[cron/rate-limit-cleanup] unexpected error:', e);
    return NextResponse.json({ error: 'unexpected', message: e.message }, { status: 500 });
  }
}