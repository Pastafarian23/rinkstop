// src/app/api/owner/rinks/[id]/equipment/rentals/route.ts
//
// Owner rental list + create.
//   GET  /api/owner/rinks/[id]/equipment/rentals
//   POST /api/owner/rinks/[id]/equipment/rentals
//
// RLS-gated: signed-in user must own the rink.

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwnerForRental } from '@/lib/rental/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RENTAL_STATUSES = ['pending','active','overdue','returned','cancelled'];

// GET
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRinkOwnerForRental(request, ((await params).id));
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const parentUserId = searchParams.get('parent_user_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabaseAdmin
      .from('equipment_rentals')
      .select('*', { count: 'exact' })
      .eq('rink_id', ((await params).id))
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && RENTAL_STATUSES.includes(status)) query = query.eq('status', status);
    if (parentUserId) query = query.eq('parent_user_id', parentUserId);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ rentals: data ?? [], total: count ?? 0, limit, offset });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/rentals GET]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// POST
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireRinkOwnerForRental(request, ((await params).id));
    const body = await request.json();

    const required = ['parent_user_id', 'item_id', 'starts_at'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Field "${field}" is required.` }, { status: 400 });
      }
    }

    // Verify item belongs to this rink + is active
    const { data: item, error: itemError } = await supabaseAdmin
      .from('equipment_items')
      .select('id, status, type, label')
      .eq('id', body.item_id)
      .eq('owner_type', 'rink')
      .eq('owner_id', owner.rinkId)
      .maybeSingle();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Equipment item not found in this rink.' }, { status: 404 });
    }
    if (item.status !== 'active') {
      return NextResponse.json({ error: 'Item must be "active" to create a rental.' }, { status: 400 });
    }

    // Check for active rental on this item already
    const { data: existing } = await supabaseAdmin
      .from('equipment_rentals')
      .select('id')
      .eq('item_id', body.item_id)
      .eq('status', 'active')
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'This item already has an active rental.' }, { status: 409 });
    }

    const payload: Record<string, unknown> = {
      rink_id: owner.rinkId,
      parent_user_id: String(body.parent_user_id),
      item_id: body.item_id,
      starts_at: String(body.starts_at),
      ends_at: body.ends_at || null,
      status: 'pending',
      deposit_required_cents: typeof body.deposit_required_cents === 'number' ? Math.trunc(body.deposit_required_cents) : 0,
      deposit_paid_cents: typeof body.deposit_paid_cents === 'number' ? Math.trunc(body.deposit_paid_cents) : 0,
      monthly_rate_cents: typeof body.monthly_rate_cents === 'number' ? Math.trunc(body.monthly_rate_cents) : 0,
      currency: String(body.currency || 'PHP'),
      billing_day: Math.min(28, Math.max(1, parseInt(body.billing_day || '1', 10))),
      notes: body.notes || null,
      created_by_user_id: owner.userId,
    };

    // Compute next_bill_at from starts_at + billing_day
    const startsAt = new Date(String(body.starts_at));
    if (!isNaN(startsAt.getTime())) {
      const nextBill = new Date(startsAt);
      nextBill.setDate(payload.billing_day as number);
      if (nextBill < startsAt) {
        nextBill.setMonth(nextBill.getMonth() + 1);
      }
      payload.next_bill_at = nextBill.toISOString().split('T')[0];
    }

    const { data: rental, error } = await supabaseAdmin
      .from('equipment_rentals')
      .insert(payload)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Create the underlying assignment
    await supabaseAdmin.from('equipment_assignments').insert({
      equipment_id: body.item_id,
      assignee_user_id: String(body.parent_user_id),
      assigned_by_user_id: owner.userId,
      starts_at: new Date(body.starts_at).toISOString(),
      due_at: body.ends_at ? new Date(body.ends_at).toISOString() : null,
      notes: body.notes || null,
    });

    // Mark item as lent
    await supabaseAdmin.from('equipment_items').update({ status: 'lent' }).eq('id', body.item_id);

    return NextResponse.json({ rental }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/rentals POST]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
