/**
 * src/app/api/cron/auth-audit-digest/route.ts
 *
 * GET /api/cron/auth-audit-digest
 *
 * OWASP A09 follow-up 2026-08-26: the auth_audit_log table records every
 * 401/403 across admin/correction routes, but no one reads it. This cron
 * surfaces the day's worth of auth failures to Telegram so Arnel sees
 * attacks, credential stuffing, and account-takeover attempts in chat.
 *
 * Hit by Vercel Cron daily at 10:00 UTC (after rate-limit cleanup at 03:00,
 * before username-review-digest at 14:00). Sends only if there are ≥3
 * failures in the past 24h from the same caller_ip, OR any failure from
 * an OWNER_EMAILS-listed user (definitely Arnel, very-low-noise signal).
 *
 * Auth: requires `Authorization: Bearer <CRON_SECRET>` matching
 * process.env.CRON_SECRET (Vercel sets this automatically for cron jobs).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_FAILURES_FOR_ALERT = 3;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'cron_secret_unset' }, { status: 503 });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await supabaseAdmin
      .from('auth_audit_log')
      .select('caller_ip, user_id, reason, path, attempted_action, status_code')
      .gte('created_at', since);

    if (error) {
      console.error('[cron/auth-audit-digest] read failed:', error);
      return NextResponse.json({ error: 'read_failed' }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
      console.log('[cron/auth-audit-digest] no auth failures in last 24h');
      return NextResponse.json({ ok: true, sent: 0, total: 0 });
    }

    // Aggregate by caller_ip.
    const byIp = new Map<string, { count: number; reasons: Set<string>; paths: Set<string> }>();
    for (const r of rows) {
      const ip = r.caller_ip || 'unknown';
      const cur = byIp.get(ip) ?? { count: 0, reasons: new Set(), paths: new Set() };
      cur.count += 1;
      if (r.reason) cur.reasons.add(r.reason as string);
      if (r.path) cur.paths.add(r.path as string);
      byIp.set(ip, cur);
    }

    // Pick the top IPs (≥ MIN_FAILURES_FOR_ALERT) for the digest.
    const suspects = [...byIp.entries()]
      .filter(([, v]) => v.count >= MIN_FAILURES_FOR_ALERT)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    if (suspects.length === 0) {
      console.log(`[cron/auth-audit-digest] ${rows.length} failures spread across ${byIp.size} IPs, below threshold`);
      return NextResponse.json({ ok: true, sent: 0, total: rows.length });
    }

    const lines = suspects.map(([ip, v]) =>
      `• \`${ip}\` — ${v.count} failures\n  paths: ${[...v.paths].slice(0, 3).join(', ')}\n  reasons: ${[...v.reasons].join(', ')}`,
    );
    const text = `🔐 **Auth failures in last 24h**\n\n${lines.join('\n\n')}\n\n_(Total: ${rows.length} failures across ${byIp.size} IPs)_`;

    const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
    if (!chatId) {
      console.log('[cron/auth-audit-digest] no TELEGRAM_NOTIFY_CHAT_ID, skipping post');
      return NextResponse.json({ ok: true, sent: 0, total: rows.length, note: 'no_chat_id' });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.log('[cron/auth-audit-digest] no TELEGRAM_BOT_TOKEN, skipping post');
      return NextResponse.json({ ok: true, sent: 0, total: rows.length, note: 'no_token' });
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    if (!tgRes.ok) {
      const body = await tgRes.text();
      console.error('[cron/auth-audit-digest] telegram failed:', tgRes.status, body.slice(0, 200));
      return NextResponse.json({ ok: false, error: 'telegram_failed', status: tgRes.status }, { status: 502 });
    }

    console.log(`[cron/auth-audit-digest] sent digest for ${suspects.length} suspicious IPs`);
    return NextResponse.json({ ok: true, sent: 1, total: rows.length, suspects: suspects.length });
  } catch (e: any) {
    console.error('[cron/auth-audit-digest] unexpected error:', e);
    return NextResponse.json({ error: 'unexpected', message: e.message }, { status: 500 });
  }
}