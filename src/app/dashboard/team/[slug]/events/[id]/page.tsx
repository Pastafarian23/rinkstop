import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { hasTeamAdminAccess } from '@/lib/tier-gate';
import EventKindBadge from '@/components/team/EventKindBadge';
import DeleteButtonClient from './DeleteButtonClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function fmtMoney(n: number | string | null | undefined, currency: string): string {
  if (n == null) return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (!Number.isFinite(num)) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
  } catch {
    return `${num} ${currency}`;
  }
}

const ADMIN_ROLES = ['head_coach', 'assistant_coach', 'manager', 'president', 'vice_president'];

export default async function EventDetailPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const { slug, id } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  if (!id) notFound();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name, currency')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) notFound();

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
        <Link href={`/dashboard/team/${normalizedSlug}`} style={{ color: '#FFB81C' }}>
          ← Back to team
        </Link>
      </div>
    );
  }

  const { data: event } = await supabaseAdmin
    .from('team_events')
    .select('*')
    .eq('id', id)
    .eq('team_id', team.id)
    .maybeSingle();
  if (!event) notFound();

  // RSVP summary
  const { data: rsvps } = await supabaseAdmin
    .from('team_rsvps')
    .select('response')
    .eq('event_id', id);
  const yesCount = (rsvps || []).filter((r) => r.response === 'yes').length;
  const noCount = (rsvps || []).filter((r) => r.response === 'no').length;
  const maybeCount = (rsvps || []).filter((r) => r.response === 'maybe').length;

  // Linked rink
  let rink: { id: string; name: string; city?: string | null; country?: string | null } | null = null;
  if (event.rink_id) {
    const { data: r } = await supabaseAdmin
      .from('rinks')
      .select('id, name, city, country')
      .eq('id', event.rink_id)
      .maybeSingle();
    rink = r || null;
  }

  // Linked practice plan
  let plan: { id: string; title: string; slug: string } | null = null;
  if (event.practice_plan_id) {
    const { data: p } = await supabaseAdmin
      .from('practice_plans')
      .select('id, title, slug')
      .eq('id', event.practice_plan_id)
      .maybeSingle();
    plan = p || null;
  }

  // Permissions
  const gate = await hasTeamAdminAccess(userId);
  const isAuthor = event.created_by === userId;
  const isAdmin = ADMIN_ROLES.includes(myMembership.role);
  const canEdit = gate.allowed && (isAuthor || isAdmin);

  const isCancelled = event.status === 'cancelled';
  const isCompleted = event.status === 'completed';

  return (
    <div style={{ maxWidth: 760, padding: '2rem 1.5rem' }}>
      <Link href={`/dashboard/team/${normalizedSlug}/events`} style={{ fontSize: 13, color: '#FFB81C', textDecoration: 'none' }}>
        ← Back to events
      </Link>

      <div style={{ marginTop: 12, marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <EventKindBadge kind={event.event_kind} size="md" />
          {event.is_off_ice && (
            <span style={{
              fontSize: 11, padding: '0.15rem 0.55rem', borderRadius: 999,
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)',
              border: '1px solid rgba(255,255,255,0.1)', textTransform: 'uppercase',
              fontWeight: 700, letterSpacing: '0.05em',
            }}>Off-ice</span>
          )}
          {isCancelled && (
            <span style={{
              fontSize: 11, padding: '0.15rem 0.55rem', borderRadius: 999,
              background: 'rgba(200,16,46,0.15)', color: '#C8102E',
              border: '1px solid rgba(200,16,46,0.4)', textTransform: 'uppercase',
              fontWeight: 700, letterSpacing: '0.05em',
            }}>Cancelled</span>
          )}
          {isCompleted && (
            <span style={{
              fontSize: 11, padding: '0.15rem 0.55rem', borderRadius: 999,
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)',
              border: '1px solid rgba(255,255,255,0.15)', textTransform: 'uppercase',
              fontWeight: 700, letterSpacing: '0.05em',
            }}>Done</span>
          )}
        </div>
        <h1 style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '2.25rem', color: '#fff', letterSpacing: '0.04em', margin: 0,
          textDecoration: isCancelled ? 'line-through' : 'none',
        }}>
          {event.title}
        </h1>
        {canEdit && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <Link
              href={`/dashboard/team/${normalizedSlug}/events/${event.id}/edit`}
              style={{
                padding: '0.5rem 1rem', background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6,
                color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}
            >
              Edit
            </Link>
            <DeleteButtonClient teamSlug={normalizedSlug} eventId={event.id} title={event.title} />
          </div>
        )}
      </div>

      {event.description && (
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, marginBottom: 24, whiteSpace: 'pre-wrap' }}>
          {event.description}
        </p>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
        background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.25rem',
        marginBottom: 16,
      }}>
        <DetailRow label="Date" value={fmtDate(event.starts_at)} />
        <DetailRow label="Time" value={`${fmtTime(event.starts_at)} → ${fmtTime(event.ends_at)}`} />
        <DetailRow label="Arrive" value={`${event.arrival_minutes || 30} min before`} />
        {event.opposing_team && (
          <DetailRow label="Opponent" value={event.opposing_team} />
        )}
        {rink && (
          <DetailRow label="Rink" value={rink.name + (rink.city ? ` · ${rink.city}` : '')} />
        )}
        {event.location_note && (
          <DetailRow label="Location note" value={event.location_note} />
        )}
        {plan && (
          <DetailRow
            label="Practice plan"
            value={
              <Link href={`/dashboard/plans/${plan.slug}`} style={{ color: '#FFB81C' }}>
                {plan.title} →
              </Link>
            }
          />
        )}
        {event.cost_per_player != null && (
          <DetailRow label="Cost" value={fmtMoney(event.cost_per_player, event.currency || 'USD')} />
        )}
        {event.max_attendees != null && (
          <DetailRow label="Max attendees" value={String(event.max_attendees)} />
        )}
      </div>

      {/* RSVP summary */}
      {event.rsvp_required && (
        <div style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.25rem',
          marginBottom: 16,
        }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 12px' }}>
            RSVP responses
          </h2>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RsvpStat label="Yes" count={yesCount} color="#FFB81C" />
            <RsvpStat label="Maybe" count={maybeCount} color="#3b82f6" />
            <RsvpStat label="No" count={noCount} color="#C8102E" />
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: '#fff' }}>{value}</div>
    </div>
  );
}

function RsvpStat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{count}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}