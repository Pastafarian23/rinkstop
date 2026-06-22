import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { TeamHeader } from '@/components/team/TeamHeader';
import { RosterTable, RosterMember, RosterMemberStatus } from '@/components/team/RosterTable';
import { InviteTable, InviteRow } from '@/components/team/InviteTable';
import { isAdminRole } from '@/lib/team';
import JoinWithCodeForm from './JoinWithCodeForm';
import AdminPostPanel from './AdminPostPanel';

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
        <JoinWithCodeForm teamSlug={team.slug} teamName={team.name} />
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

  // Fetch required team-wide documents + signature counts per member
  // (only documents where required = true count toward the docs column;
  //  payment-linked docs are excluded since they aren't roster-level reqs)
  const { data: requiredDocs } = await supabaseAdmin
    .from('team_documents')
    .select('id')
    .eq('team_id', team.id)
    .eq('required', true)
    .is('payment_id', null);

  const requiredDocIds = (requiredDocs || []).map((d: { id: string }) => d.id);

  // Signatures by user (player_id is Clerk user_id, not team_member.id)
  const signaturesByUserId: Record<string, number> = {};
  if (requiredDocIds.length > 0) {
    const { data: sigs } = await supabaseAdmin
      .from('document_signatures')
      .select('document_id, player_id, signed_by_user_id')
      .in('document_id', requiredDocIds);
    for (const s of sigs || []) {
      // A signature counts for a member if it names them as the player
      // OR the signer is the same Clerk user_id.
      const key = s.player_id || s.signed_by_user_id;
      if (!key) continue;
      signaturesByUserId[key] = (signaturesByUserId[key] || 0) + 1;
    }
  }

  // Outstanding fees per member
  // payment_records.player_id is the Clerk user_id (matches team_members.user_id)
  const { data: paymentRows } = await supabaseAdmin
    .from('payment_records')
    .select('player_id, amount_due, amount_paid, status')
    .in('status', ['unpaid', 'partial', 'pending_verification']);

  const outstandingCentsByUserId: Record<string, number> = {};
  for (const r of paymentRows || []) {
    const key = r.player_id as string;
    const due = Math.max(0, Number(r.amount_due || 0) - Number(r.amount_paid || 0));
    if (due > 0) {
      outstandingCentsByUserId[key] = (outstandingCentsByUserId[key] || 0) + Math.round(due * 100);
    }
  }

  const teamCurrency = (team as { currency?: string | null }).currency || 'PHP';

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

  // Per-member status: required-doc signature count + outstanding fees
  const statusByUserId: Record<string, RosterMemberStatus> = {};
  for (const m of members) {
    statusByUserId[m.userId] = {
      outstandingCents: outstandingCentsByUserId[m.userId] || 0,
      currency: teamCurrency,
      docsSigned: signaturesByUserId[m.userId] || 0,
      docsRequired: requiredDocIds.length,
    };
  }

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

      {/* Quick nav */}
      <nav style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {isAdmin && (
          <Link
            href={`/dashboard/team/${team.slug}/admin`}
            style={{
              background: '#FFB81C', color: '#041E42', textDecoration: 'none',
              padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 700, fontSize: '0.875rem',
            }}
          >
            🛡️ Admins hub
          </Link>
        )}
        <Link
          href={`/dashboard/team/${team.slug}/payments`}
          style={{
            background: '#041E42', color: '#fff', textDecoration: 'none',
            padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 700, fontSize: '0.875rem',
          }}
        >
          💰 Payments
        </Link>
        <Link
          href={`/dashboard/team/${team.slug}/documents`}
          style={{
            background: '#041E42', color: '#fff', textDecoration: 'none',
            padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 700, fontSize: '0.875rem',
          }}
        >
          📄 Documents
        </Link>
        <Link
          href={`/dashboard/payments`}
          style={{
            background: '#fff', color: '#041E42', textDecoration: 'none',
            padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 700, fontSize: '0.875rem',
            border: '1px solid #041E42',
          }}
        >
          My payments (all teams) →
        </Link>
      </nav>

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
        <RosterTable members={members} statusByUserId={statusByUserId} teamCurrency={teamCurrency} />
      </section>

      {/* Invites (admin only) */}
      {isAdmin && (
        <section id="invites">
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

      {/* Public Posts — admin-only: news, results, schedule */}
      {isAdmin && (
        <section id="admin-posts">
          <AdminPostPanel teamSlug={team.slug} teamId={team.id} />
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
