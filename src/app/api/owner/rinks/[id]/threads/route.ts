// src/app/api/owner/rinks/[id]/threads/route.ts
//
// WS17 PR4 - Rink threads for rink owners.
//
//   GET  /api/owner/rinks/[id]/threads          — list all threads
//   POST /api/owner/rinks/[id]/threads         — create a new thread

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwner } from '@/lib/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_THREAD_TYPES = new Set(['general','booking_request','contract_request','agreement','payment','dispute']);
const VALID_STATUSES = new Set(['open','closed','resolved']);

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

  // Get connection IDs for this rink
  const { data: connIds } = await supabaseAdmin
    .from('rink_org_connections')
    .select('id')
    .eq('rink_id', owner.owner.rinkId);

  const ids = connIds?.map(c => c.id) || [];

  const { data, error } = await supabaseAdmin
    .from('rink_threads')
    .select(`
      id, connection_id, thread_type, subject, status, expires_at, created_by, created_at, updated_at,
      connection:rink_org_connections(id, org_name, org_type, role)
    `)
    .in('connection_id', ids)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[threads] list failed', error);
    return NextResponse.json({ error: 'Failed to load threads.' }, { status: 500 });
  }

  return NextResponse.json({ threads: data || [] });
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

  if (!body.connection_id || typeof body.connection_id !== 'string') {
    return badRequest('connection_id is required.');
  }
  if (!VALID_THREAD_TYPES.has(body.thread_type as string)) {
    return badRequest(`thread_type must be one of: ${[...VALID_THREAD_TYPES].join(', ')}.`);
  }
  if (!VALID_STATUSES.has(body.status as string)) {
    return badRequest('status must be open, closed, or resolved.');
  }

  // Verify connection belongs to this rink
  const { data: conn } = await supabaseAdmin
    .from('rink_org_connections')
    .select('id')
    .eq('id', body.connection_id as string)
    .eq('rink_id', owner.owner.rinkId)
    .single();

  if (!conn) {
    return NextResponse.json({ error: 'Connection not found for this rink.' }, { status: 404 });
  }

  const insert = {
    connection_id: body.connection_id,
    thread_type: body.thread_type,
    subject: (body.subject as string)?.trim() || null,
    status: (body.status as string) || 'open',
    expires_at: body.expires_at || null,
    created_by: owner.owner.userId,
  };

  const { data, error } = await supabaseAdmin
    .from('rink_threads')
    .insert(insert)
    .select('id')
    .single();

  if (error) {
    console.error('[threads] insert failed', error);
    return NextResponse.json({ error: 'Failed to create thread.' }, { status: 500 });
  }

  return NextResponse.json({ id: data?.id }, { status: 201 });
}
