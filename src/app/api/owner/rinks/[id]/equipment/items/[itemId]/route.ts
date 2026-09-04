// src/app/api/owner/rinks/[id]/equipment/items/[itemId]/route.ts
//
// Single equipment item: read, update, archive (delete -> retired).
//   GET    /api/owner/rinks/[id]/equipment/items/{itemId}
//   PATCH  /api/owner/rinks/[id]/equipment/items/{itemId}
//   DELETE /api/owner/rinks/[id]/equipment/items/{itemId}

import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { requireRinkOwnerForRental } from '@/lib/rental/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';


const EQUIPMENT_TYPES = [
  'skates','stick','helmet','gloves','pants','shin_pads','shoulder_pads',
  'elbow_pads','jersey','sock','puck','cones','goal','net','bag',
  'water_bottle','tape','mouthguard','skate_sharpener','other',
];
const STATUSES = ['active','retired','lost','broken','lent'];
const CONDITIONS = ['new','excellent','good','worn','damaged','needs_repair'];

// GET /api/owner/rinks/[id]/equipment/items/{itemId}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    await requireRinkOwnerForRental(request, ((await params).id));
    const { data: item, error } = await supabaseAdmin
      .from('equipment_items')
      .select('*')
      .eq('id', ((await params).itemId))
      .eq('owner_type', 'rink')
      .eq('owner_id', ((await params).id))
      .maybeSingle();

    if (error || !item) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/item GET]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// PATCH /api/owner/rinks/[id]/equipment/items/{itemId}
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    await requireRinkOwnerForRental(request, ((await params).id));
    const body = await request.json();

    // Build only allowed fields
    const allowed: Record<string, unknown> = {};
    if (body.label && typeof body.label === 'string') allowed.label = body.label.trim();
    if (body.type && EQUIPMENT_TYPES.includes(body.type)) allowed.type = body.type;
    if (body.status && STATUSES.includes(body.status)) allowed.status = body.status;
    if (body.condition && CONDITIONS.includes(body.condition)) allowed.condition = body.condition;
    if (body.brand !== undefined) allowed.brand = body.brand || null;
    if (body.model !== undefined) allowed.model = body.model || null;
    if (body.size !== undefined) allowed.size = body.size || null;
    if (body.acquired_at !== undefined) allowed.acquired_at = body.acquired_at || null;
    if (typeof body.acquired_price_cents === 'number') allowed.acquired_price_cents = Math.trunc(body.acquired_price_cents);
    if (body.notes !== undefined) allowed.notes = body.notes || null;
    if (body.metadata && typeof body.metadata === 'object') allowed.metadata = body.metadata;

    const { data: item, error } = await supabaseAdmin
      .from('equipment_items')
      .update(allowed)
      .eq('id', ((await params).itemId))
      .eq('owner_type', 'rink')
      .eq('owner_id', ((await params).id))
      .select('*')
      .single();

    if (error || !item) {
      return NextResponse.json({ error: error?.message ?? 'Item not found.' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/item PATCH]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// DELETE /api/owner/rinks/[id]/equipment/items/{itemId}
// Soft-delete by setting status='retired' (preserves assignment history).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    await requireRinkOwnerForRental(request, ((await params).id));

    const { data: item, error } = await supabaseAdmin
      .from('equipment_items')
      .update({ status: 'retired' })
      .eq('id', ((await params).itemId))
      .eq('owner_type', 'rink')
      .eq('owner_id', ((await params).id))
      .eq('status', 'active')
      .select('id')
      .maybeSingle();

    if (error || !item) {
      return NextResponse.json({ error: 'Item not found or already retired.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, archived: true });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/item DELETE]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
