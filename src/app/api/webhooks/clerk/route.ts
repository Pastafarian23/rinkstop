/**
 * POST /api/webhooks/clerk
 *
 * The primary signal that a Clerk user has been created/updated/deleted.
 * Without this we have no source of truth for our `profiles` table — it
 * gets populated lazily the first time the user hits a page that calls
 * `ensureProfile()`. That means: no welcome email, no in-app settings
 * until they visit, and we have no record of users who sign up and never
 * come back.
 *
 * Subscribed events (Arnel must configure in Clerk dashboard):
 *   - user.created
 *   - user.updated
 *   - user.deleted  (we soft-delete: leave profile row, mark gone)
 *
 * Security:
 *   1. Svix signature verification on every request (CLERK_WEBHOOK_SECRET).
 *   2. Reject if timestamp is > 5 min old (Svix handles this).
 *   3. Idempotent: user.updated can fire many times for the same user.
 *
 * Side effects (on user.created only):
 *   - Insert profile row (idempotent: ON CONFLICT DO NOTHING)
 *   - Queue welcome email (best-effort, never blocks)
 *
 * Setup steps for Arnel (one-time, in Clerk dashboard):
 *   1. Webhooks → Add Endpoint
 *   2. URL: https://rinkstop.com/api/webhooks/clerk
 *   3. Events: user.created, user.updated, user.deleted
 *   4. Copy Signing Secret → Vercel env var CLERK_WEBHOOK_SECRET
 *
 * Cost: $0 (Clerk webhooks are free).
 */

import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

interface ClerkEmailAddress {
  id: string;
  email_address: string;
  verification?: { status?: string };
}

interface ClerkUserPayload {
  id: string; // Clerk user id, e.g. "user_2abc..."
  object?: 'user';
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  email_addresses?: ClerkEmailAddress[];
  primary_email_address_id?: string | null;
  created_at?: number;
  updated_at?: number;
  deleted?: boolean;
}

interface SvixHeaders {
  'svix-id': string;
  'svix-timestamp': string;
  'svix-signature': string;
}

function readSvixHeaders(req: NextRequest): SvixHeaders | null {
  const id = req.headers.get('svix-id');
  const ts = req.headers.get('svix-timestamp');
  const sig = req.headers.get('svix-signature');
  if (!id || !ts || !sig) return null;
  return { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': sig };
}

function pickPrimaryEmail(payload: ClerkUserPayload): string | null {
  if (!payload.email_addresses || payload.email_addresses.length === 0) return null;
  const primaryId = payload.primary_email_address_id;
  if (primaryId) {
    const found = payload.email_addresses.find((e) => e.id === primaryId);
    if (found?.email_address) return found.email_address;
  }
  return payload.email_addresses[0]?.email_address ?? null;
}

function pickDisplayName(payload: ClerkUserPayload): string | null {
  if (payload.first_name || payload.last_name) {
    return [payload.first_name, payload.last_name].filter(Boolean).join(' ').trim() || null;
  }
  if (payload.username) return payload.username;
  return null;
}

/**
 * Pick a default username. We only set one on user.created if Clerk didn't
 * provide a username — never overwrite a user-chosen handle on user.updated.
 */
function pickDefaultUsername(payload: ClerkUserPayload): string | null {
  if (payload.username) return payload.username;
  // Fallback: take the email local part. Username-uniqueness is enforced by
  // a DB constraint + the username-server helpers; we may need to handle
  // collisions, but that's an edge case and we can backfill later.
  const email = pickPrimaryEmail(payload);
  if (!email) return null;
  const local = email.split('@')[0] || '';
  return local.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24) || null;
}

export async function POST(request: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[clerk-webhook] CLERK_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'webhook secret not configured' }, { status: 500 });
  }

  const svix = readSvixHeaders(request);
  if (!svix) {
    return NextResponse.json({ error: 'missing svix headers' }, { status: 400 });
  }

  // Svix requires the raw body for signature verification.
  const payload = await request.text();
  const wh = new Webhook(secret);
  let event: { type: string; data: ClerkUserPayload };
  try {
    event = wh.verify(payload, svix) as { type: string; data: ClerkUserPayload };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[clerk-webhook] signature verification failed:', msg);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  const { type, data } = event;
  if (!data?.id) {
    return NextResponse.json({ error: 'missing user id' }, { status: 400 });
  }

  try {
    switch (type) {
      case 'user.created':
        return await handleUserCreated(data);
      case 'user.updated':
        return await handleUserUpdated(data);
      case 'user.deleted':
        return await handleUserDeleted(data);
      default:
        // Acknowledge unknown events so Clerk doesn't retry forever.
        return NextResponse.json({ ok: true, skipped: type });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[clerk-webhook] handler failed for ${type}: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handleUserCreated(data: ClerkUserPayload) {
  const email = pickPrimaryEmail(data);
  const displayName = pickDisplayName(data);
  const username = pickDefaultUsername(data);
  const avatarUrl = data.image_url ?? null;

  // Insert idempotently — if the profile already exists (lazy ensureProfile
  // beat us to it), we update from Clerk instead of failing.
  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        user_id: data.id,
        email,
        display_name: displayName,
        username,
        avatar_url: avatarUrl,
        tier: 'free',
        role: 'user',
      },
      { onConflict: 'user_id', ignoreDuplicates: false }
    );

  if (error) {
    throw new Error(`profile upsert failed: ${error.message}`);
  }

  // Welcome email (best-effort, never blocks).
  if (email) {
    void sendEmail({
      to: email,
      subject: 'Welcome to RinkStop',
      template: 'welcome',
      data: { displayName, username },
      tag: 'welcome',
    });
  }

  return NextResponse.json({ ok: true, event: 'user.created', userId: data.id });
}

async function handleUserUpdated(data: ClerkUserPayload) {
  const email = pickPrimaryEmail(data);
  const displayName = pickDisplayName(data);
  const avatarUrl = data.image_url ?? null;

  // Don't touch username on update — user may have set a custom one.
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      email,
      display_name: displayName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', data.id);

  if (error) {
    throw new Error(`profile update failed: ${error.message}`);
  }

  return NextResponse.json({ ok: true, event: 'user.updated', userId: data.id });
}

async function handleUserDeleted(data: ClerkUserPayload) {
  // Soft-delete: mark the profile's email/username as nulled but keep the row
  // for audit trail. Connections, threads, and team memberships remain in
  // place; we just lose the personal info. RLS already prevents read access
  // for non-self users.
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      email: null,
      display_name: null,
      avatar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', data.id);

  if (error) {
    throw new Error(`profile soft-delete failed: ${error.message}`);
  }

  return NextResponse.json({ ok: true, event: 'user.deleted', userId: data.id });
}
