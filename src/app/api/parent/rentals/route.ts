// src/app/api/parent/rentals/route.ts
//
// Parent: list their own equipment rentals.
//   GET  /api/parent/rentals
//   POST /api/parent/rentals  (request a rental — future)

import { NextRequest, NextResponse } from 'next/server';
import { getParentUserId } from '@/lib/rental/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/parent/rentals
export async function GET(request: NextRequest) {
  try {
    const userId = await getParentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabaseAdmin
      .from('equipment_rentals')
      .select('*, equipment_items(label,type,brand,model,size,condition)', { count: 'exact' })
      .eq('parent_user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ rentals: data ?? [], total: count ?? 0, limit, offset });
  } catch (err) {
    console.error('[parent/rentals GET]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// POST — placeholder for parent self-request (future)
export async function POST(request: NextRequest) {
  try {
    const userId = await getParentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Parent-initiated rental requests not yet implemented.' }, { status: 501 });
  } catch (err) {
    console.error('[parent/rentals POST]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
