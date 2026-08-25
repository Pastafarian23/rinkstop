// src/app/api/owner/rinks/[id]/events/[eventId]/route.ts
//
// WS17 PR3b - Owner event PATCH + DELETE.
//
//   PATCH /api/owner/rinks/[id]/events/[eventId]
//   DELETE /api/owner/rinks/[id]/events/[eventId]
//
// RLS-gated: signed-in user must own the rink (rinks.claimed_by_user_id).

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwner } from '@/lib/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

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
  'status','visibility','source_url','tags',
]);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const rl = await checkRateLimit(`owner-rink-events-patch:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const { id, eventId } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  let body: Record<string, unknown>;
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

  const updates: Record<string, unknown> = {};
  for (const k of keys) {
    if ((k === 'starts_at' || k === 'ends_at' || k === 'registration_opens_at' ||
         k === 'registration_closes_at' || k === 'early_bird_until' || k === 'hotel_block_until')
        && typeof body[k] === 'string' && (body[k] as string).length > 0) {
      const d = new Date(body[k] as string);
      if (isNaN(d.getTime())) return badRequest(`${k} is not a valid ISO timestamp.`);
      updates[k] = d.toISOString();
    } else {
      updates[k] = body[k];
    }
  }

  const { data, error } = await supabaseAdmin
    .from('rink_events')
    .update(updates)
    .eq('id', eventId)
    .eq('rink_id', owner.owner.rinkId)
    .select()
    .maybeSingle();

  if (error) {
    if (String(error.code || '').startsWith('23')) {
      return badRequest(`DB constraint: ${error.message}`);
    }
    console.error('[owner-events] patch failed', error);
    return NextResponse.json({ error: 'Failed to update event.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'event_not_found' }, { status: 404 });

  return NextResponse.json({ event: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const rl = await checkRateLimit(`owner-rink-events-delete:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const { id, eventId } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  const { data, error } = await supabaseAdmin
    .from('rink_events')
    .delete()
    .eq('id', eventId)
    .eq('rink_id', owner.owner.rinkId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[owner-events] delete failed', error);
    return NextResponse.json({ error: 'Failed to delete event.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'event_not_found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
