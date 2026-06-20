import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug, id: docId } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const { data: myMembership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (!myMembership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const { data: doc } = await supabaseAdmin
    .from('team_documents')
    .select('id, team_id, file_url')
    .eq('id', docId)
    .eq('team_id', team.id)
    .maybeSingle();
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  // Generate a signed URL valid for 60 seconds
  const { data: signed, error } = await supabaseAdmin.storage
    .from('team-documents')
    .createSignedUrl(doc.file_url, 60);
  if (error || !signed) {
    return NextResponse.json({ error: error?.message || 'Failed to sign URL' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: signed.signedUrl });
}