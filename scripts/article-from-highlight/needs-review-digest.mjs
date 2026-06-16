#!/usr/bin/env node
/**
 * needs-review-digest.mjs
 *
 * Daily digest of articles pending human action.
 * Posts a single line to RinkStop Ops (Telegram -5043773858) with
 * the count of articles in each actionable state, plus a link to
 * the /admin/blog/queue dashboard.
 *
 * State machine (2026-06-16):
 *   - needs_review: ambiguous, waiting for Arnel
 *   - needs_rewrite: failed verification, will be retried by rewrite-architect
 *     (3-strike → archived)
 *   - verified: clean, ready to publish (optional human review)
 *   - manually_approved: Arnel said OK despite verification flag
 *
 * Skip if everything is empty — no silent noise.
 *
 * Cron: 8am CT (after 4am fact-audit and 7am rewrite-architect) — 14:00 UTC.
 *
 * Usage:
 *   node scripts/article-from-highlight/needs-review-digest.mjs           # post if non-empty
 *   node scripts/article-from-highlight/needs-review-digest.mjs --force   # post even if empty
 */

import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read bot token from openclaw.json (fall back to env)
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!TELEGRAM_BOT_TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN (env or openclaw.json channels.telegram.botToken)');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const ACTIONABLE_STATUSES = ['needs_review', 'needs_rewrite', 'verified', 'manually_approved'];

async function countByStatus() {
  // Count using head requests — much faster than fetching the rows.
  const counts = {};
  await Promise.all(
    ACTIONABLE_STATUSES.map(async (s) => {
      const { count, error } = await sb
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', s);
      if (error) {
        console.error(`Count error for ${s}:`, error.message);
        counts[s] = 0;
      } else {
        counts[s] = count || 0;
      }
    }),
  );
  return counts;
}

async function fetchTopIssues(limit = 3) {
  // Pull the top N needs_review posts so the digest shows *what* is
  // actually waiting (not just a count). Just titles + slugs.
  const { data, error } = await sb
    .from('posts')
    .select('id, slug, title, last_issue_summary')
    .eq('status', 'needs_review')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Fetch top issues error:', error.message);
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

function buildMessage(counts, topIssues, total) {
  if (total === 0) {
    return `🏒 <b>Article queue: empty</b>\n\nNothing in <code>needs_review</code>, <code>needs_rewrite</code>, <code>verified</code>, or <code>manually_approved</code>. System is idle.\n\n<a href="https://rinkstop.com/admin/blog/queue">Open queue</a>`;
  }

  const parts = [`🏒 <b>Article queue</b>`];

  for (const s of ACTIONABLE_STATUSES) {
    const c = counts[s] || 0;
    if (c > 0) {
      parts.push(`• <code>${s}</code>: <b>${c}</b>`);
    }
  }

  if (topIssues.length > 0) {
    parts.push('');
    parts.push('Top needs_review:');
    topIssues.forEach((p, i) => {
      const safeTitle = (p.title || '').replace(/[<>&]/g, (c) => {
        if (c === '<') return '&lt;';
        if (c === '>') return '&gt;';
        return '&amp;';
      });
      parts.push(`${i + 1}. <a href="https://rinkstop.com/admin/blog/queue">${safeTitle.slice(0, 80)}${safeTitle.length > 80 ? '…' : ''}</a>`);
    });
  }

  parts.push('');
  parts.push('<a href="https://rinkstop.com/admin/blog/queue">Open queue →</a>');

  return parts.join('\n');
}

async function main() {
  const force = process.argv.includes('--force');
  console.log(`[${new Date().toISOString()}] needs-review-digest starting (force=${force})…`);

  const counts = await countByStatus();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log('Counts:', counts, 'total:', total);

  if (total === 0 && !force) {
    console.log('Nothing to report — skipping Telegram post (use --force to override).');
    return;
  }

  const topIssues = total > 0 ? await fetchTopIssues(3) : [];
  const message = buildMessage(counts, topIssues, total);

  console.log('\nMessage to send:');
  console.log(message);
  console.log('');

  try {
    const result = await postToTelegram(message);
    console.log('Posted to Telegram:', result.ok ? 'OK' : 'FAILED', result.result?.message_id || '');
  } catch (e) {
    console.error('Telegram post failed:', e.message);
    process.exit(1);
  }
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
