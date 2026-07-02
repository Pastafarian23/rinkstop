/**
 * src/app/api/cron/username-review-digest/route.ts
 *
 * GET /api/cron/username-review-digest
 *
 * Vercel cron: daily 14:00 UTC (9:00 AM CT) — after the 09:00 UTC
 * identity-expiry cron so Arnel sees the review queue in the same
 * morning Telegram session.
 *
 * Design: this route does the work IN-PROCESS (no spawn). We tried
 * spawning the .mjs script as a sub-process but that path failed in
 * the Vercel deployment because the script imports
 * @supabase/supabase-js, and the spawned process couldn't find it
 * (Vercel isolates the API route's node_modules from the script's
 * working directory). In-process avoids the issue entirely.
 *
 * Auth: requires `Authorization: Bearer <CRON_SECRET>` matching
 * process.env.CRON_SECRET (Vercel sets this automatically for cron jobs).
 *
 * Pattern: mirrors /api/cron/identity-expiry so the operational story
 * is the same. The standalone .mjs script (in
 * scripts/article-from-highlight/username-review-digest.mjs) is still
 * useful for manual runs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RINKSTOP_OPS_CHAT_ID = '-5043773858';
const ADMIN_REVIEW_URL = 'https://rinkstop.com/admin/username-review';

const REASON_EMOJI: Record<string, string> = {
  brand_prefix: '🏷️',
  soft_profanity: '🛑',
  pattern: '👀',
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

function tierEmoji(tier: string | null): string {
  if (!tier) return '';
  // Top tier (any track) gets the star — federation, league, club_elite, business_plus, enterprise (legacy)
  if (['federation', 'league', 'club_elite', 'business_plus', 'enterprise', 'business_premium'].includes(tier)) return '⭐';
  // Mid tier (paid but not top)
  if (['identity_plus', 'club_pro', 'pro', 'premium', 'business_pro'].includes(tier)) return '🥇';
  // Entry paid tier
  if (['verified_identity', 'club_starter', 'business_listing', 'roster', 'roster_plus', 'business_starter'].includes(tier)) return '🎟️';
  return '';
}

function buildMessage(
  counts: Record<string, number>,
  top: any[],
): string {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const lines: string[] = [];
  lines.push('<b>🔎 Username review queue</b>');
  if (total === 0) {
    lines.push('Queue is empty. ✅');
    return lines.join('\n');
  }
  lines.push(`${total} pending review${total === 1 ? '' : 's'}`);
  lines.push('');
  lines.push(`• ${REASON_EMOJI.brand_prefix} Brand prefix: <b>${counts.brand_prefix}</b>`);
  lines.push(`• ${REASON_EMOJI.soft_profanity} Profanity / soft: <b>${counts.soft_profanity}</b>`);
  if (counts.pattern > 0) {
    lines.push(`• ${REASON_EMOJI.pattern} Pattern: <b>${counts.pattern}</b>`);
  }
  if (top.length > 0) {
    lines.push('');
    lines.push('<b>Most recent:</b>');
    for (const item of top) {
      const emoji = REASON_EMOJI[item.reason] || '•';
      const tier = tierEmoji(item.requester_tier);
      const name = item.requester_name || 'unknown';
      const userRef = item.requester_username ? `@${item.requester_username}` : '';
      const ago = timeAgo(item.created_at);
      lines.push(
        `${emoji} <code>@${item.requested_slug}</code> — ${name} ${userRef}${tier} (${ago} ago)`,
      );
    }
  }
  lines.push('');
  lines.push(`👉 <a href="${ADMIN_REVIEW_URL}">Review queue</a>`);
  return lines.join('\n');
}

async function postToTelegram(text: string): Promise<{ message_id?: number } | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('[cron/username-review-digest] missing TELEGRAM_BOT_TOKEN, skipping post');
    return null;
  }
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: RINKSTOP_OPS_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function GET(req: NextRequest) {
  // 1. Auth — Vercel Cron sends a Bearer token equal to CRON_SECRET
  const authHeader = req.headers.get('authorization') || '';
  const expected = process.env.CRON_SECRET;
  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    // 2. Read queue
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

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

    // 3. If empty, skip silently (no noise)
    if (total === 0) {
      console.log('[cron/username-review-digest] queue empty, skipping');
      return NextResponse.json({ ok: true, skipped: true, reason: 'queue_empty', counts });
    }

    // 4. Fetch top 5 from the joined view
    const { data: top, error: topErr } = await sb
      .from('pending_username_review_queue')
      .select('id, requested_slug, reason, reason_detail, created_at, requester_name, requester_username, requester_tier')
      .limit(5);
    if (topErr) {
      console.error('[cron/username-review-digest] top fetch failed:', topErr);
      return NextResponse.json({ error: 'read_failed', detail: topErr.message }, { status: 500 });
    }

    // 5. Post to Telegram
    const text = buildMessage(counts, top || []);
    const result = await postToTelegram(text);
    console.log('[cron/username-review-digest] posted:', result);

    return NextResponse.json({ ok: true, posted: true, counts, total });
  } catch (err) {
    console.error('[cron/username-review-digest] fatal:', err);
    return NextResponse.json({ error: 'server_error', detail: String(err) }, { status: 500 });
  }
}
