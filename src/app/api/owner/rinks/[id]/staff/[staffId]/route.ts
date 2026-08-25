// src/app/api/owner/rinks/[id]/staff/[staffId]/route.ts
//
// WS17 PR4 - Single staff member update/delete for rink owners.
//
//   PATCH /api/owner/rinks/[id]/staff/[staffId]  — update
//   DELETE /api/owner/rinks/[id]/staff/[staffId]  — remove

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> },
) {
  const { id, staffId } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  // Verify staff belongs to this rink
  const { data: existing } = await supabaseAdmin
    .from('rink_employees')
    .select('id')
    .eq('id', staffId)
    .eq('rink_id', owner.owner.rinkId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Body must be valid JSON.');
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) return badRequest('name cannot be empty.');
    updates.name = (body.name as string).trim();
  }
  if (body.email !== undefined) updates.email = (body.email as string)?.trim() || null;
  if (body.phone !== undefined) updates.phone = (body.phone as string)?.trim() || null;
  if (body.role !== undefined) {
    if (!VALID_ROLES.has(body.role as string)) return badRequest(`role must be one of: ${[...VALID_ROLES].join(', ')}.`);
    updates.role = body.role;
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.has(body.status as string)) return badRequest(`status must be one of: ${[...VALID_STATUSES].join(', ')}.`);
    updates.status = body.status;
  }
  if (body.hire_date !== undefined) updates.hire_date = body.hire_date || null;
  if (body.hourly_rate_cents !== undefined) {
    if (body.hourly_rate_cents !== null && (typeof body.hourly_rate_cents !== 'number' || body.hourly_rate_cents < 0)) {
      return badRequest('hourly_rate_cents must be a non-negative number or null.');
    }
    updates.hourly_rate_cents = body.hourly_rate_cents;
  }
  if (body.bio !== undefined) updates.bio = (body.bio as string)?.trim() || null;
  if (body.photo_url !== undefined) updates.photo_url = (body.photo_url as string)?.trim() || null;
  updates.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('rink_employees')
    .update(updates)
    .eq('id', staffId);

  if (error) {
    console.error('[staff] update failed', error);
    return NextResponse.json({ error: 'Failed to update staff member.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> },
) {
  const { id, staffId } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  const { error } = await supabaseAdmin
    .from('rink_employees')
    .delete()
    .eq('id', staffId)
    .eq('rink_id', owner.owner.rinkId);

  if (error) {
    console.error('[staff] delete failed', error);
    return NextResponse.json({ error: 'Failed to remove staff member.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
