import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hasTeamAdminAccess, tierGateResponse } from '@/lib/tier-gate';

export const dynamic = 'force-dynamic';

/**
 * GET /api/team/[slug]/events
 *
 * Piece G1a smoke-test route. Returns an empty events list placeholder.
 * Real CRUD lands in G1b.
 *
 * Auth + gate checks (in order):
 *   1. Authenticated (Clerk) → 401 if not
 *   2. Team exists + is_active → 404 if not
 *   3. User is on the team's roster (team_members) → 403 if not
 *   4. User has team-admin tier (paid tier required) → 402 if not
 *
 * Returns: { events: [], gate: { tier, reason } }
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse(JSON.stringify({ error: 'unauthenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  if (!normalizedSlug) {
    return new NextResponse(JSON.stringify({ error: 'invalid_slug' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 1. Look up the team
  const { data: team, error: teamErr } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name, is_active')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (teamErr || !team) {
    return new NextResponse(JSON.stringify({ error: 'team_not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Membership check — must be on roster
  const { data: myMembership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();

  if (!myMembership) {
    return new NextResponse(JSON.stringify({ error: 'not_a_member' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Tier gate — must be on a paid tier for team-admin features
  const gate = await hasTeamAdminAccess(userId);
  if (!gate.allowed) {
    return tierGateResponse(gate);
  }

  // 4. Return empty placeholder; G1b adds real event query
  return NextResponse.json({
    events: [],
    gate: { tier: gate.tier, reason: gate.reason },
    placeholder: 'G1a smoke-test route. Real CRUD lands in G1b.',
  });
}