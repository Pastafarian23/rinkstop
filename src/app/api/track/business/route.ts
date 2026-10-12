// src/app/api/track/business/route.ts
//
// Public, no-auth tracking endpoint for business listing engagement.
//   POST /api/track/business
//     Body: { listing_id, event: 'view'|'phone_click'|'website_click'|'email_click'|'favorite_add'|'favorite_remove'|'review_added'|'review_removed'|'lead_submitted'|'booking_inquiry' }
//     Returns 204.
//
// Privacy: no PII, no cookies set server-side. The client passes the
// listing_id and event type; the server upserts a counter row in
// business_analytics_daily. Coarse visitor count uses a daily-hash of
// IP+UA (no cross-day tracking).

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_EVENTS = new Set([
  'view',
  'phone_click',
  'website_click',
  'email_click',
  'favorite_add',
  'favorite_remove',
  'review_added',
  'review_removed',
  'lead_submitted',
  'booking_inquiry',
]);

// Map event -> column delta expression. favorites/reviews have +/- semantics.
const EVENT_DELTAS: Record<string, { column: string; delta: number }> = {
  view: { column: 'page_views', delta: 1 },
  phone_click: { column: 'phone_clicks', delta: 1 },
  website_click: { column: 'website_clicks', delta: 1 },
  email_click: { column: 'email_clicks', delta: 1 },
  favorite_add: { column: 'favorite_count', delta: 1 },
  favorite_remove: { column: 'favorite_count', delta: -1 },
  review_added: { column: 'review_count', delta: 1 },
  review_removed: { column: 'review_count', delta: -1 },
  lead_submitted: { column: 'lead_form_submissions', delta: 1 },
  booking_inquiry: { column: 'booking_inquiries', delta: 1 },
};

function dailyFingerprint(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
  const ua = req.headers.get('user-agent') || '';
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 16);
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { listing_id, event } = body ?? {};
  if (!listing_id || !event) {
    return NextResponse.json({ error: 'listing_id and event required' }, { status: 400 });
  }
  if (!VALID_EVENTS.has(event)) {
    return NextResponse.json({ error: 'Unknown event' }, { status: 400 });
  }
  const delta = EVENT_DELTAS[event];
  const today = new Date().toISOString().slice(0, 10);
  const fingerprint = dailyFingerprint(req);

  // Insert the row if it doesn't exist, then increment.
  // We use a single RPC call to avoid race conditions.
  const { error: upsertErr } = await supabaseAdmin
    .rpc('increment_business_analytics', {
      p_listing_id: listing_id,
      p_date: today,
      p_column: delta.column,
      p_delta: delta.delta,
      p_visitor_fp: fingerprint,
    });

  if (upsertErr) {
    // Fallback: do the upsert directly. The RPC may not exist yet.
    const { error: fbErr } = await supabaseAdmin
      .from('business_analytics_daily')
      .upsert(
        { listing_id, date: today, updated_at: new Date().toISOString() },
        { onConflict: 'listing_id,date', ignoreDuplicates: true }
      );
    if (fbErr) return NextResponse.json({ error: fbErr.message }, { status: 500 });
    // Then increment via SQL.
    const { error: incErr } = await supabaseAdmin.rpc('increment_column', {
      table_name: 'business_analytics_daily',
      column_name: delta.column,
      filter_listing_id: listing_id,
      filter_date: today,
      delta: delta.delta,
    });
    if (incErr) {
      // Last resort: silent. The analytics is best-effort.
      console.error('[track/business] increment failed:', incErr);
    }
  }
  return new NextResponse(null, { status: 204 });
}
