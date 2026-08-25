// src/app/api/owner/rinks/[id]/events/[eventId]/divisions/route.ts
//
// WS17 PR3b - Owner divisions list + create.
//
//   GET  /api/owner/rinks/[id]/events/[eventId]/divisions
//   POST /api/owner/rinks/[id]/events/[eventId]/divisions
//
// RLS-gated: signed-in user must own the rink.

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwner } from '@/lib/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

const SKILL_LEVELS = new Set(['all','beginner','intermediate','advanced','elite','aaa','aa','a','b','c']);
const GENDERS = new Set(['boys','girls','men','women','coed','open']);
const DIVISION_STATUSES = new Set(['open','closed','waitlist','cancelled']);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function asIntOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isInteger(v)) return NaN;
  return v;
}

function validateCreateBody(body: Record<string, unknown>): string | null {
  if (!body || typeof body !== 'object') return 'Body must be JSON.';
  if (typeof body.name !== 'string' || body.name.trim().length === 0) return 'name is required.';
  if (body.sort_order !== undefined && (typeof body.sort_order !== 'number' || !Number.isInteger(body.sort_order))) {
    return 'sort_order must be an integer.';
  }
  if (body.birth_year_min !== undefined && (typeof body.birth_year_min !== 'number' || !Number.isInteger(body.birth_year_min))) {
    return 'birth_year_min must be an integer.';
  }
  if (body.birth_year_max !== undefined && (typeof body.birth_year_max !== 'number' || !Number.isInteger(body.birth_year_max))) {
    return 'birth_year_max must be an integer.';
  }
  if (body.skill_level !== undefined && !SKILL_LEVELS.has(body.skill_level as string)) {
    return `skill_level must be one of: ${[...SKILL_LEVELS].join(', ')}.`;
  }
  if (body.gender !== undefined && !GENDERS.has(body.gender as string)) {
    return `gender must be one of: ${[...GENDERS].join(', ')}.`;
  }
  if (body.status !== undefined && !DIVISION_STATUSES.has(body.status as string)) {
    return `status must be one of: ${[...DIVISION_STATUSES].join(', ')}.`;
  }
  const capacity = asIntOrNull(body.capacity);
  if (capacity !== undefined && Number.isNaN(capacity)) return 'capacity must be an integer.';
  if (capacity !== undefined && capacity !== null && capacity <= 0) return 'capacity must be positive.';
  const spots = asIntOrNull(body.spots_remaining);
  if (spots !== undefined && Number.isNaN(spots)) return 'spots_remaining must be an integer.';
  return null;
}

async function verifyEventOwnership(
  request: NextRequest,
  rinkId: string,
  eventId: string,
): Promise<{ owner: { userId: string; rinkId: string } } | { response: NextResponse }> {
  const owner = await requireRinkOwner(request, rinkId);
  if ('response' in owner) return owner;

  // Verify the event belongs to this rink
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const rl = await checkRateLimit(`owner-divisions-list:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const { id, eventId } = await params;
  const owner = await verifyEventOwnership(request, id, eventId);
  if ('response' in owner) return owner.response;

  const { data, error } = await supabaseAdmin
    .from('event_divisions')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[owner-divisions] list failed', error);
    return NextResponse.json({ error: 'Failed to load divisions.' }, { status: 500 });
  }

  return NextResponse.json({ divisions: data || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const rl = await checkRateLimit(`owner-divisions-create:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const { id, eventId } = await params;
  const owner = await verifyEventOwnership(request, id, eventId);
  if ('response' in owner) return owner.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Body must be valid JSON.');
  }

  const validationError = validateCreateBody(body);
  if (validationError) return badRequest(validationError);

  const insert = {
    event_id: eventId,
    name: (body.name as string).trim(),
    sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
    birth_year_min: asIntOrNull(body.birth_year_min) ?? null,
    birth_year_max: asIntOrNull(body.birth_year_max) ?? null,
    skill_level: (body.skill_level as string) ?? 'all',
    gender: (body.gender as string) ?? 'coed',
    capacity: asIntOrNull(body.capacity) ?? null,
    spots_remaining: asIntOrNull(body.spots_remaining) ?? null,
    status: (body.status as string) ?? 'open',
  };

  const { data, error } = await supabaseAdmin
    .from('event_divisions')
    .insert(insert)
    .select()
    .single();

  if (error) {
    if (String(error.code || '').startsWith('23')) {
      return NextResponse.json({ error: 'A division with this name already exists for this event.' }, { status: 409 });
    }
    console.error('[owner-divisions] insert failed', error);
    return NextResponse.json({ error: 'Failed to create division.' }, { status: 500 });
  }

  return NextResponse.json({ division: data }, { status: 201 });
}
