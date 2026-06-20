import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = ['head_coach','assistant_coach','manager','president','vice_president','treasurer','secretary'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  const body = await request.json();

  if (!body.title || !body.file_url) {
    return NextResponse.json({ error: 'title and file_url required' }, { status: 400 });
  }

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
  if (!myMembership || !ADMIN_ROLES.includes(myMembership.role)) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }

  const { data: doc, error } = await supabaseAdmin
    .from('team_documents')
    .insert({
      team_id: team.id,
      title: body.title,
      description: body.description || null,
      file_url: body.file_url,
      file_name: body.file_name || null,
      file_size_bytes: body.file_size_bytes || null,
      mime_type: body.mime_type || null,
      required: body.required ?? false,
      payment_id: body.payment_id || null,
      created_by: userId,
    })
    .select('id')
    .single();
  if (error || !doc) {
    return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, document: doc });
}