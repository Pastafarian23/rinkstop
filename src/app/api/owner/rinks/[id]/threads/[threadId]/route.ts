// src/app/api/owner/rinks/[id]/threads/[threadId]/route.ts
//
// WS17 PR4 - Single thread operations for rink owners.
//
//   GET    /api/owner/rinks/[id]/threads/[threadId]   — get thread + messages
//   PATCH  /api/owner/rinks/[id]/threads/[threadId]   — update status

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwner } from '@/lib/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_STATUSES = new Set(['open','closed','resolved']);

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; threadId: string }> },
) {
  const { id, threadId } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  // Verify thread belongs to a connection owned by this rink
  const { data: thread, error: threadErr } = await supabaseAdmin
    .from('rink_threads')
    .select(`
      id, connection_id, thread_type, subject, status, expires_at, created_by, created_at, updated_at,
      connection:rink_org_connections(id, org_name, org_type, role)
    `)
    .eq('id', threadId)
    .single();

  if (threadErr || !thread) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  const { data: conn } = await supabaseAdmin
    .from('rink_org_connections')
    .select('rink_id')
    .eq('id', thread.connection_id)
    .single();

  if (!conn || conn.rink_id !== owner.owner.rinkId) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  const { data: messages, error: msgErr } = await supabaseAdmin
    .from('rink_messages')
    .select('id, thread_id, sender_id, content, attachments, read_at, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (msgErr) {
    console.error('[thread] messages load failed', msgErr);
    return NextResponse.json({ error: 'Failed to load messages.' }, { status: 500 });
  }

  return NextResponse.json({ thread, messages: messages || [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; threadId: string }> },
) {
  const { id, threadId } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  // Verify thread belongs to this rink
  const { data: conn } = await supabaseAdmin
    .from('rink_threads')
    .select('id, connection_id')
    .eq('id', threadId)
    .single();

  if (!conn) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  const { data: connData } = await supabaseAdmin
    .from('rink_org_connections')
    .select('rink_id')
    .eq('id', conn.connection_id)
    .single();

  if (!connData || connData.rink_id !== owner.owner.rinkId) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Body must be valid JSON.');
  }

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!VALID_STATUSES.has(body.status as string)) {
      return badRequest('status must be open, closed, or resolved.');
    }
    updates.status = body.status;
  }
  if (body.expires_at !== undefined) updates.expires_at = body.expires_at;
  updates.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('rink_threads')
    .update(updates)
    .eq('id', threadId);

  if (error) {
    console.error('[thread] update failed', error);
    return NextResponse.json({ error: 'Failed to update thread.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
