import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { TeamHeader } from '@/components/team/TeamHeader';
import { isAdminRole, formatRole, roleColor } from '@/lib/team';
import { AdminActivityFeed } from './AdminActivityFeed';
import { AdminQuickActions } from './AdminQuickActions';
import { AdminRosterSummary } from './AdminRosterSummary';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface TeamRow {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  country_code: string | null;
  home_city: string | null;
  home_country: string | null;
  age_category: string;
  age_label: string | null;
  age_min: number | null;
  age_max: number | null;
  parent_org: string | null;
  season_label: string | null;
  level: string | null;
  is_active: boolean;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  is_minor: boolean;
  profiles: { display_name: string | null; username: string | null } | null;
}

export default async function TeamAdminsHubPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  // Fetch the team
  const { data: teamData } = await supabaseAdmin
    .from('team_workspaces')
    .select('*')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle<TeamRow>();

  if (!teamData) notFound();
  const team = teamData as TeamRow;

  // Confirm the viewer is an active admin on this team
  const { data: myMembership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle<{ role: string }>();

  if (!myMembership || !isAdminRole(myMembership.role)) {
    const isMember = !!myMembership;
    return (
      <div style={{ maxWidth: 720 }}>
        <div
          style={{
            background: 'rgba(200,16,46,0.10)',
            border: '1px solid rgba(200,16,46,0.4)',
            color: '#FF6B7A',
            padding: '1.5rem 1.75rem',
            borderRadius: 12,
          }}
        >
          <h2 style={{ margin: '0 0 0.5rem', color: '#FF6B7A' }}>
            {isMember ? 'Admins only' : 'Not a member'}
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            {isMember
              ? `This hub is for coaches, managers, and board members who run ${team.name}. Your current role (${myMembership.role}) doesn’t have admin access — ask the head coach to invite you with an admin role.`
              : `You aren’t on ${team.name}’s roster. To view this team’s admin hub, you need to be added by the head coach or a manager.`}
          </p>
          <Link
            href={isMember ? `/dashboard/team/${team.slug}` : '/dashboard'}
            style={{ display: 'inline-block', marginTop: '1rem', color: '#14B8A6', textDecoration: 'none', fontWeight: 600 }}
          >
            {isMember ? '← Back to team hub' : '← Back to dashboard'}
          </Link>
        </div>
      </div>
    );
  }

  // Fetch all admin members (for the role-distribution panel)
  const { data: adminRows } = await supabaseAdmin
    .from('team_members')
    .select('id, user_id, role, joined_at, is_minor, profiles:user_id(display_name, username)')
    .eq('team_id', team.id)
    .is('left_at', null)
    .in(
      'role',
      [
        'head_coach',
        'assistant_coach',
        'goalie_coach',
        'skills_coach',
        'manager',
        'team_staff',
        'president',
        'vice_president',
        'secretary',
        'treasurer',
        'board_member',
        'safety_officer',
      ]
    )
    .order('joined_at', { ascending: false });

  const admins: MemberRow[] = ((adminRows || []) as unknown as MemberRow[]);

  // Recent activity from team_notifications (last 30 days, all admins)
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const adminUserIds = admins.map((a) => a.user_id);

  const { data: activityRows } = await supabaseAdmin
    .from('team_notifications')
    .select('id, user_id, actor_user_id, kind, title, body, payload, created_at, read_at')
    .eq('team_id', team.id)
    .in('user_id', adminUserIds)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(40);

  // Pending tasks summary (low-effort counters so admins can see at a glance
  // what's outstanding on this team right now). All counts are best-effort —
  // no per-admin routing, just team-wide numbers.
  const [draftsRes, upcomingRes, openInvitesRes, pendingPaysRes] = await Promise.all([
    supabaseAdmin
      .from('team_news')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', team.id)
      .eq('is_published', false),
    supabaseAdmin
      .from('team_schedule')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', team.id)
      .eq('is_cancelled', false)
      .gte('scheduled_at', new Date().toISOString())
      .lte('scheduled_at', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()),
    supabaseAdmin
      .from('team_invites')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', team.id)
      .is('revoked_at', null),
    // Pending payments — 'pending_verification' = player self-marked paid,
    // coach/admin still needs to confirm. Schema enum is:
    // 'unpaid','pending_verification','paid','partial','waived','refunded'.
    // There's no 'pending' status — 'pending_verification' is the only one
    // that means "needs admin action right now".
    //
    // Note: payment_records has no team_id column — it's joined via
    // payment_id -> payments.id, and payments has team_id. So we have to
    // fetch the team's payments first, then aggregate the records. This is
    // N+1 in the SQL sense, but with a single .select().eq() + a JS count
    // it's fine for the small payment counts a team has.
    (async () => {
      const { data: payments } = await supabaseAdmin
        .from('payments')
        .select('id, payment_records(status)')
        .eq('team_id', team.id);
      const pending = (payments || []).reduce(
        (acc, p) => acc + (p.payment_records || []).filter((r: any) => r.status === 'pending_verification').length,
        0
      );
      return { count: pending, error: null } as { count: number; error: null };
    })(),
  ]);

  const counts = {
    drafts: draftsRes.count ?? 0,
    upcomingEvents: upcomingRes.count ?? 0,
    openInvites: openInvitesRes.count ?? 0,
    pendingPayments: pendingPaysRes.count ?? 0,
  };

  return (
    <div style={{ maxWidth: 1080, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TeamHeader
        name={team.name}
        shortName={team.short_name}
        countryCode={team.country_code}
        homeCity={team.home_city}
        homeCountry={team.home_country}
        ageCategory={team.age_category}
        ageLabel={team.age_label}
        ageMin={team.age_min}
        ageMax={team.age_max}
        parentOrg={team.parent_org}
        seasonLabel={team.season_label}
        level={team.level}
        slug={team.slug}
        memberCount={admins.length}
        isAdmin
      />

      {/* Hub navigation — same chrome as the main team hub, but the
          active item is "Admins" so coaches can see they're in the admin view. */}
      <nav style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link
          href={`/dashboard/team/${team.slug}`}
          style={{
            background: 'transparent',
            color: 'rgba(255,255,255,0.7)',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: '0.875rem',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          Team hub →
        </Link>
        <span
          style={{
            background: '#FFB81C',
            color: '#041E42',
            padding: '0.5rem 1rem',
            borderRadius: 6,
            fontWeight: 700,
            fontSize: '0.875rem',
          }}
        >
          🛡️ Admins
        </span>
        <Link
          href={`/dashboard/team/${team.slug}/payments`}
          style={{ background: '#041E42', color: '#fff', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 700, fontSize: '0.875rem' }}
        >
          💰 Payments
        </Link>
        <Link
          href={`/dashboard/team/${team.slug}/documents`}
          style={{ background: '#041E42', color: '#fff', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 700, fontSize: '0.875rem' }}
        >
          📄 Documents
        </Link>
      </nav>

      {/* Quick actions — at-a-glance buttons to the things admins do most.
          Each goes to the right place rather than dumping the work on this page. */}
      <AdminQuickActions teamSlug={team.slug} counts={counts} />

      {/* Two-column body: activity feed (left, wide) + roster summary (right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)',
          gap: '1.5rem',
        }}
      >
        <AdminActivityFeed
          teamSlug={team.slug}
          activity={(activityRows || []) as any}
        />
        <AdminRosterSummary
          teamSlug={team.slug}
          admins={admins.map((a) => ({
            id: a.id,
            userId: a.user_id,
            displayName: a.profiles?.display_name ?? null,
            username: a.profiles?.username ?? null,
            role: a.role,
            joinedAt: a.joined_at,
            isMinor: a.is_minor,
          }))}
        />
      </div>

      {/* Footer note: admins hub is read-only for this view. Real edit tools
          (post news, add schedule, log result) live in the main team hub
          under "Public Posts". This hub is for coordination + visibility. */}
      <div
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '0.85rem 1rem',
          fontSize: '0.78rem',
          color: 'rgba(255,255,255,0.45)',
        }}
      >
        💡 <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Tip:</strong> The admins hub is for visibility and coordination. To post news, log a result, or add a schedule entry, use the <Link href={`/dashboard/team/${team.slug}`} style={{ color: '#14B8A6', textDecoration: 'none', fontWeight: 600 }}>Public Posts</Link> section on the main team hub.
      </div>
    </div>
  );
}
