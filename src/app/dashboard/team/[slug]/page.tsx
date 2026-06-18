import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { TeamHeader } from '@/components/team/TeamHeader';
import { RosterTable, RosterMember } from '@/components/team/RosterTable';
import { InviteTable, InviteRow } from '@/components/team/InviteTable';
import { isAdminRole } from '@/lib/team';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TeamHubPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const { slug } = await params;
  // Slugs are forced lowercase at the form, but be forgiving if a user
  // types the URL with capitals or extra whitespace.
  const normalizedSlug = (slug || '').toLowerCase().trim();

  // Fetch the team
  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('*')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!team) notFound();

  // Check membership
  const { data: myMembership } = await supabaseAdmin
    .from('team_members')
    .select('role, joined_at')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();

  if (!myMembership) {
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
          <h2 style={{ margin: '0 0 0.5rem', color: '#FF6B7A' }}>Not a member</h2>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            You aren&rsquo;t on this team&rsquo;s roster. Ask a coach or manager for an invite code.
          </p>
          <a
            href="/dashboard"
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              color: '#14B8A6',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            ← Back to dashboard
          </a>
        </div>
      </div>
    );
  }

  const isAdmin = isAdminRole(myMembership.role);

  // Fetch roster
  const { data: memberRows } = await supabaseAdmin
    .from('team_members')
    .select(`
      id, user_id, role, jersey_number, position, joined_at, is_minor,
      profiles:user_id ( display_name, username )
    `)
    .eq('team_id', team.id)
    .is('left_at', null)
    .order('joined_at');

  interface MemberJoin {
    id: string;
    user_id: string;
    role: string;
    jersey_number: number | null;
    position: string | null;
    joined_at: string;
    is_minor: boolean;
    profiles: { display_name: string | null; username: string | null } | null;
  }

  const members: RosterMember[] = ((memberRows || []) as unknown as MemberJoin[]).map((m) => ({
    id: m.id,
    userId: m.user_id,
    displayName: m.profiles?.display_name ?? null,
    username: m.profiles?.username ?? null,
    role: m.role,
    jerseyNumber: m.jersey_number,
    position: m.position,
    joinedAt: m.joined_at,
    isMinor: m.is_minor,
  }));

  // Fetch invites (admin only — non-admins don't need to see codes)
  let invites: InviteRow[] = [];
  if (isAdmin) {
    const { data: inviteRows } = await supabaseAdmin
      .from('team_invites')
      .select('id, code, role, max_uses, times_used, expires_at, revoked_at, label, created_at')
      .eq('team_id', team.id)
      .order('created_at', { ascending: false });

    invites = (inviteRows || []).map((i) => ({
      id: i.id,
      code: i.code,
      role: i.role,
      maxUses: i.max_uses,
      timesUsed: i.times_used,
      expiresAt: i.expires_at,
      revokedAt: i.revoked_at,
      label: i.label,
      createdAt: i.created_at,
    }));
  }

  return (
    <div style={{ maxWidth: 960, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
        memberCount={members.length}
        isAdmin={isAdmin}
      />

      {/* Roster */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
          }}
        >
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.25rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            Roster
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
            {members.length} member{members.length === 1 ? '' : 's'}
          </span>
        </div>
        <RosterTable members={members} />
      </section>

      {/* Invites (admin only) */}
      {isAdmin && (
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
            }}
          >
            <h2
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '1.25rem',
                color: '#fff',
                letterSpacing: '0.05em',
                margin: 0,
              }}
            >
              Invites
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
              Share codes to add people to your team
            </span>
          </div>
          <InviteTable teamId={team.id} invites={invites} teamSlug={team.slug} />
        </section>
      )}

      {/* Events placeholder (Day 4) */}
      <section>
        <h2
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.25rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: '0 0 0.75rem',
          }}
        >
          Events
        </h2>
        <div
          style={{
            background: '#0f0f0f',
            border: '1px dashed #2a2a2a',
            borderRadius: 12,
            padding: '2rem 1.5rem',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            🗓️ Ice time scheduler, practices, and games coming in Day 4.
          </p>
        </div>
      </section>
    </div>
  );
}
