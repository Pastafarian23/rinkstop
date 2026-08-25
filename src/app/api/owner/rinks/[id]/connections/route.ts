// src/app/api/owner/rinks/[id]/connections/route.ts
//
// WS17 PR4 - Rink org connections for rink owners.
//
//   GET  /api/owner/rinks/[id]/connections     — list all client connections
//   POST /api/owner/rinks/[id]/connections    — create a new connection

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwner } from '@/lib/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_ORG_TYPES = new Set(['team','league','federation','coach','other']);
const VALID_ROLES = new Set(['rink_admin','team_admin','league_admin','federation_admin','coach']);
const VALID_INITIATED = new Set(['rink','client']);

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
    .from('rink_org_connections')
    .select('id, rink_id, org_name, org_type, org_contact_name, org_contact_email, role, status, initiated_by, created_by, created_at, updated_at')
    .eq('rink_id', owner.owner.rinkId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[connections] list failed', error);
    return NextResponse.json({ error: 'Failed to load connections.' }, { status: 500 });
  }

  return NextResponse.json({ connections: data || [] });
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

  if (typeof body.org_name !== 'string' || !body.org_name.trim()) {
    return badRequest('org_name is required.');
  }
  if (!VALID_ORG_TYPES.has(body.org_type as string)) {
    return badRequest(`org_type must be one of: ${[...VALID_ORG_TYPES].join(', ')}.`);
  }
  if (!VALID_ROLES.has(body.role as string)) {
    return badRequest(`role must be one of: ${[...VALID_ROLES].join(', ')}.`);
  }
  if (!VALID_INITIATED.has(body.initiated_by as string)) {
    return badRequest('initiated_by must be "rink" or "client".');
  }

  const insert = {
    rink_id: owner.owner.rinkId,
    org_name: (body.org_name as string).trim(),
    org_type: body.org_type as string,
    org_contact_name: (body.org_contact_name as string)?.trim() || null,
    org_contact_email: (body.org_contact_email as string)?.trim() || null,
    role: body.role as string,
    status: 'active',
    created_by: owner.owner.userId,
    initiated_by: body.initiated_by as string,
  };

  const { data, error } = await supabaseAdmin
    .from('rink_org_connections')
    .insert(insert)
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A connection with this org_name already exists for this rink.' }, { status: 409 });
    }
    console.error('[connections] insert failed', error);
    return NextResponse.json({ error: 'Failed to create connection.' }, { status: 500 });
  }

  return NextResponse.json({ id: data?.id }, { status: 201 });
}
