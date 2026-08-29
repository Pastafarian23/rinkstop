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
    supabaseAdmin
      .from('team_workspaces')
      .select('id, name, slug, visibility, claimed_by_user_id')
      .eq('claimed_by_user_id', userId)
      .order('name', { ascending: true }),
    supabaseAdmin
      .from('leagues')
      .select('id, name, slug, created_by')
      .eq('created_by', userId)
      .order('name', { ascending: true }),
  ]);

  const managedTeams = (teams ?? []).map((t) => ({
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
