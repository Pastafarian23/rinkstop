import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { hasTeamAdminAccess } from '@/lib/tier-gate';
import EventForm from '@/components/team/EventForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

const ADMIN_ROLES = ['head_coach', 'assistant_coach', 'manager', 'president', 'vice_president'];

export default async function EditEventPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

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

  const gate = await hasTeamAdminAccess(userId);
  const isAuthor = event.created_by === userId;
  const isAdmin = ADMIN_ROLES.includes(myMembership.role);
  const canEdit = gate.allowed && (isAuthor || isAdmin);

  if (!canEdit) {
    return (
      <div style={{ maxWidth: 720, padding: '2rem 1.5rem' }}>
        <Link href={`/dashboard/team/${normalizedSlug}/events/${event.id}`} style={{ fontSize: 13, color: '#FFB81C', textDecoration: 'none' }}>
          ← Back to event
        </Link>
        <div style={{
          marginTop: 16, padding: '2rem', textAlign: 'center',
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12,
        }}>
          <h1 style={{ color: '#fff', fontSize: '1.25rem', margin: '0 0 8px' }}>Cannot edit this event</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, margin: 0 }}>
            {!gate.allowed
              ? 'A paid tier is required to edit events.'
              : 'Only the event creator or a team admin can edit this event.'}
          </p>
        </div>
      </div>
    );
  }

  // Load rinks + practice plans for the form dropdowns
  const [{ data: rinks }, { data: plans }] = await Promise.all([
    supabaseAdmin.from('rinks').select('id, name').order('name').limit(500),
    supabaseAdmin.from('practice_plans').select('id, title, slug').eq('is_published', true).order('title').limit(200),
  ]);

  return (
    <div style={{ maxWidth: 760, padding: '2rem 1.5rem' }}>
      <Link href={`/dashboard/team/${normalizedSlug}/events/${event.id}`} style={{ fontSize: 13, color: '#FFB81C', textDecoration: 'none' }}>
        ← Back to event
      </Link>
      <div style={{ marginTop: 8, marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '2rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
          EDIT EVENT
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
          Update details for {event.title}
        </p>
      </div>
      <div style={{
        background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem',
      }}>
        <EventForm
          teamSlug={normalizedSlug}
          isEdit
          initial={{
            id: event.id,
            event_kind: event.event_kind,
            title: event.title,
            description: event.description,
            starts_at: event.starts_at,
            ends_at: event.ends_at,
            arrival_minutes: event.arrival_minutes,
            rink_id: event.rink_id,
            opposing_team: event.opposing_team,
            location_note: event.location_note,
            is_off_ice: event.is_off_ice,
            practice_plan_id: event.practice_plan_id,
            rsvp_required: event.rsvp_required,
            rsvp_deadline: event.rsvp_deadline,
            max_attendees: event.max_attendees,
            cost_per_player: event.cost_per_player,
            currency: event.currency,
            status: event.status,
          }}
          rinks={rinks || []}
          practicePlans={plans || []}
          defaultCurrency={team.currency || 'USD'}
        />
      </div>
    </div>
  );
}