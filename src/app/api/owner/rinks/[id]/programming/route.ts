// src/app/api/owner/rinks/[id]/programming/route.ts
//
// WS17 PR3a - Owner API for recurring programming CRUD.
//
//   GET  /api/owner/rinks/[id]/programming  (list all, any status)
//   POST /api/owner/rinks/[id]/programming  (create)
//
// RLS-gated: signed-in user must own the rink (rinks.claimed_by_user_id).

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

function asPositiveIntOrNull(v: unknown): number | null | undefined {
  const x = asSmallintOrNull(v);
  if (x === undefined || x === null) return x;
  return x >= 0 ? x : NaN;
}

function asTimeOrNull(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string') return null;
  // Accept HH:MM or HH:MM:SS
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(v)) return null;
  return v;
}

const INVALID_TIME = 'invalid_time';

function validateCreateBody(body: Record<string, any>): string | null {
  if (!body || typeof body !== 'object') return 'Body must be JSON.';
  if (typeof body.day_of_week !== 'number' || !Number.isInteger(body.day_of_week) || body.day_of_week < 0 || body.day_of_week > 6) {
    return 'day_of_week must be an integer 0-6 (0=Sun..6=Sat).';
  }
  const startTime = asTimeOrNull(body.start_time);
  if (body.start_time === undefined || body.start_time === null) return 'start_time is required.';
  if (startTime === null) return 'start_time must be HH:MM.';
  const endTime = asTimeOrNull(body.end_time);
  if (body.end_time === undefined || body.end_time === null) return 'end_time is required.';
  if (endTime === null) return 'end_time must be HH:MM.';
  if (startTime >= endTime) return 'end_time must be after start_time.';

  if (typeof body.activity_type !== 'string' || body.activity_type.trim().length === 0) {
    return 'activity_type is required (see rink_activity_type enum).';
  }
  if (body.skill_level !== undefined && body.skill_level !== null && !SKILL_LEVELS.has(body.skill_level)) {
    return `skill_level must be one of: ${[...SKILL_LEVELS].join(', ')}.`;
  }
  if (body.gender !== undefined && body.gender !== null && !GENDERS.has(body.gender)) {
    return `gender must be one of: ${[...GENDERS].join(', ')}.`;
  }

  const ageMin = asSmallintOrNull(body.age_min);
  const ageMax = asSmallintOrNull(body.age_max);
  if (ageMin !== undefined && Number.isNaN(ageMin)) return 'age_min must be a smallint (0-99) or null.';
  if (ageMax !== undefined && Number.isNaN(ageMax)) return 'age_max must be a smallint (0-99) or null.';
  if (ageMin !== undefined && ageMin !== null && (ageMin < 0 || ageMin > 99)) return 'age_min must be 0-99 or null.';
  if (ageMax !== undefined && ageMax !== null && (ageMax < 0 || ageMax > 99)) return 'age_max must be 0-99 or null.';
  if (ageMin !== undefined && ageMax !== undefined && ageMin !== null && ageMax !== null && ageMin > ageMax) {
    return 'age_min must be <= age_max.';
  }

  const price = asPositiveIntOrNull(body.price_cents);
  if (price !== undefined && Number.isNaN(price)) return 'price_cents must be a non-negative integer (or null).';

  const capacity = asPositiveIntOrNull(body.capacity);
  if (capacity !== undefined && Number.isNaN(capacity)) return 'capacity must be a positive integer (or null).';

  if (body.status !== undefined && !STATUSES.has(body.status)) {
    return `status must be one of: ${[...STATUSES].join(', ')}.`;
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`owner-programming-list:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const { id } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  const { data, error } = await supabaseAdmin
    .from('rink_programming')
    .select('id, rink_id, day_of_week, start_time, end_time, activity_type, skill_level, gender, age_min, age_max, price_cents, currency, capacity, description, gear_rules, status, created_at, updated_at')
    .eq('rink_id', owner.owner.rinkId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[owner-programming] list failed', error);
    return NextResponse.json({ error: 'Failed to load programming.' }, { status: 500 });
  }

  return NextResponse.json({ programming: data || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`owner-programming-create:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const { id } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Body must be valid JSON.');
  }

  const validationError = validateCreateBody(body);
  if (validationError) return badRequest(validationError);

  const insert = {
    rink_id: owner.owner.rinkId,
    day_of_week: body.day_of_week,
    start_time: body.start_time,
    end_time: body.end_time,
    activity_type: body.activity_type,
    skill_level: body.skill_level ?? 'all',
    gender: body.gender ?? 'all',
    age_min: body.age_min ?? null,
    age_max: body.age_max ?? null,
    price_cents: body.price_cents ?? null,
    currency: body.currency ?? 'USD',
    capacity: body.capacity ?? null,
    description: body.description ?? null,
    gear_rules: body.gear_rules ?? null,
    status: body.status ?? 'draft',
  };

  const { data, error } = await supabaseAdmin
    .from('rink_programming')
    .insert(insert)
    .select('id')
    .single();

  if (error) {
    console.error('[owner-programming] insert failed', error);
    return NextResponse.json({ error: 'Failed to create programming.' }, { status: 500 });
  }

  return NextResponse.json({ id: data?.id }, { status: 201 });
}
