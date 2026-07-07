import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// A-i: parent's view of received docs.
// Auth: requires Clerk session.
// Side effect: marks opened_at = NOW() for unread rows on first GET (idempotent).
// Default filter: archived_at IS NULL. Pass ?include_archived=1 to include archived.
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get('include_archived') === '1';

  // 1. Fetch this parent's recipient rows (RLS would normally scope; we use service-role
  //    so we explicitly filter on recipient_user_id here).
  let recipientsQuery = supabaseAdmin
    .from('team_document_recipients')
    .select('id, document_id, recipient_player_id, delivered_at, opened_at, completed_at, archived_at, created_at')
    .eq('recipient_user_id', userId);
  if (!includeArchived) {
    recipientsQuery = recipientsQuery.is('archived_at', null);
  }
  const { data: recipients, error: rErr } = await recipientsQuery
    .order('delivered_at', { ascending: false });
  if (rErr) {
    return NextResponse.json({ error: rErr.message }, { status: 500 });
  }
  if (!recipients || recipients.length === 0) {
    return NextResponse.json({ ok: true, items: [] });
  }

  // 2. Join the document metadata + team metadata for display.
  const docIds = Array.from(new Set(recipients.map((r) => r.document_id as string)));
  const { data: docs, error: dErr } = await supabaseAdmin
    .from('team_documents')
    .select('id, team_id, title, description, file_url, file_name, file_size_bytes, mime_type, required, due_date, created_at')
    .in('id', docIds);
  if (dErr) {
    return NextResponse.json({ error: dErr.message }, { status: 500 });
  }
  const teamIds = Array.from(new Set((docs || []).map((d) => d.team_id as string)));
  const { data: teams, error: tErr } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name, logo_url')
    .in('id', teamIds);
  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }
  const docById = new Map((docs || []).map((d) => [d.id as string, d]));
  const teamById = new Map((teams || []).map((t) => [t.id as string, t]));

  const items = recipients.map((r) => {
    const doc = docById.get(r.document_id as string);
    const team = doc ? teamById.get(doc.team_id as string) : null;
    return {
      recipient: r,
      document: doc || null,
      team: team || null,
    };
  }).filter((it) => it.document && it.team);

  // 3. Mark unread rows as opened (idempotent: WHERE opened_at IS NULL).
  const unreadIds = recipients.filter((r) => !r.opened_at).map((r) => r.id);
  if (unreadIds.length > 0) {
    const { error: openErr } = await supabaseAdmin
      .from('team_document_recipients')
      .update({ opened_at: new Date().toISOString() })
      .in('id', unreadIds)
      .is('opened_at', null);
    if (openErr) {
      // Non-fatal: deliver the inbox even if the opened_at write fails.
      // Surfacing it would be noise; the read itself succeeded.
      console.error('[inbox/documents] opened_at update failed', { unreadIds, error: openErr });
    }
  }

  return NextResponse.json({ ok: true, items });
}
