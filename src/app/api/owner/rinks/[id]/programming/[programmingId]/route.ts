// src/app/api/owner/rinks/[id]/programming/[programmingId]/route.ts
//
// WS17 PR3a - Owner API for single programming slot.
//
//   GET    /api/owner/rinks/[id]/programming/[programmingId]
//   PATCH  /api/owner/rinks/[id]/programming/[programmingId]
//   DELETE /api/owner/rinks/[id]/programming/[programmingId]
//
// RLS-gated: signed-in user must own the rink (rinks.claimed_by_user_id).
// DELETE is soft (sets status='archived') to preserve any historical
// references (e.g. past programming that visitors might link to).

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwner } from '@/lib/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

const SKILL_LEVELS = new Set(['all','beginner','intermediate','advanced','elite']);
const GENDERS = new Set(['all','boys','girls','men','women','coed']);
const STATUSES = new Set(['draft','published','archived']);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function asSmallintOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isInteger(v)) return NaN;
  return v;
}

function asTimeOrNull(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string') return null;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(v)) return null;
  return v;
}

function validatePatchBody(body: Record<string, any>): string | null {
  if (!body || typeof body !== 'object') return 'Body must be JSON.';
  if (body.day_of_week !== undefined) {
    if (typeof body.day_of_week !== 'number' || !Number.isInteger(body.day_of_week) || body.day_of_week < 0 || body.day_of_week > 6) {
      return 'day_of_week must be an integer 0-6.';
    }
  }
  if (body.start_time !== undefined) {
    const t = asTimeOrNull(body.start_time);
    if (body.start_time !== null && t === null) return 'start_time must be HH:MM.';
  }
  if (body.end_time !== undefined) {
    const t = asTimeOrNull(body.end_time);
    if (body.end_time !== null && t === null) return 'end_time must be HH:MM.';
  }
  if (body.start_time && body.end_time && (body.start_time as string) >= (body.end_time as string)) {
    return 'end_time must be after start_time.';
  }
  if (body.skill_level !== undefined && body.skill_level !== null && !SKILL_LEVELS.has(body.skill_level)) {
    return `skill_level must be one of: ${[...SKILL_LEVELS].join(', ')}.`;
  }
  if (body.gender !== undefined && body.gender !== null && !GENDERS.has(body.gender)) {
    return `gender must be one of: ${[...GENDERS].join(', ')}.`;
  }
  for (const k of ['age_min','age_max'] as const) {
    if (body[k] === undefined) continue;
    if (body[k] === null) continue;
    if (typeof body[k] !== 'number' || body[k] < 0 || body[k] > 99) return `${k} must be 0-99 or null.`;
  }
  if (body.age_min !== undefined && body.age_min !== null &&
      body.age_max !== undefined && body.age_max !== null &&
      body.age_min > body.age_max) {
    return 'age_min must be <= age_max.';
  }
  if (body.price_cents !== undefined && body.price_cents !== null &&
      (typeof body.price_cents !== 'number' || body.price_cents < 0)) {
    return 'price_cents must be a non-negative integer or null.';
  }
  if (body.capacity !== undefined && body.capacity !== null &&
      (typeof body.capacity !== 'number' || body.capacity <= 0)) {
    return 'capacity must be a positive integer or null.';
  }
  if (body.status !== undefined && !STATUSES.has(body.status)) {
    return `status must be one of: ${[...STATUSES].join(', ')}.`;
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programmingId: string }> },
) {
  const rl = await checkRateLimit(`owner-programming-get:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const { id, programmingId } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  const { data, error } = await supabaseAdmin
    .from('rink_programming')
    .select('id, rink_id, day_of_week, start_time, end_time, activity_type, skill_level, gender, age_min, age_max, price_cents, currency, capacity, description, gear_rules, status, created_at, updated_at')
    .eq('id', programmingId)
    .eq('rink_id', owner.owner.rinkId)
    .maybeSingle();

  if (error) {
    console.error('[owner-programming] get failed', error);
    return NextResponse.json({ error: 'Failed to load programming.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Programming not found.' }, { status: 404 });

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programmingId: string }> },
) {
  const rl = await checkRateLimit(`owner-programming-patch:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const { id, programmingId } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Body must be valid JSON.');
  }

  const validationError = validatePatchBody(body);
  if (validationError) return badRequest(validationError);

  const update: Record<string, any> = {};
  for (const k of ['day_of_week','start_time','end_time','activity_type','skill_level','gender','age_min','age_max','price_cents','currency','capacity','description','gear_rules','status'] as const) {
    if (body[k] !== undefined) update[k] = body[k];
  }

  const { data, error } = await supabaseAdmin
    .from('rink_programming')
    .update(update)
    .eq('id', programmingId)
    .eq('rink_id', owner.owner.rinkId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[owner-programming] patch failed', error);
    return NextResponse.json({ error: 'Failed to update programming.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Programming not found.' }, { status: 404 });

  return NextResponse.json({ id: data.id });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programmingId: string }> },
) {
  const rl = await checkRateLimit(`owner-programming-delete:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const { id, programmingId } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  // Soft delete: set status='archived' (preserves history). Owner can restore
  // by PATCH with status='draft' or 'published'.
  const { data, error } = await supabaseAdmin
    .from('rink_programming')
    .update({ status: 'archived' })
    .eq('id', programmingId)
    .eq('rink_id', owner.owner.rinkId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[owner-programming] delete failed', error);
    return NextResponse.json({ error: 'Failed to archive programming.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Programming not found.' }, { status: 404 });

  return NextResponse.json({ archived: true });
}
