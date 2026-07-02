// Team-specific schedule page
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import TeamCalendar, { CalendarEvent, CalendarTeam } from '@/components/team/TeamCalendar';
import PrintButton from '@/components/ui/PrintButton';
import ShareScheduleButton from '@/components/ui/ShareScheduleButton';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; date?: string; kind?: string }>;
}

export default async function TeamSchedulePage({ params, searchParams }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  const { slug } = await params;
  const sp = await searchParams;
  const initialView = (['month', 'week', 'day', 'agenda'].includes(sp.view || '') ? sp.view : 'month') as 'month' | 'week' | 'day' | 'agenda';
  const initialDate = sp.date;
  const initialKind = sp.kind || '';

  const normalizedSlug = (slug || '').toLowerCase().trim();

  // Get team
  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name, currency, timezone')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!team) notFound();

  // Check membership
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

  // Fetch events for this team
  const now = new Date();
  const horizon = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());

  const { data: eventsRaw } = await supabaseAdmin
    .from('team_events')
    .select('id, event_kind, title, starts_at, ends_at, location_note, opposing_team, is_off_ice, status, timezone')
    .eq('team_id', team.id)
    .gte('starts_at', now.toISOString())
    .lte('starts_at', horizon.toISOString())
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true })
    .limit(500);

  const teamsList: CalendarTeam[] = [{ id: team.id, name: team.name, short_name: null, slug: team.slug }];

  const events: CalendarEvent[] = (eventsRaw || []).map((e) => ({
    id: e.id,
    team_id: team.id,
    team_name: team.name,
    team_short_name: null,
    team_slug: team.slug,
    event_kind: e.event_kind,
    title: e.title,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    location_note: e.location_note,
    opposing_team: e.opposing_team,
    is_off_ice: e.is_off_ice || false,
    status: e.status,
    timezone: e.timezone ?? team.timezone ?? null,
  }));

  return (
    <div style={{ maxWidth: 1180, padding: '2rem 1.5rem' }}>
      <header style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: '0.85rem', letterSpacing: '0.18em', color: '#FFB81C', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>
            Team schedule
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '2rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
            {team.name}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
            Practices, games, tournaments — for {team.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: 'column' }}>
          <a
            href={`/api/schedule/ics?team=${team.id}`}
            style={{
              padding: '0.5rem 0.9rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            📥 Export .ics
          </a>
          <PrintButton />
        </div>
      </header>

      <TeamCalendar
        events={events}
        teams={teamsList}
        initialView={initialView}
        initialDate={initialDate}
        initialKind={initialKind}
      />
    </div>
  );
}