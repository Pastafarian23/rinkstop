import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { lookupFederation } from '@/lib/federations';

/**
 * POST /api/team/[slug]/apply-federation-template
 * Seeds team_documents with the required doc kinds from the team's federation.
 * Only head_coach / manager / admin roles can call this.
 * Safe to re-run: skips docs that already exist.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  // Fetch team
  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, country_code')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (!team.country_code) {
    return NextResponse.json({ error: 'No country set on this team' }, { status: 400 });
  }

  const federation = lookupFederation(team.country_code);
  if (!federation) {
    return NextResponse.json({ error: 'Unknown federation for country' }, { status: 400 });
  }

  // Verify caller is admin
  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();

  const ADMIN_ROLES = ['head_coach', 'manager', 'president', 'vice_president', 'secretary', 'treasurer', 'board_member', 'safety_officer'];
  if (!membership || !ADMIN_ROLES.includes(membership.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  // Check what team_documents already exist for this team (required, non-payment)
  const { data: existing } = await supabaseAdmin
    .from('team_documents')
    .select('id, kind')
    .eq('team_id', team.id)
    .eq('required', true)
    .is('payment_id', null);

  const existingKinds = new Set((existing || []).map((d: { kind: string }) => d.kind));

  // Build rows for doc kinds not yet present
  const toInsert = federation.requiredDocKinds
    .filter((doc) => !existingKinds.has(doc.kind))
    .map((doc) => ({
      team_id: team.id,
      kind: doc.kind,
      title: doc.label,
      description: doc.note ?? null,
      required: true,
      // due_date: null — admin sets it later
    }));

  if (toInsert.length > 0) {
    const { error } = await supabaseAdmin.from('team_documents').insert(toInsert);
    if (error) {
      return NextResponse.json({ error: `DB insert failed: ${error.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    federation: federation.federationName,
    added: toInsert.length,
    skipped: existingKinds.size,
    totalRequired: federation.requiredDocKinds.length,
  });
}
