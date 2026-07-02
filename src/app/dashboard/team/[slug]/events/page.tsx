import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { hasTeamAdminAccess } from '@/lib/tier-gate';
import EventListItem from '@/components/team/EventListItem';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ kind?: string }>;
}

const VALID_KINDS = ['practice', 'game', 'tournament', 'tryout', 'meeting', 'team_event'];

export default async function EventsListPage({ params, searchParams }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  const sp = await searchParams;
  const filterKind = sp.kind && VALID_KINDS.includes(sp.kind) ? sp.kind : null;

  // Team lookup
  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name, currency, timezone')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) notFound();

  // Membership check (any team member can view)
  const { data: myMembership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (!myMembership) {
    return (
      <div style={{ maxWidth: 720, padding: '2rem 1.5rem' }}>
        <h1 style={{ color: '#C8102E' }}>Not a member</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>You aren&rsquo;t on this team&rsquo;s roster.</p>
        <Link href={`/dashboard/team/${normalizedSlug}`} style={{ color: '#FFB81C' }}>
          ← Back to team
        </Link>
      </div>
    );
  }

  // Tier gate (for showing the "New event" CTA)
  const gate = await hasTeamAdminAccess(userId);

  // Fetch events
  let query = supabaseAdmin
    .from('team_events')
    .select('id, event_kind, title, starts_at, ends_at, location_note, opposing_team, is_off_ice, status, timezone')
    .eq('team_id', team.id)
    .order('starts_at', { ascending: false })
    .limit(500);
  if (filterKind) query = query.eq('event_kind', filterKind);

  const { data: events } = await query;

  // RSVP counts in one query (grouped by event_id + response='yes')
  const eventIds = (events || []).map((e) => e.id);
  const rsvpCounts: Record<string, number> = {};
  if (eventIds.length > 0) {
    const { data: rsvps } = await supabaseAdmin
      .from('team_rsvps')
      .select('event_id')
      .in('event_id', eventIds)
      .eq('response', 'yes');
    for (const r of rsvps || []) {
      rsvpCounts[r.event_id] = (rsvpCounts[r.event_id] || 0) + 1;
    }
  }

  return (
    <div style={{ maxWidth: 980, padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={`/dashboard/team/${normalizedSlug}`} style={{ fontSize: 13, color: '#FFB81C', textDecoration: 'none' }}>
          ← Back to {team.name}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '2rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
              EVENTS
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
              Practices, games, tournaments, meetings — for {team.name}
            </p>
          </div>
          {gate.allowed ? (
            <Link
              href={`/dashboard/team/${normalizedSlug}/events/new`}
              style={{
                padding: '0.55rem 1rem',
                background: '#FFB81C',
                color: '#0D1117',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              + New event
            </Link>
          ) : (
            <Link
              href="/pricing"
              style={{
                padding: '0.55rem 1rem',
                background: 'rgba(255,184,28,0.1)',
                color: '#FFB81C',
                border: '1px solid rgba(255,184,28,0.4)',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
              title="Upgrade to a paid tier to create events"
            >
              Upgrade to create events
            </Link>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <FilterPill href={`/dashboard/team/${normalizedSlug}/events`} active={!filterKind} label={`All (${(events || []).length})`} />
        {VALID_KINDS.map((k) => {
          const count = (events || []).filter((e) => e.event_kind === k).length;
          if (count === 0 && filterKind !== k) return null;
          return (
            <FilterPill
              key={k}
              href={`/dashboard/team/${normalizedSlug}/events?kind=${k}`}
              active={filterKind === k}
              label={`${k.replace('_', ' ')} (${count})`}
            />
          );
        })}
      </div>

      {/* Event list */}
      {events && events.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map((e) => (
            <EventListItem
              key={e.id}
              teamSlug={normalizedSlug}
              event={{ ...e, timezone: e.timezone ?? team?.timezone ?? null }}
              rsvpCount={rsvpCounts[e.id] ?? 0}
            />
          ))}
        </div>
      ) : (
        <div style={{
          padding: '3rem 2rem',
          background: '#0f0f0f',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: 12,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
            {filterKind ? `No ${filterKind.replace('_', ' ')} events yet.` : 'No events yet.'}
          </p>
          {gate.allowed && (
            <Link
              href={`/dashboard/team/${normalizedSlug}/events/new`}
              style={{
                display: 'inline-block',
                marginTop: 16,
                padding: '0.5rem 1rem',
                background: '#FFB81C',
                color: '#0D1117',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Create the first one
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function FilterPill({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      style={{
        padding: '0.35rem 0.85rem',
        background: active ? 'rgba(255,184,28,0.15)' : 'rgba(255,255,255,0.04)',
        border: active ? '1px solid #FFB81C' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: active ? '#FFB81C' : 'rgba(255,255,255,0.7)',
        textDecoration: 'none',
        textTransform: 'capitalize',
      }}
    >
      {label}
    </Link>
  );
}