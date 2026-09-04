// src/app/api/owner/rinks/[id]/equipment/assignments/route.ts
//
// Owner assignment history.
//   GET /api/owner/rinks/[id]/equipment/assignments
//   POST /api/owner/rinks/[id]/equipment/assignments
//
// RLS-gated: signed-in user must own the rink.

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwnerForRental } from '@/lib/rental/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRinkOwnerForRental(request, params.id);
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');
    const assigneeUserId = searchParams.get('assignee_user_id');
    const onlyActive = searchParams.get('only_active') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabaseAdmin
      .from('equipment_assignments')
      .select('*', { count: 'exact' })
      .order('starts_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (itemId) query = query.eq('equipment_id', itemId);
    if (assigneeUserId) query = query.eq('assignee_user_id', assigneeUserId);
    if (onlyActive) query = query.is('returned_at', null);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ assignments: data ?? [], total: count ?? 0, limit, offset });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/assignments GET]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// POST
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const owner = await requireRinkOwnerForRental(request, params.id);
    const body = await request.json();

    if (!body.equipment_id || !body.assignee_user_id) {
      return NextResponse.json({ error: 'equipment_id and assignee_user_id are required.' }, { status: 400 });
    }

    // Verify item belongs to this rink
    const { data: item, error: itemError } = await supabaseAdmin
      .from('equipment_items')
      .select('id, status')
      .eq('id', body.equipment_id)
      .eq('owner_type', 'rink')
      .eq('owner_id', owner.rinkId)
      .maybeSingle();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Equipment item not found in this rink.' }, { status: 404 });
    }

    if (item.status !== 'active') {
      return NextResponse.json({ error: 'Item is not active. Status must be "active" to assign.' }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      equipment_id: body.equipment_id,
      assignee_user_id: String(body.assignee_user_id),
      assigned_by_user_id: owner.userId,
      starts_at: body.starts_at ? new Date(body.starts_at).toISOString() : new Date().toISOString(),
      due_at: body.due_at ? new Date(body.due_at).toISOString() : null,
      notes: body.notes || null,
    };

    const { data: assignment, error } = await supabaseAdmin
      .from('equipment_assignments')
      .insert(payload)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Also mark item as lent
    await supabaseAdmin
      .from('equipment_items')
      .update({ status: 'lent' })
      .eq('id', body.equipment_id);

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/assignments POST]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
