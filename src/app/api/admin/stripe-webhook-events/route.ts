import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAdminFromRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stripe-webhook-events
 *
 * Query params:
 *   ?status=received|processed|failed (optional)
 *   ?limit=50 (default 50, max 200)
 *   ?offset=0 (pagination)
 *
 * Returns the most recent Stripe webhook events for debugging.
 */
export async function GET(req: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0;

  let query = supabaseAdmin
    .from('stripe_webhook_events')
    .select('id, event_id, event_type, status, error, processed_at, created_at, payload', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && ['received', 'processed', 'failed'].includes(status)) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Trim payload for the list view (full payload only when ?full=1)
  const full = url.searchParams.get('full') === '1';
  const rows = (data || []).map((row) => ({
    id: row.id,
    event_id: row.event_id,
    event_type: row.event_type,
    status: row.status,
    error: row.error,
    processed_at: row.processed_at,
    created_at: row.created_at,
    payload_summary: full
      ? row.payload
      : {
          type: row.payload?.type,
          id: row.payload?.id,
          object_type: row.payload?.data?.object?.object,
          customer: row.payload?.data?.object?.customer,
          subscription: row.payload?.data?.object?.subscription,
          metadata: row.payload?.data?.object?.metadata,
          amount_paid: row.payload?.data?.object?.amount_paid,
        },
  }));

  return NextResponse.json({
    events: rows,
    total: count,
    limit,
    offset,
  });
}
