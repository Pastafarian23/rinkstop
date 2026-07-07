import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = ['head_coach','assistant_coach','manager','president','vice_president','treasurer','secretary'];

// A-iv: hard-delete a team document.
//   - If signatures exist, return 409 with count.
//   - Else hard-delete the row.
//   - No ?force= override — admin must archive instead (when archive column ships).
//   - FK RESTRICT (added in A-iv migration) will cause the DB to throw on
//     attempted delete with signatures; we handle the same shape as the
//     pre-check, in case there's a race.
export async function DELETE(
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
  if (!myMembership || !ADMIN_ROLES.includes(myMembership.role)) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }

  const { data: doc } = await supabaseAdmin
    .from('team_documents')
    .select('id, team_id')
    .eq('id', docId)
    .eq('team_id', team.id)
    .maybeSingle();
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  // Pre-check: any signatures (active or withdrawn)?
  const { count: sigCount, error: sigErr } = await supabaseAdmin
    .from('document_signatures')
    .select('id', { count: 'exact', head: true })
    .eq('document_id', docId);
  if (sigErr) return NextResponse.json({ error: sigErr.message }, { status: 500 });

  if ((sigCount ?? 0) > 0) {
    return NextResponse.json(
      { error: 'cannot delete doc with signatures — archive instead', signatures_count: sigCount },
      { status: 409 }
    );
  }

  // Hard delete. FK RESTRICT is a backstop in case of a race between this
  // pre-check and a signature insert (extremely unlikely with current code,
  // but the safety belt stays on).
  const { error: delErr } = await supabaseAdmin
    .from('team_documents')
    .delete()
    .eq('id', docId)
    .eq('team_id', team.id);
  if (delErr) {
    // FK violation falls here as Postgres 23503.
    const msg = delErr.message || '';
    if (msg.toLowerCase().includes('foreign key') || (delErr as { code?: string }).code === '23503') {
      // Re-check count for the response shape.
      const { count: raced } = await supabaseAdmin
        .from('document_signatures')
        .select('id', { count: 'exact', head: true })
        .eq('document_id', docId);
      return NextResponse.json(
        { error: 'cannot delete doc with signatures — archive instead', signatures_count: raced ?? 0 },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
