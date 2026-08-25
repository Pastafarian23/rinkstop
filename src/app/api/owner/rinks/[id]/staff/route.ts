// src/app/api/owner/rinks/[id]/staff/route.ts
//
// WS17 PR4 - Rink staff (employees + coaches) CRUD for rink owners.
//
//   GET  /api/owner/rinks/[id]/staff      — list all staff
//   POST /api/owner/rinks/[id]/staff      — add a staff member

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwner } from '@/lib/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_ROLES = new Set(['coach','instructor','lifeguard','ice_operator','front_desk','manager','other']);
const VALID_STATUSES = new Set(['active','inactive','terminated']);

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  const { data, error } = await supabaseAdmin
    .from('rink_employees')
    .select('id, rink_id, user_id, name, email, phone, role, status, hire_date, hourly_rate_cents, bio, photo_url, created_at, updated_at')
    .eq('rink_id', owner.owner.rinkId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[staff] list failed', error);
    return NextResponse.json({ error: 'Failed to load staff.' }, { status: 500 });
  }

  return NextResponse.json({ staff: data || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Body must be valid JSON.');
  }

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return badRequest('name is required.');
  }
  if (body.role && !VALID_ROLES.has(body.role as string)) {
    return badRequest(`role must be one of: ${[...VALID_ROLES].join(', ')}.`);
  }
  if (body.status && !VALID_STATUSES.has(body.status as string)) {
    return badRequest(`status must be one of: ${[...VALID_STATUSES].join(', ')}.`);
  }
  if (body.hourly_rate_cents !== undefined && body.hourly_rate_cents !== null && (typeof body.hourly_rate_cents !== 'number' || body.hourly_rate_cents < 0)) {
    return badRequest('hourly_rate_cents must be a non-negative number or null.');
  }

  const insert = {
    rink_id: owner.owner.rinkId,
    name: (body.name as string).trim(),
    email: (body.email as string)?.trim() || null,
    phone: (body.phone as string)?.trim() || null,
    role: (body.role as string) || 'coach',
    status: (body.status as string) || 'active',
    hire_date: body.hire_date || null,
    hourly_rate_cents: body.hourly_rate_cents ?? null,
    bio: (body.bio as string)?.trim() || null,
    photo_url: (body.photo_url as string)?.trim() || null,
  };

  const { data, error } = await supabaseAdmin
    .from('rink_employees')
    .insert(insert)
    .select('id')
    .single();

  if (error) {
    console.error('[staff] insert failed', error);
    return NextResponse.json({ error: 'Failed to add staff member.' }, { status: 500 });
  }

  return NextResponse.json({ id: data?.id }, { status: 201 });
}
