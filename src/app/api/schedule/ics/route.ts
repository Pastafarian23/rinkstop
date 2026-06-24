import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { teamShortLabel } from '@/lib/team-color';

export const dynamic = 'force-dynamic';

/**
 * GET /api/schedule/ics
 *
 * Returns an ICS (RFC 5545) calendar file with all upcoming events
 * across the user's teams.
 *
 * Auth: required (Clerk)
 *
 * Query params:
 *   days  — how many days ahead to include (default 90, max 365)
 *
 * Membership check: only events for teams the user is on (left_at IS NULL).
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(req.url);
  const daysParam = parseInt(url.searchParams.get('days') || '90', 10);
  const days = Math.max(1, Math.min(365, Number.isFinite(daysParam) ? daysParam : 90));

  // 1. Get user's teams
  const { data: memberships } = await supabaseAdmin
    .from('team_members')
    .select('team_id, team:team_workspaces(id, name, short_name, slug)')
    .eq('user_id', userId)
    .is('left_at', null);

  const teamsList = (memberships || [])
    .map((m: any) => {
      const t = Array.isArray(m.team) ? m.team[0] : m.team;
      return t;
    })
    .filter(Boolean) as Array<{ id: string; name: string; short_name: string | null; slug: string }>;

  if (teamsList.length === 0) {
    return new Response(icsError('No team memberships'), {
      status: 200,
      headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
    });
  }

  const teamIds = teamsList.map((t) => t.id);
  const teamById = new Map(teamsList.map((t) => [t.id, t]));

  const now = new Date();
  const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // 2. Fetch upcoming events
  const { data: events } = await supabaseAdmin
    .from('team_events')
    .select('id, team_id, event_kind, title, description, starts_at, ends_at, location_note, opposing_team, status, updated_at')
    .in('team_id', teamIds)
    .gte('starts_at', now.toISOString())
    .lte('starts_at', horizon.toISOString())
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true })
    .limit(1000);

  // 3. Build ICS
  const ics = buildIcs(events || [], teamById, days);

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="rinkstop-schedule-${isoDateForFilename(now)}.ics"`,
      'Cache-Control': 'private, no-cache, no-store, max-age=0',
    },
  });
}

function buildIcs(
  events: Array<{
    id: string;
    team_id: string;
    event_kind: string;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string;
    location_note: string | null;
    opposing_team: string | null;
    updated_at?: string;
  }>,
  teamById: Map<string, { id: string; name: string; short_name: string | null; slug: string }>,
  days: number
): string {
  const lines: string[] = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//RinkStop//Team Schedule//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push('X-WR-CALNAME:RinkStop Schedule');
  lines.push(`X-WR-CALDESC:${events.length} events across the next ${days} days`);

  const dtstamp = formatIcsDateTime(new Date());

  for (const e of events) {
    const team = teamById.get(e.team_id);
    const teamName = team?.name || 'Team';
    const teamLabel = teamShortLabel(team || { slug: team?.slug || '', name: teamName });
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.id}@rinkstop.com`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART:${formatIcsDateTime(new Date(e.starts_at))}`);
    lines.push(`DTEND:${formatIcsDateTime(new Date(e.ends_at))}`);
    lines.push(`SUMMARY:${icsEscape(`[${teamLabel}] ${e.title}`)}`);
    lines.push(`CATEGORIES:${icsEscape(teamName)}`);

    const descParts: string[] = [];
    descParts.push(`Event type: ${e.event_kind}`);
    if (e.opposing_team) descParts.push(`Opponent: ${e.opposing_team}`);
    if (e.description) descParts.push(e.description);
    descParts.push(`Team: ${teamName}`);
    descParts.push(`View: https://rinkstop.com/dashboard/team/${team?.slug || ''}/events/${e.id}`);
    lines.push(`DESCRIPTION:${icsEscape(descParts.join('\\n'))}`);

    if (e.location_note) {
      lines.push(`LOCATION:${icsEscape(e.location_note)}`);
    }

    if (e.updated_at) {
      lines.push(`LAST-MODIFIED:${formatIcsDateTime(new Date(e.updated_at))}`);
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  // ICS spec requires CRLF line endings
  return lines.join('\r\n');
}

function formatIcsDateTime(d: Date): string {
  // YYYYMMDDTHHMMSSZ (UTC)
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function icsEscape(text: string): string {
  // Per RFC 5545: escape backslash, semicolon, comma, and newline
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function icsError(reason: string): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RinkStop//Team Schedule//EN',
    `X-WR-CALDESC:${icsEscape(reason)}`,
    'END:VCALENDAR',
  ].join('\r\n');
}

function isoDateForFilename(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}