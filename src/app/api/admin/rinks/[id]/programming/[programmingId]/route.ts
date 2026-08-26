// src/app/api/admin/rinks/[id]/programming/[programmingId]/route.ts
//
// WS17 PR1 - single programming slot admin CRUD.
//
//   PATCH  /api/admin/rinks/[id]/programming/[programmingId]
//   DELETE /api/admin/rinks/[id]/programming/[programmingId]
//
// Both admin-gated via getAdminFromRequest(). 404 if the slot is not at the
// given rink (cross-rink id collisions return 404 to avoid leaks).

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

const ALLOWED_FIELDS = new Set([
  'activity_type','day_of_week','start_time','end_time','price_cents','currency',
  'capacity','skill_level','age_min','age_max','gender','booking_url',
  'booking_method','gear_rules','description','status','effective_from','effective_until',
]);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programmingId: string }> },
) {
  const rl = await checkRateLimit(`admin-rink-programming-patch:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const gate = await getAdminFromRequest(request, 'admin_rinks_programming_[programmingId]');
  if ('response' in gate) return gate.response;
  const { id, programmingId } = await params;
  if (!id || !programmingId) return badRequest('rink id and programming id are required.');

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
    updates[k] = body[k];
  }

  const { data, error } = await supabaseAdmin
    .from('rink_programming')
    .update(updates)
    .eq('id', programmingId)
    .eq('rink_id', id) // cross-rink guard
    .select()
    .maybeSingle();
  if (error) {
    console.error('[admin-rink-programming] update failed', error);
    return NextResponse.json({ error: 'Failed to update programming slot.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'programming_not_found' }, { status: 404 });

  return NextResponse.json({ programming: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programmingId: string }> },
) {
  const rl = await checkRateLimit(`admin-rink-programming-delete:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const gate = await getAdminFromRequest(request, 'admin_rinks_programming_[programmingId]');
  if ('response' in gate) return gate.response;
  const { id, programmingId } = await params;
  if (!id || !programmingId) return badRequest('rink id and programming id are required.');

  const { data, error } = await supabaseAdmin
    .from('rink_programming')
    .delete()
    .eq('id', programmingId)
    .eq('rink_id', id) // cross-rink guard
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('[admin-rink-programming] delete failed', error);
    return NextResponse.json({ error: 'Failed to delete programming slot.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'programming_not_found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
