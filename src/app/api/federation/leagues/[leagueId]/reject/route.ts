// src/app/api/federation/leagues/[leagueId]/reject/route.ts
//
// WS17 PR4 Phase 2D — Federation rejects a pending league membership.
// Auth: caller must hold a federation_admin rink_org_connection whose
// org_name matches the league's federation name.

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getCaller() {
  const session = await auth();
  if (!session.userId) return null;
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('user_id, tier')
    .eq('user_id', session.userId)
    .maybeSingle();
  return { userId: session.userId, email: userEmail, profile: data };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> },
) {
  const caller = await getCaller();
  if (!caller) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { leagueId } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;

  // Load league with federation name
  const { data: league, error: leagueErr } = await supabaseAdmin
    .from('league_members')
    .select('id, federation_id, league_name, status, federations(name)')
    .eq('id', leagueId)
    .maybeSingle();

  if (leagueErr || !league) {
    return NextResponse.json({ error: 'League not found.' }, { status: 404 });
  }

  if (league.status === 'suspended' || league.status === 'archived') {
    return NextResponse.json({ error: `League is already ${league.status}.`, status: league.status }, { status: 400 });
  }

  // Resolve federation name
  const fedName = Array.isArray((league as any).federations)
    ? (league as any).federations[0]?.name
    : (league as any).federations?.name;

  if (!fedName) {
    return NextResponse.json({ error: 'League federation not resolved.' }, { status: 500 });
  }

  // Auth: caller must have federation_admin role for this federation
  const { data: conn, error: connErr } = await supabaseAdmin
    .from('rink_org_connections')
    .select('id')
    .eq('org_name', fedName)
    .eq('role', 'federation_admin')
    .eq('created_by', caller.userId)
    .maybeSingle();

  if (connErr || !conn) {
    return NextResponse.json({ error: 'Only federation admins can reject league memberships.' }, { status: 403 });
  }

  const { error: updateErr } = await supabaseAdmin
    .from('league_members')
    .update({
      status: 'suspended',
      updated_at: new Date().toISOString(),
    })
    .eq('id', leagueId);

  if (updateErr) {
    console.error('[federation-reject] update failed', updateErr);
    return NextResponse.json({ error: 'Failed to reject league membership.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, league_id: leagueId, status: 'suspended', reason: reason || null });
}
