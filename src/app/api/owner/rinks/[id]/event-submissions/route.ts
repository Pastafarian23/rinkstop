// src/app/api/owner/rinks/[id]/event-submissions/route.ts
//
// Owner: list event submissions for their rink.
//   GET /api/owner/rinks/[id]/event-submissions
//
// WS17 PR4 sub-PR (2026-09-04).

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwnerForRental } from '@/lib/rental/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUSES = ['pending','approved','rejected','spam','duplicate'];

// GET
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRinkOwnerForRental(request, (await params).id);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabaseAdmin
      .from('event_submissions')
      .select('*', { count: 'exact' })
      .eq('rink_id', (await params).id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && STATUSES.includes(status)) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ submissions: data ?? [], total: count ?? 0, limit, offset });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[event-submissions GET]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
