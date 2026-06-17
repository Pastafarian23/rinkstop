/**
 * src/app/api/webhooks/didit/route.ts
 *
 * POST /api/webhooks/didit
 *
 * Didit webhook receiver. The PRIMARY signal that a session has completed.
 * The /api/identity/verify/decision route is a fallback for lost webhooks.
 *
 * Security:
 *   1. HMAC verify X-Signature-V2 over canonical JSON body (didit-webhook-verify.ts)
 *   2. Replay protection: reject if X-Timestamp > 300s old
 *   3. Dedupe: insert into webhook_events on success (Didit reuses event_id on retries)
 *   4. On DB failure: throw to trigger Didit retry (do NOT return 200)
 *
 * Subscribed events (per credentials/didit.json):
 *   - status.updated  (session status changed: in_progress → approved/declined/etc.)
 *   - data.updated    (session decision data was updated)
 *
 * Both fire for the same session when verification completes. We process
 * both idempotently — the second one just confirms the first.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyDiditWebhook } from '@/lib/didit-webhook-verify';
import { scrubDecision, deriveVerificationMethod } from '@/lib/didit-scrubber';

export const runtime = 'nodejs';   // need node:crypto

export async function POST(req: NextRequest) {
  const secret = process.env.DIDIT_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[didit/webhook] DIDIT_WEBHOOK_SECRET not set');
    return NextResponse.json(
      { error: 'misconfigured' },
      { status: 500 }
    );
  }

  // 1. Read raw body (must NOT be JSON-parsed before HMAC)
  const rawBody = await req.text();

  // 2. Verify signature
  const verification = verifyDiditWebhook({
    rawBody,
    headers: req.headers,
    secret,
  });
  if (!verification.valid) {
    console.warn('[didit/webhook] signature verification failed:', verification.reason);
    return NextResponse.json(
      { error: 'invalid_signature', reason: verification.reason },
      { status: 401 }
    );
  }
  const { eventId } = verification;

  // 3. Dedupe — check + insert into webhook_events
  // If insert fails with unique violation, this is a retry. Skip processing.
  const { error: dedupeErr } = await supabaseAdmin
    .from('webhook_events')
    .insert({ event_id: eventId, source: 'didit' });

  if (dedupeErr) {
    // Postgres unique violation = already processed
    if (dedupeErr.code === '23505') {
      return NextResponse.json({ received: true, deduped: true });
    }
    // Other DB errors: throw to trigger Didit retry
    console.error('[didit/webhook] webhook_events insert failed:', dedupeErr);
    throw new Error('webhook_events_insert_failed');
  }

  // 4. Parse body
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch (err) {
    console.error('[didit/webhook] body parse failed after signature verify:', err);
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // 5. Extract event fields
  // Didit V3 event shape: { event, session_id, workflow_id, data, ... }
  const event = body.event || body.event_type || 'unknown';
  const sessionId = body.session_id || body.data?.session_id;
  if (!sessionId) {
    console.warn('[didit/webhook] event missing session_id:', body);
    return NextResponse.json({ received: true, ignored: 'no_session_id' });
  }

  // 6. Find our local session row
  const { data: sessionRow, error: sessionErr } = await supabaseAdmin
    .from('didit_sessions')
    .select('id, user_id, status')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (sessionErr) {
    console.error('[didit/webhook] didit_sessions lookup failed:', sessionErr);
    throw new Error('session_lookup_failed');
  }
  if (!sessionRow) {
    console.warn(`[didit/webhook] no local session for session_id=${sessionId}`);
    // Don't throw — Didit may have been testing or this is a session from before our integration
    return NextResponse.json({ received: true, ignored: 'unknown_session' });
  }

  // 7. For status.updated events, the data field has the new status
  // For data.updated events, the data field has the full decision
  let newStatus: string | undefined;
  let rawDecision: any | undefined;

  if (event.includes('status')) {
    // status.updated: { event, session_id, status, ... }
    newStatus = String(body.status || '').toLowerCase();
  }
  if (event.includes('data') || body.data) {
    // data.updated or any payload that includes a decision: { event, session_id, data: {...decision} }
    rawDecision = body.data?.decision || body.data || body.decision;
  }

  // If neither status nor decision present, we can't process meaningfully
  if (!newStatus && !rawDecision) {
    return NextResponse.json({ received: true, ignored: 'no_state_change' });
  }

  try {
    // 8. Update didit_sessions with the new state
    const updateFields: Record<string, any> = {
      event_ids: undefined,   // will overwrite below with array append
      updated_at: new Date().toISOString(),
    };
    if (newStatus) updateFields.status = newStatus;
    if (rawDecision) {
      updateFields.decision = scrubDecision(rawDecision);
      if (typeof rawDecision.cost_cents === 'number') {
        updateFields.cost_cents = rawDecision.cost_cents;
      }
    }
    if (newStatus && ['approved', 'declined', 'abandoned'].includes(newStatus)) {
      updateFields.completed_at = new Date().toISOString();
    }

    // Append the event_id to event_ids[] (atomic via SQL RPC or just do a fetch+update).
    // For simplicity, we read the current array and append.
    const { data: current } = await supabaseAdmin
      .from('didit_sessions')
      .select('event_ids')
      .eq('id', sessionRow.id)
      .maybeSingle();
    const existingEventIds: string[] = current?.event_ids || [];
    if (!existingEventIds.includes(eventId)) {
      updateFields.event_ids = [...existingEventIds, eventId];
    } else {
      delete updateFields.event_ids;   // already recorded
    }

    const { error: updateErr } = await supabaseAdmin
      .from('didit_sessions')
      .update(updateFields)
      .eq('id', sessionRow.id);

    if (updateErr) {
      console.error('[didit/webhook] didit_sessions update failed:', updateErr);
      throw new Error('session_update_failed');
    }

    // 9. If approved, update profiles. The verification expires 2 years from now.
    if (newStatus === 'approved' && sessionRow.user_id) {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setFullYear(now.getFullYear() + 2);
      const method = rawDecision
        ? deriveVerificationMethod(rawDecision)
        : (sessionRow.status === 'approved' ? 'didit_passport' : 'didit_passport');

      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update({
          identity_verified_at: now.toISOString(),
          identity_verification_method: method,
          identity_expires_at: expiresAt.toISOString(),
          didit_session_id: sessionRow.id,
          updated_at: now.toISOString(),
        })
        .eq('user_id', sessionRow.user_id);

      if (profileErr) {
        console.error('[didit/webhook] profiles update failed:', profileErr);
        throw new Error('profile_update_failed');
      }
    }

    return NextResponse.json({ received: true, processed: true });
  } catch (err) {
    // Throw to trigger Didit retry on any DB failure.
    // The webhook_events insert will be a no-op on retry (we inserted already),
    // so the next retry will skip dedupe and go straight to processing.
    // ...wait, that means a retry will hit the processing again.
    // We need to roll back the webhook_events insert on processing failure.
    console.error('[didit/webhook] processing error, will retry:', err);
    // Best-effort rollback of dedupe
    await supabaseAdmin
      .from('webhook_events')
      .delete()
      .eq('event_id', eventId);
    throw err;
  }
}
