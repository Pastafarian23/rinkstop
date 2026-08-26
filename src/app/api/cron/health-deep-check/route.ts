// /api/cron/health-deep-check
//
// Runs every 5 minutes. Exercises supabaseAdmin + supabase + Stripe env vars
// to catch the class of bugs that broke the dashboard / pricing on 2026-08-26:
//   - Module imports but throws at runtime (PR #169 fail-loud)
//   - Env vars pointing to wrong Stripe price IDs (Club Starter -> $1999)
// Catches failures within 5 minutes instead of waiting for a user to find them.
// Alerts via Telegram on any failure.

import { NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';

// Canonical tier → env-var mapping. Single source of truth — must match
// TIER_TO_PRICE_ENV in src/app/api/tier/upgrade/route.ts.
const TIER_TO_ENV_VAR: Record<string, string> = {
  verified_identity: 'STRIPE_PRICE_VERIFIED_IDENTITY',
  identity_plus:     'STRIPE_PRICE_IDENTITY_PLUS',
  club_starter:      'STRIPE_PRICE_CLUB_STARTER',
  club_pro:          'STRIPE_PRICE_CLUB_PRO',
  club_elite:        'STRIPE_PRICE_CLUB_ELITE',
  league:            'STRIPE_PRICE_LEAGUE',
  business_listing:  'STRIPE_PRICE_BUSINESS_LISTING',
  business_plus:     'STRIPE_PRICE_BUSINESS_PLUS',
};

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
    if (error && !error.message.toLowerCase().includes('permission') && error.code !== 'PGRST301') {
      throw new Error(error.message);
    }
  });

  // Verify every Stripe price env var is set to a non-empty value matching
  // the Stripe price-ID format. The deep audit (cross-check against actual
  // Stripe products + amounts) lives in scripts/audit-stripe-price-mapping.py
  // — run that off-platform for the full check.
  checks.stripeEnvVars = await check('stripeEnvVars', async () => {
    const missing: string[] = [];
    const malformed: string[] = [];
    for (const [tier, envName] of Object.entries(TIER_TO_ENV_VAR)) {
      const v = process.env[envName];
      if (!v) {
        missing.push(`${tier}:${envName}`);
      } else if (!v.startsWith('price_')) {
        malformed.push(`${tier}:${envName}=${v.slice(0, 20)}…`);
      }
    }
    if (missing.length) throw new Error(`missing: ${missing.join(', ')}`);
    if (malformed.length) throw new Error(`malformed: ${malformed.join(', ')}`);
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