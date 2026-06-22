import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { countryFlag } from '@/lib/team';
import PublicTeamProfile from '@/app/directory/teams/[slug]/PublicTeamProfile';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface TeamRow {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  parent_org: string | null;
  country_code: string | null;
  home_city: string | null;
  home_country: string | null;
  age_category: string;
  age_label: string | null;
  age_min: number | null;
  age_max: number | null;
  level: string | null;
  season_label: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  visibility: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface NewsRow {
  id: string;
  title: string;
  body: string;
  author_user_id: string;
  published_at: string;
}

interface ResultRow {
  id: string;
  game_date: string;
  opponent: string;
  home_away: 'home' | 'away' | 'neutral';
  our_score: number;
  their_score: number;
  outcome: 'W' | 'L' | 'T';
  notes: string | null;
}

interface ScheduleRow {
  id: string;
  scheduled_at: string;
  opponent: string | null;
  kind: 'game' | 'practice' | 'tournament' | 'meeting' | 'other';
  venue: string | null;
  home_away: 'home' | 'away' | 'neutral' | null;
  notes: string | null;
  is_cancelled: boolean;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('name, description, home_city, home_country, country_code, age_label, level, visibility, is_active')
    .eq('slug', normalizedSlug)
    .maybeSingle();

  if (!team || team.is_active === false || team.visibility !== 'public') {
    return {
      title: 'Team not found · RinkStop',
      robots: { index: false, follow: false },
    };
  }

  const t = team as Pick<
    TeamRow,
    'name' | 'description' | 'home_city' | 'home_country' | 'country_code' | 'age_label' | 'level'
  >;
  const location = [t.home_city, t.home_country].filter(Boolean).join(', ');
  const title = `${t.name}${location ? ` — ${location}` : ''} · RinkStop`;
  const desc =
    t.description ||
    `${t.name} hockey team${location ? ` from ${location}` : ''}. ${
      t.level ? `Plays at the ${t.level.replace(/_/g, ' ')} level. ` : ''
    }${t.age_label ? `Age group: ${t.age_label}. ` : ''}Roster, schedule, and recent results on RinkStop.`;

  return {
    title,
    description: desc,
    alternates: { canonical: `https://rinkstop.com/teams/${normalizedSlug}` },
    openGraph: {
      title: t.name,
      description: desc,
      url: `https://rinkstop.com/teams/${normalizedSlug}`,
      siteName: 'RinkStop',
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: t.name,
      description: desc,
    },
    robots: { index: true, follow: true },
  };
}

export default async function TeamProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  if (!normalizedSlug) notFound();

  // Workspace lookup — gate on visibility = 'public' so private teams don't leak.
  // Admins/members viewing their own private team should use /dashboard/team/[slug] instead.
  const { data: teamData } = await supabaseAdmin
    .from('team_workspaces')
    .select('*')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .eq('visibility', 'public')
    .maybeSingle<TeamRow>();

  if (!teamData) notFound();
  const team = teamData as TeamRow;

  // Posts (anon key — these tables have public SELECT RLS)
  const [newsRes, resultsRes, upcomingRes, adminsRes] = await Promise.all([
    supabase
      .from('team_news')
      .select('id, title, body, author_user_id, published_at')
      .eq('team_id', team.id)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(10)
      .returns<NewsRow[]>(),
    supabase
      .from('team_results')
      .select('id, game_date, opponent, home_away, our_score, their_score, outcome, notes')
      .eq('team_id', team.id)
      .order('game_date', { ascending: false })
      .limit(20)
      .returns<ResultRow[]>(),
    supabase
      .from('team_schedule')
      .select('id, scheduled_at, opponent, kind, venue, home_away, notes, is_cancelled')
      .eq('team_id', team.id)
      .eq('is_cancelled', false)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10)
      .returns<ScheduleRow[]>(),
    supabaseAdmin
      .from('team_members')
      .select('user_id, role, joined_at, profiles:user_id(display_name, username)')
      .eq('team_id', team.id)
      .is('left_at', null)
      .in('role', ['head_coach', 'assistant_coach', 'manager', 'team_staff'])
      .order('joined_at'),
  ]);

  const news: NewsRow[] = newsRes.data || [];
  const results: ResultRow[] = resultsRes.data || [];
  const upcoming: ScheduleRow[] = upcomingRes.data || [];

  interface AdminJoin {
    user_id: string;
    role: string;
    profiles: { display_name: string | null; username: string | null } | null;
  }
  const admins: AdminJoin[] = ((adminsRes.data || []) as unknown as AdminJoin[]).map((a) => ({
    user_id: a.user_id,
    role: a.role,
    profiles: a.profiles,
  }));

  const { data: claimRow } = await supabaseAdmin
    .from('claims')
    .select('id, status, user_id')
    .eq('entity_id', team.id)
    .eq('claim_type', 'team')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; status: string; user_id: string }>();

  const ADMIN_ROLES = [
    'head_coach', 'assistant_coach', 'goalie_coach', 'skills_coach',
    'manager', 'team_staff',
    'president', 'vice_president', 'secretary', 'treasurer',
    'board_member', 'safety_officer',
  ] as const;

  let viewerIsAdmin = false;
  try {
    const { userId } = await auth();
    if (userId) {
      const { data: viewerMember } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('team_id', team.id)
        .eq('user_id', userId)
        .is('left_at', null)
        .maybeSingle<{ role: string }>();
      viewerIsAdmin = ADMIN_ROLES.includes(viewerMember?.role as any);
    }
  } catch {
    // Anonymous or auth error — leave viewerIsAdmin false, no CTAs.
  }

  const seasonRecord = results.reduce(
    (acc, r) => {
      acc.wins += r.outcome === 'W' ? 1 : 0;
      acc.losses += r.outcome === 'L' ? 1 : 0;
      acc.ties += r.outcome === 'T' ? 1 : 0;
      acc.total += 1;
      return acc;
    },
    { wins: 0, losses: 0, ties: 0, total: 0 }
  );

  return (
    <PublicTeamProfile
      team={team}
      news={news}
      results={results}
      upcoming={upcoming}
      admins={admins}
      claimed={!!claimRow}
      claimedByUserId={claimRow?.user_id ?? null}
      seasonRecord={seasonRecord}
      viewerIsAdmin={viewerIsAdmin}
      teamSlug={team.slug}
    />
  );
}