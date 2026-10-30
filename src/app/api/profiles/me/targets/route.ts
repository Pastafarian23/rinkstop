import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId } from '@/lib/connections';

export async function GET(req: NextRequest) {
  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    (await currentUser())?.emailAddresses?.[0]?.emailAddress || ''
  );
  if (!userId) {
    return NextResponse.json({ error: 'Sign in.' }, { status: 401 });
  }

  const [{ data: teams }, { data: leagues }] = await Promise.all([
    // 2026-10-30 fix: `team_workspaces.claimed_by_user_id` does NOT exist.
    // Team ownership comes from APPROVED rows in the `claims` table.
    // Select the workspaces, then resolve owners via claims.
    supabaseAdmin
      .from('team_workspaces')
      .select('id, name, slug, visibility')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabaseAdmin
      .from('leagues')
      .select('id, name, slug, created_by')
      .eq('created_by', userId)
      .order('name', { ascending: true }),
  ]);

  // Resolve team owners from approved claims.
  const teamIds = (teams ?? []).map((t) => t.id as string);
  let ownedTeamIds = new Set<string>();
  if (teamIds.length) {
    const { data: claims } = await supabaseAdmin
      .from('claims')
      .select('entity_id, user_id')
      .eq('claim_type', 'team')
      .eq('status', 'approved')
      .eq('user_id', userId)
      .in('entity_id', teamIds);
    ownedTeamIds = new Set((claims ?? []).map((c) => c.entity_id as string));
  }

  const managedTeams = (teams ?? [])
    .filter((t) => ownedTeamIds.has(t.id as string))
    .map((t) => ({
    target_type: 'team',
    target_id: t.id,
    name: t.name,
    slug: t.slug,
  }));
  const managedLeagues = (leagues ?? []).map((l) => ({
    target_type: 'league',
    target_id: l.id,
    name: l.name,
    slug: l.slug,
  }));

  return NextResponse.json({
    data: {
      personal: { target_type: 'user', target_id: userId, name: 'My profile' },
      teams: managedTeams,
      leagues: managedLeagues,
    },
  });
}
