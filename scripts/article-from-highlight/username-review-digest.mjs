#!/usr/bin/env node
/**
 * username-review-digest.mjs
 *
 * Daily digest of pending username reviews (Layer 2 brand prefix +
 * Layer 3 profanity soft flags).
 *
 * Posts a single Telegram message to RinkStop Ops (-5043773858) with
 * the count by reason, plus the top 5 most-recent pending entries
 * with slugs + reason chips. Includes a direct link to
 * /admin/username-review.
 *
 * Skip if everything is empty — no silent noise.
 *
 * Cron: 9am CT (11:00 UTC). Daily. After identity-expiry cron.
 *
 * Usage:
 *   node scripts/article-from-highlight/username-review-digest.mjs           # post if non-empty
 *   node scripts/article-from-highlight/username-review-digest.mjs --force   # post even if empty
 */

import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

function getBotToken() {
  if (process.env.TELEGRAM_BOT_TOKEN) return process.env.TELEGRAM_BOT_TOKEN;
  const cfgPath = '/root/.openclaw/openclaw.json';
  if (!existsSync(cfgPath)) return null;
  try {
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));
    return cfg?.channels?.telegram?.botToken || cfg?.plugins?.entries?.telegram?.config?.botToken || null;
  } catch {
    return null;
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = getBotToken();
const TELEGRAM_CHAT_ID = process.env.RINKSTOP_OPS_CHAT_ID || '-5043773858';
const ADMIN_REVIEW_URL = 'https://rinkstop.com/admin/username-review';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!TELEGRAM_BOT_TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN (env or openclaw.json channels.telegram.botToken)');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const REASON_EMOJI = {
  brand_prefix: '🏷️',
  soft_profanity: '🛑',
  pattern: '👀',
};

async function countByReason() {
  const counts = { brand_prefix: 0, soft_profanity: 0, pattern: 0 };
  await Promise.all(
    Object.keys(counts).map(async (reason) => {
      const { count, error } = await sb
        .from('pending_username_review')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('reason', reason);
      if (error) {
        console.error(`Count error for ${reason}:`, error.message);
      } else {
        counts[reason] = count || 0;
      }
    }),
  );
  return counts;
}

async function fetchTopPending(limit = 5) {
  // Most recent first. Join profiles for display name when available.
  const { data, error } = await sb
    .from('pending_username_review_queue')
    .select('id, requested_slug, reason, reason_detail, created_at, requester_name, requester_username, requester_tier')
    .limit(limit);
  if (error) {
    console.error('Fetch top pending error:', error.message);
    return [];
  }
  return data || [];
}

async function postToTelegram(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
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

function timeAgo(iso) {
  const t = new Date(iso).getTime();
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

function tierEmoji(tier) {
  if (tier === 'premium') return '⭐';
  if (tier === 'pro') return '🥇';
  if (tier === 'starter') return '🎟️';
  return '';
}

function buildMessage(counts, top) {
  const total = counts.brand_prefix + counts.soft_profanity + counts.pattern;
  const lines = [];
  lines.push('<b>🔎 Username review queue</b>');
  if (total === 0) {
    lines.push('Queue is empty. ✅');
    return lines.join('\n');
  }
  lines.push(`${total} pending review${total === 1 ? '' : 's'}`);
  lines.push('');
  lines.push(
    `• ${REASON_EMOJI.brand_prefix} Brand prefix: <b>${counts.brand_prefix}</b>`,
  );
  lines.push(
    `• ${REASON_EMOJI.soft_profanity} Profanity / soft: <b>${counts.soft_profanity}</b>`,
  );
  if (counts.pattern > 0) {
    lines.push(
      `• ${REASON_EMOJI.pattern} Pattern: <b>${counts.pattern}</b>`,
    );
  }
  if (top.length > 0) {
    lines.push('');
    lines.push('<b>Most recent:</b>');
    for (const item of top) {
      const emoji = REASON_EMOJI[item.reason] || '•';
      const tier = tierEmoji(item.requester_tier);
      const name = item.requester_name || 'unknown';
      const userRef = item.requester_username
        ? `@${item.requester_username}`
        : '';
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

async function main() {
  const force = process.argv.includes('--force');
  console.log('[username-review-digest] starting at', new Date().toISOString());

  const [counts, top] = await Promise.all([countByReason(), fetchTopPending(5)]);
  const total = counts.brand_prefix + counts.soft_profanity + counts.pattern;
  console.log('[username-review-digest] counts:', counts, 'total:', total);

  if (total === 0 && !force) {
    console.log('[username-review-digest] queue is empty, skipping Telegram post (use --force to override)');
    return;
  }

  const text = buildMessage(counts, top);
  const result = await postToTelegram(text);
  console.log('[username-review-digest] telegram message_id:', result?.result?.message_id);
}

main().catch((err) => {
  console.error('[username-review-digest] fatal:', err);
  process.exit(2);
});
