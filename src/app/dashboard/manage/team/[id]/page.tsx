import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { isIdentityVerified } from '@/lib/identity-verified';
import EntityEditForm from '../../EntityEditForm';
import { UpgradePrompt } from '@/components/UpgradePrompt';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ManageTeamPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');
  const { id } = await params;

  const { data: entity, error } = await supabaseAdmin
    .from('team_workspaces')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !entity) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B7A', padding: '1rem 1.25rem', borderRadius: 8 }}>
          Could not load team. It may have been removed.
        </div>
        <Link href="/dashboard/claims" style={{ display: 'inline-block', marginTop: '1rem', color: '#14B8A6' }}>← Back to claims</Link>
      </div>
    );
  }

  const { count: claimCount } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('claim_type', 'team')
    .eq('entity_id', id)
    .eq('status', 'approved');

  if (!claimCount) {
    return (
      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', color: '#FFB81C', padding: '1rem 1.25rem', borderRadius: 8, fontSize: '0.9rem' }}>
          You don&rsquo;t have an approved claim for this team. Claim it first, then come back here to edit.
        </div>
        <Link href={`/dashboard/claims?entity=team&id=${id}`} style={{ color: '#14B8A6' }}>→ Go to claims</Link>
      </div>
    );
  }

  // Fetch the user's current tier for upgrade prompting.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();
  const userTier = profile?.tier || 'free';

  // WS25 (2026-08-23): pass isVerified so the edit form can show the
  // verification banner for unverified team owners.
  const ownerVerified = await isIdentityVerified(userId).catch(() => false);

  // Phase 2: if the user is on an identity track (not organization), show an
  // upgrade prompt pointing them to the organization pricing track. Org plan
  // users (club_starter+) already have team management.
  const needsOrgPlan = !['club_starter', 'club_pro', 'club_elite', 'league', 'federation'].includes(userTier);

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem 1.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ fontSize: '2rem' }}>🏒</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>
            MANAGE TEAM
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entity.name as string}
          </p>
        </div>
      </div>

      {needsOrgPlan && (
        <UpgradePrompt
          forGroup="organization"
          entityLabel="team"
          requiredTier="Club Starter"
          userCurrentTier={userTier === 'free' ? undefined : userTier}
        />
      )}

      <EntityEditForm
        type="team"
        id={id}
        initial={entity as Record<string, unknown>}
        slug={(entity as { slug?: string }).slug || null}
        publicHref={`/directory/teams/${(entity as { slug?: string }).slug || id}`}
        isVerified={ownerVerified}
      />

      <ProgramsCard teamId={id} />
    </div>
  );
}

/**
 * ProgramsCard (WS38 — Club Starter team-registration-management)
 *
 * Summary tile below the team entity editor. Shows program + recent RSVP
 * counts and routes to the programs list. Card style mirrors the rink
 * dashboard cards: background rgba(13,17,23,0.6), 1px solid var(--border).
 */
async function ProgramsCard({ teamId }: { teamId: string }) {
  const nowIso = new Date().toISOString();
  // Upcoming programs: starts_at >= now AND status='scheduled'.
  const { count: upcomingCount } = await supabaseAdmin
    .from('team_events')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .gte('starts_at', nowIso)
    .eq('status', 'scheduled');

  // Total programs (any status).
  const { count: totalCount } = await supabaseAdmin
    .from('team_events')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId);

  // Recent RSVPs: count RSVPs for this team's programs in the last 14 days.
  // We do a single subquery via an IN(...) filter — much cheaper than a JOIN.
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: programIds } = await supabaseAdmin
    .from('team_events')
    .select('id')
    .eq('team_id', teamId);
  const ids = (programIds || []).map((r) => (r as { id: string }).id);
  let recentRsvpCount = 0;
  if (ids.length > 0) {
    const { count } = await supabaseAdmin
      .from('team_rsvps')
      .select('id', { count: 'exact', head: true })
      .in('event_id', ids)
      .gte('responded_at', fourteenDaysAgo);
    recentRsvpCount = count || 0;
  }

  return (
    <div
      style={{
        background: 'rgba(13,17,23,0.6)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '1.1rem' }}>📋</span>
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.15rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            PROGRAMS &amp; REGISTRATIONS
          </h2>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
          Create practices, tryouts, and events. Manage RSVPs in one place.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
        <Stat label="Programs" value={totalCount ?? 0} />
        <Stat label="Upcoming" value={upcomingCount ?? 0} highlight={(upcomingCount ?? 0) > 0} />
        <Stat label="Recent RSVPs (14d)" value={recentRsvpCount} />
      </div>
      <Link
        href={`/dashboard/manage/team/${teamId}/programs`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          background: 'rgba(56,189,248,0.1)',
          border: '1px solid rgba(56,189,248,0.3)',
          color: '#7DD3FC',
          padding: '0.5rem 0.875rem',
          borderRadius: 8,
          fontSize: '0.85rem',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Manage programs →
      </Link>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 70 }}>
      <span
        style={{
          color: highlight ? '#86EFAC' : '#fff',
          fontSize: '1.5rem',
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
    </div>
  );
}
