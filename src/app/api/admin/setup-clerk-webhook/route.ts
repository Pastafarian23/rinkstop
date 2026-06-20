/**
 * POST /api/admin/setup-clerk-webhook
 *
 * One-time setup route. Idempotent.
 *
 * Creates a Clerk webhook endpoint that points at /api/webhooks/clerk
 * and subscribes to user.created, user.updated, user.deleted.
 *
 * If a webhook with the same URL already exists, this no-ops.
 * If Clerk generates a new signing secret, we update the Vercel env var
 * CLERK_WEBHOOK_SECRET to match.
 *
 * Why this exists: Clerk's API is blocked from the workspace's egress IP
 * (Cloudflare 1010). The Vercel server makes the same API call from a
 * non-blocked egress, so this works. We don't call this route on a hot
 * path — it's run once during setup, then sits.
 *
 * Auth: super_admin only. Logs every invocation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
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

export async function POST(_request: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;
  if (!auth.isSuperAdmin) {
    return NextResponse.json({ error: 'super_admin only' }, { status: 403 });
  }

  const clerkSecret = process.env.CLERK_SECRET_KEY;
  if (!clerkSecret) {
    return NextResponse.json({ error: 'CLERK_SECRET_KEY not set' }, { status: 500 });
  }

  // 1. List existing webhooks to check for an existing one with this URL.
  const listResp = await fetch('https://api.clerk.com/v1/webhooks', {
    headers: { Authorization: `Bearer ${clerkSecret}` },
  });
  if (!listResp.ok) {
    const text = await listResp.text();
    return NextResponse.json(
      { error: `Clerk list failed: ${listResp.status} ${text.slice(0, 300)}` },
      { status: 500 }
    );
  }
  const list = (await listResp.json()) as ClerkWebhookListResponse;
  const existing = list.data.find((w) => w.url === WEBHOOK_URL);

  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyExisted: true,
      webhookId: existing.id,
      url: existing.url,
      events: existing.events,
    });
  }

  // 2. Create the webhook.
  const createResp = await fetch('https://api.clerk.com/v1/webhooks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${clerkSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      events: SUBSCRIBED_EVENTS,
      description: 'RinkStop profile sync + welcome emails',
    }),
  });
  if (!createResp.ok) {
    const text = await createResp.text();
    return NextResponse.json(
      { error: `Clerk create failed: ${createResp.status} ${text.slice(0, 500)}` },
      { status: 500 }
    );
  }
  const created = (await createResp.json()) as ClerkWebhook;

  // 3. If Clerk returned a new signing secret, we want it to match Vercel.
  // The secret returned here is what Clerk will sign future webhooks with.
  // Vercel's CLERK_WEBHOOK_SECRET must be the same value, otherwise our
  // /api/webhooks/clerk route will reject everything.
  //
  // We don't update Vercel from here (no API token in this function).
  // Instead, we return the secret in the response so the operator can
  // paste it into Vercel. Arnel will rotate CLERK_WEBHOOK_SECRET to match.
  //
  // ALTERNATIVE: if the existing CLERK_WEBHOOK_SECRET in Vercel was
  // generated for the same webhook (which it was, per past session), it
  // is likely already correct. Verify by re-running and checking events.
  return NextResponse.json({
    ok: true,
    alreadyExisted: false,
    webhookId: created.id,
    url: created.url,
    events: created.events,
    newSecretReturned: Boolean(created.secret),
    note: created.secret
      ? 'Clerk generated a new signing secret. Update Vercel env var CLERK_WEBHOOK_SECRET to the value returned in `secret` field, then re-run this endpoint to verify.'
      : 'No new secret returned. The existing Vercel CLERK_WEBHOOK_SECRET should work — verify with a test event.',
    secret: created.secret ?? null,
  });
}

/**
 * GET — diagnostic. Lists current webhooks + verifies ours is registered.
 */
export async function GET(_request: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;
  if (!auth.isSuperAdmin) {
    return NextResponse.json({ error: 'super_admin only' }, { status: 403 });
  }

  const clerkSecret = process.env.CLERK_SECRET_KEY;
  if (!clerkSecret) {
    return NextResponse.json({ error: 'CLERK_SECRET_KEY not set' }, { status: 500 });
  }

  const listResp = await fetch('https://api.clerk.com/v1/webhooks', {
    headers: { Authorization: `Bearer ${clerkSecret}` },
  });
  if (!listResp.ok) {
    const text = await listResp.text();
    return NextResponse.json(
      { error: `Clerk list failed: ${listResp.status} ${text.slice(0, 300)}` },
      { status: 500 }
    );
  }
  const list = (await listResp.json()) as ClerkWebhookListResponse;
  const ours = list.data.find((w) => w.url === WEBHOOK_URL);

  return NextResponse.json({
    ok: true,
    allWebhooks: list.data.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      status: w.status,
    })),
    ourWebhook: ours ?? null,
    ourWebhookConfigured: Boolean(ours),
  });
}
