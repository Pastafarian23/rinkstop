/**
 * src/app/api/cron/identity-expiry/route.ts
 *
 * GET /api/cron/identity-expiry
 *
 * Hit by Vercel Cron daily at 09:00 UTC (vercel.json: "0 9 * * *").
 * Wraps the same logic as scripts/cron-check-identity-expiry.mjs but
 * in-process so we don't need a separate runner. The offline script
 * stays useful for manual runs and sanity checks.
 *
 * Auth: requires `Authorization: Bearer <CRON_SECRET>` matching
 * process.env.CRON_SECRET (Vercel sets this automatically for cron jobs).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1. Auth — Vercel Cron sends a Bearer token equal to CRON_SECRET.
  //    CRON_SECRET is auto-set by Vercel for cron jobs. If it is unset,
  //    refuse to run rather than bypass auth (defense in depth).
  const authHeader = req.headers.get('authorization') || '';
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'cron_secret_unset' }, { status: 503 });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    // 2. Read view
    const { data: rows, error: readErr } = await supabaseAdmin
      .from('profile_identity_status')
      .select('user_id, identity_expires_at, days_until_expiry, status')
      .in('status', ['active', 'expired'])
      .not('identity_expires_at', 'is', null);

    if (readErr) {
      console.error('[cron/identity-expiry] view read failed:', readErr);
      return NextResponse.json({ error: 'read_failed' }, { status: 500 });
    }

    // 3. Bucket by T-30 / T-7 / T-1 / T+0
    const buckets: Record<string, any[]> = { 'T-30': [], 'T-7': [], 'T-1': [], 'T+0': [] };
    for (const row of rows || []) {
      const d = row.days_until_expiry;
      if (d === null) continue;
      if (d < 0) buckets['T+0'].push(row);
      else if (d <= 1) buckets['T-1'].push(row);
      else if (d <= 7) buckets['T-7'].push(row);
      else if (d <= 30) buckets['T-30'].push(row);
    }

    // 4. Upsert reminders
    let totalInserted = 0;
    for (const [kind, list] of Object.entries(buckets)) {
      if (list.length === 0) continue;
      const records = list.map((r: any) => ({
        user_id: r.user_id,
        kind,
        days_until_expiry: r.days_until_expiry,
        identity_expires_at: r.identity_expires_at,
        created_at: new Date().toISOString(),
      }));
      const { error: insErr } = await supabaseAdmin
        .from('identity_reminders')
        .upsert(records, { onConflict: 'user_id,kind' });
      if (insErr) {
        console.error(`[cron/identity-expiry] ${kind} upsert failed:`, insErr);
        // Continue with other buckets
      } else {
        totalInserted += records.length;
      }
    }

    const summary = {
      active_users: rows?.length || 0,
      T_minus_30: buckets['T-30'].length,
      T_minus_7: buckets['T-7'].length,
      T_minus_1: buckets['T-1'].length,
      T_plus_0: buckets['T+0'].length,
      total_reminders_written: totalInserted,
    };
    console.log('[cron/identity-expiry] summary:', summary);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error('[cron/identity-expiry] fatal:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
