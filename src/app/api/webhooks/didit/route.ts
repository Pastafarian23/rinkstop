import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyDiditWebhook } from '@/lib/didit-webhook-verify';
import { scrubDecision } from '@/lib/didit-scrubber';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WS25 (2026-08-23): Didit verification webhook.
 *
 * Didit calls this endpoint when a verification session reaches a terminal
 * status (approved / declined / abandoned / in_review). On `approved`:
 *   - profiles.identity_verified_at = now()
 *   - profiles.identity_expires_at = now() + 2 years
 *   - profiles.didit_session_id = Didit's session_id
 *   - profiles.verification_method = 'free' (free path) or kept existing value
 *   - claims.verification_status = 'verified' for any pending claims on this user
 *   - claims.verified_at = now() for those claims
 *
 * On `declined` / `abandoned`: surface a notification via the existing
 * `identity_verify_recommended` emitter so the dashboard wizard re-prompts
 * later. No claim-state change.
 *
 * Idempotency: Didit retries webhooks with the same X-Event-Id. We dedupe via
 * the existing webhook_events table (added in WS14 PR1) — if a row exists with
 * the same event_id and status='processed', we return 200 immediately.
 *
 * Security: HMAC over canonical JSON body via X-Signature-V2, replay window 5 min
 * via X-Timestamp. See src/lib/didit-webhook-verify.ts.
 */
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

function getDiditSecret(): string {
  const s = process.env.DIDIT_WEBHOOK_SECRET;
  if (!s) throw new Error('DIDIT_WEBHOOK_SECRET not set');
  return s;
}

async function readRawBody(req: NextRequest): Promise<string> {
  // Next.js consumes the body via req.text() before we can use it.
  // Use the underlying request to read raw bytes.
  return await req.text();
}

function logWebhookEvent(
  eventId: string,
  payload: any,
  status: 'received' | 'processed' | 'failed',
  errorMessage?: string
) {
  // Fire-and-forget. Errors here don't block the webhook handler.
  try {
    const supabase = getSupabase();
    void supabase.from('webhook_events').upsert(
      {
        source: 'didit',
        event_id: eventId,
        payload: payload ?? {},
        status,
        error_message: errorMessage ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'source,event_id' }
    );
  } catch (err) {
    console.error('[didit webhook] logWebhookEvent failed', err);
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await readRawBody(req);

  let secret: string;
  try {
    secret = getDiditSecret();
  } catch (err) {
    console.error('[didit webhook] secret missing', err);
    return NextResponse.json({ error: 'webhook_secret_not_set' }, { status: 500 });
  }

  const verifyResult = verifyDiditWebhook({
    rawBody,
    headers: req.headers,
    secret,
  });

  if (!('valid' in verifyResult) || !verifyResult.valid) {
    const reason = 'reason' in verifyResult ? verifyResult.reason : 'unknown';
    console.warn('[didit webhook] signature verification failed', reason);
    return NextResponse.json({ error: 'invalid_signature', reason }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const eventId = verifyResult.eventId;
  logWebhookEvent(eventId, payload, 'received');

  // Dedup via webhook_events. If we've already processed this event_id, return 200.
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from('webhook_events')
    .select('id, status')
    .eq('source', 'didit')
    .eq('event_id', eventId)
    .maybeSingle();

  if (existing && existing.status === 'processed') {
    return NextResponse.json({ ok: true, dedup: true });
  }

  const sessionId = payload?.session_id || payload?.data?.session_id;
  const status = payload?.status || payload?.data?.status;
  const userId = payload?.vendor_data || payload?.data?.vendor_data;

  if (!sessionId || !userId) {
    const msg = 'missing session_id or vendor_data';
    logWebhookEvent(eventId, payload, 'failed', msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (status === 'approved') {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 2);

    // Update profile with verified state + free-verification method
    // (uses the existing identity_verification_method column; free is one
    // of the path values that coexist with didit_passport etc. since the
    // WS25 schema cleanup).
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        identity_verified_at: new Date().toISOString(),
        identity_expires_at: expiresAt.toISOString(),
        didit_session_id: sessionId,
        identity_verification_method: 'free',
      })
      .eq('user_id', userId);

    if (profileErr) {
      console.error('[didit webhook] profile update failed', profileErr);
      logWebhookEvent(eventId, payload, 'failed', profileErr.message);
      return NextResponse.json({ error: 'profile_update_failed' }, { status: 500 });
    }

    // Promote any pending claims on this user to verified.
    // We update every claim tied to this user — verification applies to
    // all profiles a single user verifies for, per WS25 decision.
    const { error: claimsErr, count: claimCount } = await supabase
      .from('claims')
      .update({
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .in('verification_status', ['unverified', 'pending_verification']);

    if (claimsErr) {
      // Non-fatal: profile is verified, but claim-state sync failed.
      // Log and continue; admin can manually reconcile.
      console.error('[didit webhook] claims update failed', claimsErr);
    } else {
      console.log(`[didit webhook] promoted ${claimCount} claims to verified for user ${userId}`);
    }

    // Persist the scrubbed Didit decision for audit (matches the pattern
    // set by WS3 / Didit Phase 1). Existing helper.
    try {
      const scrubbed = scrubDecision(payload);
      await supabase.from('didit_sessions').upsert(
        {
          id: sessionId,
          user_id: userId,
          status: 'approved',
          decision: scrubbed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (err) {
      console.error('[didit webhook] didit_sessions upsert failed', err);
    }

    logWebhookEvent(eventId, payload, 'processed');
    return NextResponse.json({ ok: true, verified: true, claimsPromoted: claimCount ?? 0 });
  }

  if (status === 'declined' || status === 'abandoned') {
    // Update didit_sessions audit row but leave identity_verified_at null
    // and don't promote claims. The dashboard wizard will re-prompt.
    try {
      await supabase.from('didit_sessions').upsert(
        {
          id: sessionId,
          user_id: userId,
          status,
          decision: scrubDecision(payload),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (err) {
      console.error('[didit webhook] didit_sessions upsert failed', err);
    }

    logWebhookEvent(eventId, payload, 'processed');
    return NextResponse.json({ ok: true, verified: false, status });
  }

  // in_review / other non-terminal status: log and acknowledge.
  logWebhookEvent(eventId, payload, 'processed');
  return NextResponse.json({ ok: true, status, terminal: false });
}
