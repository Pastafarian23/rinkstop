// src/app/api/rink-connections/threads/[threadId]/messages/route.ts
//
// WS17 PR4 - Send a message in a rink thread.
//
//   POST /api/rink-connections/threads/[threadId]/messages   — send message
//
// Access: any authenticated participant of the thread.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { threadId } = await params;

  // Verify user is a participant of this thread
  const { data: thread, error: threadErr } = await supabaseAdmin
    .from('rink_threads')
    .select('id, connection_id')
    .eq('id', threadId)
    .single();

  if (threadErr || !thread) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  const { data: conn } = await supabaseAdmin
    .from('rink_org_connections')
    .select('id, rink_id, created_by')
    .eq('id', thread.connection_id)
    .single();

  if (!conn) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  // Participant = connection creator OR rink owner
  const { data: claim } = await supabaseAdmin
    .from('claims')
    .select('entity_id')
    .eq('entity_id', conn.rink_id)
    .eq('claim_type', 'rink')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle();

  const isParticipant = conn.created_by === userId || !!claim;
  if (!isParticipant) {
    return NextResponse.json({ error: 'You are not a participant in this thread.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Body must be valid JSON.');
  }

  if (typeof body.content !== 'string' || !body.content.trim()) {
    return badRequest('content is required and cannot be empty.');
  }

  const insert = {
    thread_id: threadId,
    sender_id: userId,
    content: (body.content as string).trim(),
    attachments: Array.isArray(body.attachments) ? body.attachments : [],
  };

  const { data, error } = await supabaseAdmin
    .from('rink_messages')
    .insert(insert)
    .select('id, thread_id, sender_id, content, attachments, read_at, created_at')
    .single();

  if (error) {
    console.error('[messages] insert failed', error);
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }

  // Update thread updated_at
  await supabaseAdmin
    .from('rink_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId);

  return NextResponse.json({ message: data }, { status: 201 });
}
