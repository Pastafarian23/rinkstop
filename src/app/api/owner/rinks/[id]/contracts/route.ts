// src/app/api/owner/rinks/[id]/contracts/route.ts
//
// WS17 PR4 - Rink contracts for rink owners.
//
//   GET  /api/owner/rinks/[id]/contracts     — list all contracts for this rink

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwner } from '@/lib/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    .from('rink_contracts')
    .select(`
      id, title, contract_type, status, storage_path, document_hash,
      document_storage_path, file_size_bytes, file_mime_type, uploaded_at,
      expires_at, sent_at, signed_at, signed_by_user_id,
      created_by, created_at, updated_at,
      connection:rink_org_connections(id, org_name, org_type)
    `)
    .in('connection_id', ids)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[contracts] list failed', error);
    return NextResponse.json({ error: 'Failed to load contracts.' }, { status: 500 });
  }

  return NextResponse.json({ contracts: data || [] });
}
