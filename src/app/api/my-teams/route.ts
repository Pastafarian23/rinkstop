import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/my-teams
 *
 * Returns the active teams the current user is a member of, with their role.
 * Used by the TeamSwitcher dropdown in the dashboard header.
 *
 * Anonymous users get [].
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ teams: [] });
  }

  const { data: memberships, error: mErr } = await supabaseAdmin
    .from('team_members')
    .select('team_id, role, left_at')
    .eq('user_id', userId)
    .is('left_at', null);

  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  const teamIds = (memberships || []).map((m) => m.team_id);
  if (teamIds.length === 0) {
    return NextResponse.json({ teams: [] });
  }

  const { data: teams, error: tErr } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name, short_name, avatar_url, level, age_label, home_city, home_country, is_active')
    .in('id', teamIds)
    .order('name');

  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  // Attach the user's role to each team
  const roleByTeam = new Map<string, string>();
  for (const m of memberships || []) {
    roleByTeam.set(m.team_id, m.role);
  }

  const result = (teams || [])
    .filter((t) => t.is_active)
    .map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      short_name: t.short_name || null,
      avatar_url: t.avatar_url || null,
      level: t.level || null,
      age_label: t.age_label || null,
      home_city: t.home_city || null,
      home_country: t.home_country || null,
      role: roleByTeam.get(t.id) || null,
      href: `/dashboard/team/${t.slug}`,
    }));

  return NextResponse.json({ teams: result });
}
