// Public readonly calendar view via share token
import { notFound } from 'next/navigation';
import TeamCalendar, { CalendarEvent, CalendarTeam } from '@/components/team/TeamCalendar';
import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

// Access the same in-memory store as the API
function getStore(): Map<string, { userId: string; createdAt: number; expiresAt: number }> | null {
  return (globalThis as any).__rinkstopShareStore || null;
}

export async function generateMetadata({ params }: { params: { token: string } }) {
  return {
    title: 'Shared Schedule',
    description: 'View this shared hockey schedule',
    robots: 'noindex', // Don't index shared schedule pages
  };
}

export default async function SharedSchedulePage({ params }: { params: { token: string } }) {
  const { token } = await params;
  const store = getStore();
  
  // Validate token exists and is not expired
  const meta = store?.get(token);
  if (!meta || meta.expiresAt < Date.now()) {
    notFound();
  }

  const { userId } = await auth();

  // Get all teams the sharing user is on
  const { data: memberships } = await supabaseAdmin
    .from('team_members')
    .select('team_id, team:team_workspaces(id, name, short_name, slug)')
    .eq('user_id', meta.userId)
    .is('left_at', null);

  const teamsList: CalendarTeam[] = (memberships || [])
    .map((m) => {
      const t: any = m.team;
      if (!t) return null;
      return { id: t.id, name: t.name, short_name: t.short_name, slug: t.slug };
    })
    .filter(Boolean) as CalendarTeam[];

  const teamIds = teamsList.map((t) => t.id);

  // Fetch upcoming events
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

  const teamById = new Map<string, CalendarTeam>();
  for (const t of teamsList) teamById.set(t.id, t);

  const events: CalendarEvent[] = (eventsRaw || []).map((e) => ({
    id: e.id,
    team_id: e.team_id,
    team_name: teamById.get(e.team_id)?.name || 'Team',
    team_short_name: teamById.get(e.team_id)?.short_name ?? null,
    team_slug: teamById.get(e.team_id)?.slug || '',
    event_kind: e.event_kind,
    title: e.title,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    location_note: e.location_note,
    opposing_team: e.opposing_team,
    is_off_ice: e.is_off_ice || false,
    status: e.status,
  }));

  return (
    <div style={{ maxWidth: 1180, padding: '2rem 1.5rem' }}>
      <header style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '2rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
          SHARED SCHEDULE
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
          {teamsList.length} team{teamsList.length === 1 ? '' : 's'} · Read-only view
        </p>
      </header>

      <TeamCalendar
        events={events}
        teams={teamsList}
        initialView="month"
        readonly={true}
      />
    </div>
  );
}