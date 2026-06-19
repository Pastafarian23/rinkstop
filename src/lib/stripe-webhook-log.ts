import { supabaseAdmin } from '@/lib/supabase';

/**
 * Stripe webhook event persistence.
 *
 * Why: Stripe webhook handler only console.logs. When a customer reports
 * "I paid but my tier didn't upgrade", we have no way to debug without
 * grepping Vercel logs (which expire). This writes one row per event so
 * the admin can see exactly what Stripe sent, what we did with it, and
 * whether it errored.
 *
 * Pattern:
 *   const eventId = await logReceived(event);   // status=received
 *   try {
 *     await handle(event);
 *     await markProcessed(eventId);
 *   } catch (e) {
 *     await markFailed(eventId, e.message);
 *     throw e;
 *   }
 *
 * Idempotency: Stripe event.id is unique. If a duplicate arrives (Stripe
 * retries the same event), the insert fails silently — we still get back
 * the existing row id. Stripe's documented behavior, no need to panic.
 */

interface InsertResult {
  id: string;
  alreadyExisted: boolean;
}

export async function logReceived(event: any): Promise<InsertResult> {
  const { data, error } = await supabaseAdmin
    .from('stripe_webhook_events')
    .insert({
      event_id: event.id,
      event_type: event.type,
      status: 'received',
      payload: event,
    })
    .select('id')
    .single();

  if (error) {
    // 23505 = unique violation — duplicate event id (Stripe retried). Fetch existing.
    if (error.code === '23505') {
      const { data: existing } = await supabaseAdmin
        .from('stripe_webhook_events')
        .select('id')
        .eq('event_id', event.id)
        .single();
      if (existing) {
        return { id: existing.id, alreadyExisted: true };
      }
    }
    // Anything else: log + return a fake id so the caller can still mark
    // processed/failed. The actual error is visible in Vercel logs.
    console.error('[stripe-webhook-log] failed to log received:', error.message);
    return { id: 'unknown', alreadyExisted: false };
  }
  return { id: data.id, alreadyExisted: false };
}

export async function markProcessed(eventRowId: string): Promise<void> {
  if (eventRowId === 'unknown') return;
  const { error } = await supabaseAdmin
    .from('stripe_webhook_events')
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('id', eventRowId);
  if (error) {
    console.error('[stripe-webhook-log] failed to mark processed:', error.message);
  }
}

export async function markFailed(eventRowId: string, errorMsg: string): Promise<void> {
  if (eventRowId === 'unknown') return;
  const truncated = errorMsg.length > 2000 ? errorMsg.slice(0, 2000) + '…' : errorMsg;
  const { error } = await supabaseAdmin
    .from('stripe_webhook_events')
    .update({ status: 'failed', error: truncated })
    .eq('id', eventRowId);
  if (error) {
    console.error('[stripe-webhook-log] failed to mark failed:', error.message);
  }
}
