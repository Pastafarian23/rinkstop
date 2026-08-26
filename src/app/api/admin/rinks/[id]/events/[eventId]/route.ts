// src/app/api/admin/rinks/[id]/events/[eventId]/route.ts
//
// WS17 PR1 - single event admin CRUD.
//
//   PATCH  /api/admin/rinks/[id]/events/[eventId]
//   DELETE /api/admin/rinks/[id]/events/[eventId]

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

// title and slug editable (slug only if a custom slug was added; default
// derivation is one-time at insert). rink_id NOT editable.
const ALLOWED_FIELDS = new Set([
  'title','subtitle','description','event_type',
  'starts_at','ends_at','timezone',
  'registration_opens_at','registration_closes_at',
  'venue_name','address','latitude','longitude',
  'price_cents','currency','early_bird_price_cents','early_bird_until',
  'capacity','spots_remaining','waitlist_enabled',
  'banner_image_url','logo_url',
  'registration_url','registration_method',
  'eventconnect_id','sportninja_id',
  'hotel_partner_url','hotel_discount_code','hotel_block_until',
  'status','visibility','source_url','tags','slug',
]);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const rl = await checkRateLimit(`admin-rink-events-patch:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const gate = await getAdminFromRequest(request, 'admin_rinks_events_[eventId]');
  if ('response' in gate) return gate.response;
  const { id, eventId } = await params;
  if (!id || !eventId) return badRequest('rink id and event id are required.');

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Body must be valid JSON.');
  }
  const keys = Object.keys(body || {});
  if (keys.length === 0) return badRequest('No fields to update.');
  for (const k of keys) {
    if (!ALLOWED_FIELDS.has(k)) return badRequest(`Field "${k}" is not editable on this endpoint.`);
  }

  const updates: Record<string, any> = { updated_by: gate.admin.userId };
  for (const k of keys) {
    // Normalize date fields if present
    if ((k === 'starts_at' || k === 'ends_at' || k === 'registration_opens_at' || k === 'registration_closes_at' || k === 'early_bird_until')
        && typeof body[k] === 'string' && body[k].length > 0) {
      const d = new Date(body[k]);
      if (isNaN(d.getTime())) return badRequest(`${k} is not a valid ISO timestamp.`);
      updates[k] = d.toISOString();
    } else if (k === 'hotel_block_until' && typeof body[k] === 'string' && body[k].length > 0) {
      updates[k] = body[k];
    } else {
      updates[k] = body[k];
    }
  }

  const { data, error } = await supabaseAdmin
    .from('rink_events')
    .update(updates)
    .eq('id', eventId)
    .eq('rink_id', id)
    .select()
    .maybeSingle();
  if (error) {
    if (String(error.code || '').startsWith('23')) {
      return badRequest(`DB constraint: ${error.message}`);
    }
    console.error('[admin-rink-events] update failed', error);
    return NextResponse.json({ error: 'Failed to update event.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'event_not_found' }, { status: 404 });

  return NextResponse.json({ event: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const rl = await checkRateLimit(`admin-rink-events-delete:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const gate = await getAdminFromRequest(request, 'admin_rinks_events_[eventId]');
  if ('response' in gate) return gate.response;
  const { id, eventId } = await params;
  if (!id || !eventId) return badRequest('rink id and event id are required.');

  const { data, error } = await supabaseAdmin
    .from('rink_events')
    .delete()
    .eq('id', eventId)
    .eq('rink_id', id)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('[admin-rink-events] delete failed', error);
    return NextResponse.json({ error: 'Failed to delete event.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'event_not_found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
