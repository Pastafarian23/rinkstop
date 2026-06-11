// One-time admin route: set up Stripe webhook end-to-end
// Body: { stripeSecretKey: "sk_live_..." }
// Does:
//   1. Verifies the secret works against Stripe API
//   2. Sets STRIPE_SECRET_KEY in Vercel (production+preview)
//   3. Creates webhook endpoint in Stripe (if not exists)
//   4. Sets STRIPE_WEBHOOK_SECRET in Vercel (production+preview)
//   5. Returns the webhook id, secret (whsec_...), and event types
//
// This route is gated by an ADMIN_SECRET header (Vercel env var).
// DELETE THIS FILE AFTER USE.
//
// Usage:
//   curl -X POST https://rinkstop.com/api/admin/bootstrap-stripe-webhook \
//     -H "x-admin-secret: $ADMIN_SECRET" \
//     -H "Content-Type: application/json" \
//     -d '{"stripeSecretKey":"sk_live_..."}'

import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || '';
const VERCEL_PROJECT_ID = 'prj_GVvqDaSS264FFo6q8LYAKGVe0bvM';
const VERCEL_TEAM_ID = 'team_271wEWewXaOEOef3qfvR0D4H';
const WEBHOOK_URL = 'https://rinkstop.com/api/webhooks/stripe';
const REQUIRED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
];

function vercelFetch(path: string, method: string = 'GET', body?: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://api.vercel.com${path}`);
    url.searchParams.set('teamId', VERCEL_TEAM_ID);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, data: JSON.parse(data || '{}') });
          } catch {
            resolve({ status: res.statusCode || 0, data });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function stripeRequest(path: string, method: string, body: any, secretKey: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      if (Array.isArray(v)) v.forEach((vv) => params.append(`${k}[]`, String(vv)));
      else if (v != null) params.append(k, String(v));
    }
    const req = https.request(
      {
        hostname: 'api.stripe.com',
        path,
        method,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, data: JSON.parse(data || '{}') });
          } catch {
            resolve({ status: res.statusCode || 0, data });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(params.toString());
    req.end();
  });
}

async function setVercelEnv(key: string, value: string, targets: string[]): Promise<{ action: string; id: string }> {
  // Try PATCH first (update existing), then POST (create)
  const list = await vercelFetch(`/v9/projects/${VERCEL_PROJECT_ID}/env`);
  const existing = (list.data.envs || []).find((e: any) => e.key === key);
  if (existing) {
    const r = await vercelFetch(`/v9/projects/${VERCEL_PROJECT_ID}/env/${existing.id}`, 'PATCH', { value });
    if (r.status >= 400) throw new Error(`PATCH ${key} failed: ${r.status} ${JSON.stringify(r.data)}`);
    return { action: 'updated', id: existing.id };
  }
  const r = await vercelFetch(`/v9/projects/${VERCEL_PROJECT_ID}/env`, 'POST', { key, value, type: 'plain', target: targets });
  if (r.status >= 400) throw new Error(`POST ${key} failed: ${r.status} ${JSON.stringify(r.data)}`);
  return { action: 'created', id: r.data.id };
}

export async function POST(req: NextRequest) {
  const adminSecret = req.headers.get('x-admin-secret') || new URL(req.url).searchParams.get('secret');
  if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!VERCEL_TOKEN) {
    return NextResponse.json({ error: 'VERCEL_TOKEN env var not set in Vercel' }, { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
  }
  const stripeSecretKey = body.stripeSecretKey;
  if (!stripeSecretKey || !/^sk_(live|test)_/.test(stripeSecretKey)) {
    return NextResponse.json({ error: 'stripeSecretKey must be sk_live_... or sk_test_...' }, { status: 400 });
  }

  const log: any[] = [];

  try {
    // 1. Verify the Stripe secret works
    const bal = await stripeRequest('/v1/balance', 'GET', {}, stripeSecretKey);
    if (bal.status !== 200) {
      return NextResponse.json({ error: 'Stripe key invalid', stripe_response: bal.data }, { status: 400 });
    }
    log.push({ step: 'verify_stripe_key', ok: true, mode: stripeSecretKey.startsWith('sk_live_') ? 'live' : 'test' });

    // 2. Set STRIPE_SECRET_KEY in Vercel
    const r1 = await setVercelEnv('STRIPE_SECRET_KEY', stripeSecretKey, ['production', 'preview']);
    log.push({ step: 'set_STRIPE_SECRET_KEY', ...r1 });

    // 3. List existing webhook endpoints, reuse if URL matches
    const wh = await stripeRequest('/v1/webhook_endpoints', 'GET', {}, stripeSecretKey);
    if (wh.status !== 200) {
      return NextResponse.json({ error: 'Failed to list webhook endpoints', stripe: wh.data }, { status: 500 });
    }
    const existing = (wh.data.data || []).find((e: any) => e.url === WEBHOOK_URL);
    let endpointId: string;
    let webhookSecret: string;
    if (existing) {
      endpointId = existing.id;
      // Reuse the existing endpoint — but the secret was only shown at create time.
      // If we don't have it stored anywhere, we have to rotate it via /rotate.
      const rotate = await stripeRequest(`/v1/webhook_endpoints/${endpointId}/rotate_secret`, 'POST', {}, stripeSecretKey);
      if (rotate.status !== 200) {
        return NextResponse.json({ error: 'Failed to rotate existing webhook secret', stripe: rotate.data }, { status: 500 });
      }
      webhookSecret = rotate.data.secret;
      log.push({ step: 'reuse_existing_webhook', id: endpointId, secret_rotated: true });
    } else {
      const create = await stripeRequest(
        '/v1/webhook_endpoints',
        'POST',
        {
          url: WEBHOOK_URL,
          enabled_events: REQUIRED_EVENTS,
          description: 'RinkStop subscription events',
        },
        stripeSecretKey
      );
      if (create.status !== 200 && create.status !== 201) {
        return NextResponse.json({ error: 'Failed to create webhook endpoint', stripe: create.data }, { status: 500 });
      }
      endpointId = create.data.id;
      webhookSecret = create.data.secret;
      log.push({ step: 'create_webhook', id: endpointId, secret_shown_once: true });
    }

    // 4. Set STRIPE_WEBHOOK_SECRET in Vercel
    const r2 = await setVercelEnv('STRIPE_WEBHOOK_SECRET', webhookSecret, ['production', 'preview']);
    log.push({ step: 'set_STRIPE_WEBHOOK_SECRET', ...r2 });

    return NextResponse.json({
      success: true,
      message: 'Stripe webhook configured. Trigger a redeploy to pick up env vars, then send a test event.',
      log,
      next_steps: [
        'Run: `git commit --allow-empty -m "chore: redeploy to pick up Stripe env vars" && git push`',
        `Then in Stripe dashboard: send a test event to endpoint ${endpointId}`,
        'Or use Stripe CLI: stripe trigger checkout.session.completed',
      ],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, log }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    route: 'admin/bootstrap-stripe-webhook',
    purpose: 'Set up Stripe webhook end-to-end (one-time use, then delete this file)',
    method: 'POST',
    body: { stripeSecretKey: 'sk_live_... or sk_test_...' },
    auth: 'x-admin-secret header OR ?secret= query param matching ADMIN_SECRET env var',
  });
}
