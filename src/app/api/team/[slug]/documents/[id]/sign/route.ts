import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_ROLES = ['player', 'parent', 'guardian', 'coach', 'staff'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug, id: docId } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  const body = await request.json();

  if (!body.signed_by_name || typeof body.signed_by_name !== 'string' || body.signed_by_name.trim().length < 2) {
    return NextResponse.json({ error: 'signed_by_name required (min 2 chars)' }, { status: 400 });
  }
  if (!VALID_ROLES.includes(body.signed_by_role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  // Verify caller is on team
  const { data: myMembership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (!myMembership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  // Verify doc belongs to team
  const { data: doc } = await supabaseAdmin
    .from('team_documents')
    .select('id, team_id')
    .eq('id', docId)
    .eq('team_id', team.id)
    .maybeSingle();
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  // Get client IP + user agent
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const ua = request.headers.get('user-agent') || 'unknown';

  const { data: sig, error } = await supabaseAdmin
    .from('document_signatures')
    .insert({
      document_id: docId,
      player_id: body.signed_by_role === 'player' ? userId : null,
      signed_by_name: body.signed_by_name.trim(),
      signed_by_role: body.signed_by_role,
      signed_by_user_id: userId,
      ip_address: ip.slice(0, 64), // truncate
      user_agent: ua.slice(0, 256),
    })
    .select('*')
    .single();
  if (error || !sig) {
    return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, signature: sig });
}