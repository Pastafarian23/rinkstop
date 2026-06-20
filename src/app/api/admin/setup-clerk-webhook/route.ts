/**
 * POST /api/admin/setup-clerk-webhook
 *
 * One-time setup route. Idempotent. DELETE AFTER USE.
 *
 * Creates a Clerk webhook endpoint that points at /api/webhooks/clerk
 * and subscribes to user.created, user.updated, user.deleted.
 *
 * Auth: header `X-Setup-Token: <CLERK_SETUP_TOKEN>`. The token is a
 * Vercel env var. After the webhook is confirmed, delete this route
 * AND remove CLERK_SETUP_TOKEN from Vercel.
 *
 * Why this exists: Clerk's API is blocked from the workspace's egress IP
 * (Cloudflare 1010). The Vercel server makes the same API call from a
 * non-blocked egress, so this works. We don't call this route on a hot
 * path — it's run once during setup, then deleted.
 *
 * Endpoints:
 *   GET  /api/admin/setup-clerk-webhook   — list current webhooks
 *   POST /api/admin/setup-clerk-webhook   — create the webhook if missing
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const WEBHOOK_URL = 'https://rinkstop.com/api/webhooks/clerk';
const SUBSCRIBED_EVENTS = ['user.created', 'user.updated', 'user.deleted'];

interface ClerkWebhook {
  id: string;
  url: string;
  status: 'disabled' | 'enabled';
  events: string[];
  secret?: string;
}

interface ClerkWebhookListResponse {
  data: ClerkWebhook[];
}

function checkSetupToken(request: NextRequest): NextResponse | null {
  const provided = request.headers.get('x-setup-token');
  const expected = process.env.CLERK_SETUP_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: 'CLERK_SETUP_TOKEN env var not set; route is disabled' },
      { status: 503 }
    );
  }
  if (provided !== expected) {
    return NextResponse.json({ error: 'invalid X-Setup-Token' }, { status: 401 });
  }
  return null;
}

async function listWebhooks(): Promise<ClerkWebhook[]> {
  const resp = await fetch('https://api.clerk.com/v1/webhook_endpoints', {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Clerk list failed: ${resp.status} ${text.slice(0, 300)}`);
  }
  const json = (await resp.json()) as ClerkWebhookListResponse;
  return json.data;
}

async function createWebhook(): Promise<ClerkWebhook> {
  const resp = await fetch('https://api.clerk.com/v1/webhook_endpoints', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      events: SUBSCRIBED_EVENTS,
      description: 'RinkStop profile sync + welcome emails',
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Clerk create failed: ${resp.status} ${text.slice(0, 500)}`);
  }
  return (await resp.json()) as ClerkWebhook;
}

export async function GET(request: NextRequest) {
  const denied = checkSetupToken(request);
  if (denied) return denied;

  if (!process.env.CLERK_SECRET_KEY) {
    return NextResponse.json({ error: 'CLERK_SECRET_KEY not set' }, { status: 500 });
  }

  try {
    const all = await listWebhooks();
    const ours = all.find((w) => w.url === WEBHOOK_URL);
    return NextResponse.json({
      ok: true,
      totalWebhooks: all.length,
      ourWebhook: ours ?? null,
      ourWebhookConfigured: Boolean(ours),
      allWebhooks: all.map((w) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        status: w.status,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = checkSetupToken(request);
  if (denied) return denied;

  if (!process.env.CLERK_SECRET_KEY) {
    return NextResponse.json({ error: 'CLERK_SECRET_KEY not set' }, { status: 500 });
  }

  try {
    const existing = await listWebhooks();
    const ours = existing.find((w) => w.url === WEBHOOK_URL);
    if (ours) {
      // Verify event subscriptions match. If not, update.
      const missing = SUBSCRIBED_EVENTS.filter((e) => !ours.events.includes(e));
      if (missing.length === 0) {
        return NextResponse.json({
          ok: true,
          alreadyExisted: true,
          webhookId: ours.id,
          events: ours.events,
        });
      }
      // Update events
      const updateResp = await fetch(`https://api.clerk.com/v1/webhook_endpoints/${ours.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: SUBSCRIBED_EVENTS }),
      });
      if (!updateResp.ok) {
        const text = await updateResp.text();
        return NextResponse.json(
          { error: `Clerk update failed: ${updateResp.status} ${text.slice(0, 500)}` },
          { status: 500 }
        );
      }
      const updated = (await updateResp.json()) as ClerkWebhook;
      return NextResponse.json({
        ok: true,
        alreadyExisted: true,
        webhookId: updated.id,
        events: updated.events,
        updated: true,
      });
    }

    const created = await createWebhook();
    return NextResponse.json({
      ok: true,
      alreadyExisted: false,
      webhookId: created.id,
      url: created.url,
      events: created.events,
      newSecretReturned: Boolean(created.secret),
      secret: created.secret ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
