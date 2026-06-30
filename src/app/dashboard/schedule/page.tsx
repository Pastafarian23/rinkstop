import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import TeamCalendar, { CalendarEvent, CalendarTeam } from '@/components/team/TeamCalendar';
import PrintButton from '@/components/ui/PrintButton';
import ShareScheduleButton from '@/components/ui/ShareScheduleButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Schedule' };

interface PageProps {
  searchParams: Promise<{ view?: string; date?: string; kind?: string; team?: string }>;
}

export default async function SchedulePage({ searchParams }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  const sp = await searchParams;
  const initialView = (['month', 'week', 'day', 'agenda'].includes(sp.view || '') ? sp.view : 'month') as 'month' | 'week' | 'day' | 'agenda';
  const initialDate = sp.date;
  const initialKind = sp.kind || '';
  const initialTeam = sp.team || 'all';

  // 1. Get all teams the user is on (active members only)
  const { data: memberships } = await supabaseAdmin
    .from('team_members')
    .select('team_id, team:team_workspaces(id, name, short_name, slug)')
    .eq('user_id', userId)
    .is('left_at', null);

  const teamsList: CalendarTeam[] = (memberships || [])
    .map((m) => {
      const t: any = m.team;
      if (!t) return null;
      return { id: t.id, name: t.name, short_name: t.short_name, slug: t.slug };
    })
    .filter(Boolean) as CalendarTeam[];

  if (teamsList.length === 0) {
    return (
      <div style={{ maxWidth: 980, padding: '2rem 1.5rem' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '2rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
          SCHEDULE
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', marginTop: 8 }}>
          You&rsquo;re not on any team rosters yet. Join a team to see its events here.
        </p>
        <Link
          href="/directory/teams"
          style={{
            display: 'inline-block', marginTop: 16, padding: '0.6rem 1.25rem',
            background: '#FFB81C', color: '#0D1117', borderRadius: 6,
            fontSize: 14, fontWeight: 700, textDecoration: 'none',
          }}
        >
          Browse teams
        </Link>
      </div>
    );
  }

  const teamIds = teamsList.map((t) => t.id);

  // 2. Fetch upcoming events for those teams (next 180 days to cover month/agenda views)
  const now = new Date();
  const horizon = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());

  const { data: eventsRaw } = await supabaseAdmin
    .from('team_events')
    .select('id, team_id, event_kind, title, starts_at, ends_at, location_note, opposing_team, is_off_ice, status')
    .in('team_id', teamIds)
    .gte('starts_at', now.toISOString())
    .lte('starts_at', horizon.toISOString())
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true })
    .limit(1000);

  // 3. Build team lookup for joining
  const teamById = new Map<string, CalendarTeam>();
  for (const t of teamsList) teamById.set(t.id, t);

  const events: CalendarEvent[] = (eventsRaw || []).map((e) => {
    const team = teamById.get(e.team_id);
    return {
      id: e.id,
      team_id: e.team_id,
      team_name: team?.name || 'Team',
      team_short_name: team?.short_name ?? null,
      team_slug: team?.slug || '',
      event_kind: e.event_kind,
      title: e.title,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      location_note: e.location_note,
      opposing_team: e.opposing_team,
      is_off_ice: e.is_off_ice || false,
      status: e.status,
    };
  });

  return (
    <div style={{ maxWidth: 1180, padding: '2rem 1.5rem' }}>
      <header style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '2rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
            SCHEDULE
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
            Events across <strong style={{ color: '#FFB81C' }}>{teamsList.length}</strong> team{teamsList.length === 1 ? '' : 's'} you&rsquo;re on. Color-coded so you always know which team.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: 'column' }}>
          <a
            href="/api/schedule/ics"
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
          <ShareScheduleButton />
          <PrintButton />
        </div>
      </header>

      <TeamCalendar
        events={events}
        teams={teamsList}
        initialView={initialView}
        initialDate={initialDate}
        initialKind={initialKind}
        initialTeam={initialTeam}
      />
    </div>
  );
}