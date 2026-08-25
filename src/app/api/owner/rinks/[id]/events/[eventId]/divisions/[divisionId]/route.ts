// src/app/api/owner/rinks/[id]/events/[eventId]/divisions/[divisionId]/route.ts
//
// WS17 PR3b - Owner division PATCH + DELETE.
//
//   PATCH /api/owner/rinks/[id]/events/[eventId]/divisions/[divisionId]
//   DELETE /api/owner/rinks/[id]/events/[eventId]/divisions/[divisionId]
//
// RLS-gated: signed-in user must own the rink.

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwner } from '@/lib/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

const ALLOWED_FIELDS = new Set([
  'name','sort_order','birth_year_min','birth_year_max',
  'skill_level','gender','capacity','spots_remaining','status',
]);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function asIntOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isInteger(v)) return NaN;
  return v;
}

async function verifyEventOwnership(
  request: NextRequest,
  rinkId: string,
  eventId: string,
): Promise<{ owner: { userId: string; rinkId: string } } | { response: NextResponse }> {
  const owner = await requireRinkOwner(request, rinkId);
  if ('response' in owner) return owner;

  const { data: event } = await supabaseAdmin
    .from('rink_events')
    .select('id')
    .eq('id', eventId)
    .eq('rink_id', owner.owner.rinkId)
    .maybeSingle();

  if (!event) {
    return { response: NextResponse.json({ error: 'Event not found.' }, { status: 404 }) };
  }

  return owner;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string; divisionId: string }> },
) {
  const rl = await checkRateLimit(`owner-division-patch:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const { id, eventId, divisionId } = await params;
  const owner = await verifyEventOwnership(request, id, eventId);
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
    if (!ALLOWED_FIELDS.has(k)) return badRequest(`Field "${k}" is not editable.`);
  }

  const updates: Record<string, unknown> = {};
  for (const k of keys) {
    if (k === 'birth_year_min' || k === 'birth_year_max' || k === 'sort_order') {
      const v = asIntOrNull(body[k]);
      updates[k] = v;
    } else if (k === 'capacity' || k === 'spots_remaining') {
      const v = asIntOrNull(body[k]);
      updates[k] = v;
    } else {
      updates[k] = body[k];
    }
  }

  const { data, error } = await supabaseAdmin
    .from('event_divisions')
    .update(updates)
    .eq('id', divisionId)
    .eq('event_id', eventId)
    .select()
    .maybeSingle();

  if (error) {
    if (String(error.code || '').startsWith('23')) {
      return NextResponse.json({ error: 'A division with this name already exists for this event.' }, { status: 409 });
    }
    console.error('[owner-division] patch failed', error);
    return NextResponse.json({ error: 'Failed to update division.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'division_not_found' }, { status: 404 });

  return NextResponse.json({ division: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string; divisionId: string }> },
) {
  const rl = await checkRateLimit(`owner-division-delete:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const { id, eventId, divisionId } = await params;
  const owner = await verifyEventOwnership(request, id, eventId);
  if ('response' in owner) return owner.response;

  const { data, error } = await supabaseAdmin
    .from('event_divisions')
    .delete()
    .eq('id', divisionId)
    .eq('event_id', eventId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[owner-division] delete failed', error);
    return NextResponse.json({ error: 'Failed to delete division.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'division_not_found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
