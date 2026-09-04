// src/app/api/owner/rinks/[id]/equipment/items/route.ts
//
// Owner equipment items CRUD.
//   GET  /api/owner/rinks/[id]/equipment/items
//   POST /api/owner/rinks/[id]/equipment/items
//
// RLS-gated: signed-in user must own the rink.

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwnerForRental } from '@/lib/rental/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';


const EQUIPMENT_TYPES = [
  'skates','stick','helmet','gloves','pants','shin_pads','shoulder_pads',
  'elbow_pads','jersey','sock','puck','cones','goal','net','bag',
  'water_bottle','tape','mouthguard','skate_sharpener','other',
];
const STATUSES = ['active','retired','lost','broken','lent'];
const CONDITIONS = ['new','excellent','good','worn','damaged','needs_repair'];

// GET /api/owner/rinks/[id]/equipment/items
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const owner = await requireRinkOwnerForRental(request, params.id);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');       // active | retired | ...
    const type = searchParams.get('type');           // skates | stick | ...
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabaseAdmin
      .from('equipment_items')
      .select('*', { count: 'exact' })
      .eq('owner_type', 'rink')
      .eq('owner_id', owner.rinkId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && STATUSES.includes(status)) query = query.eq('status', status);
    if (type && EQUIPMENT_TYPES.includes(type)) query = query.eq('type', type);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ items: data ?? [], total: count ?? 0, limit, offset });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/items GET]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// POST /api/owner/rinks/[id]/equipment/items
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const owner = await requireRinkOwnerForRental(request, params.id);
    const body = await request.json();

    const required = ['label', 'type'];
    for (const field of required) {
      if (!body[field] || typeof body[field] !== 'string' || !body[field].trim()) {
        return NextResponse.json({ error: `Field "${field}" is required.` }, { status: 400 });
      }
    }

    const type = String(body.type).toLowerCase();
    if (!EQUIPMENT_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${EQUIPMENT_TYPES.join(', ')}` }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      owner_type: 'rink',
      owner_id: owner.rinkId,
      label: String(body.label).trim(),
      type,
      status: STATUSES.includes(body.status) ? body.status : 'active',
      condition: CONDITIONS.includes(body.condition) ? body.condition : 'good',
      brand: body.brand || null,
      model: body.model || null,
      size: body.size || null,
      acquired_at: body.acquired_at || null,
      acquired_price_cents: typeof body.acquired_price_cents === 'number' ? Math.trunc(body.acquired_price_cents) : null,
      notes: body.notes || null,
      metadata: typeof body.metadata === 'object' ? body.metadata : {},
    };

    const { data: item, error } = await supabaseAdmin
      .from('equipment_items')
      .insert(payload)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/items POST]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
