// src/app/api/manage/team/[id]/api-keys/[keyId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; keyId: string }> }) {
  const session = await auth();
  const cu = await currentUser();
  if (!session.userId || !cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = cu.id;
  const { id, keyId } = await params;

  const { data: team, error: tErr } = await supabaseAdmin
    .from('team_workspaces').select('id, owner_user_id').eq('id', id).maybeSingle();
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!team || team.owner_user_id !== userId) return NextResponse.json({ error: 'Not the team owner' }, { status: 403 });

  const { error } = await supabaseAdmin
    .from('team_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('team_id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
