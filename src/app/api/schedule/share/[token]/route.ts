import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { teamShortLabel } from '@/lib/team-color';

export const dynamic = 'force-dynamic';

// Schedule share tokens are stored in the public.schedule_share_tokens table.
// See migration 2026-07-16_schedule_share_tokens.sql. Replaces the prior
// in-memory globalThis Map (which lost tokens on every Vercel cold start).

/**
 * GET /api/schedule/share/[token]
 *
 * Returns a JSON blob of the user's shared events. No auth required —
 * the token IS the credential (bearer-style). Excludes cancelled events.
 *
 * Query params:
 *   days  — how many days ahead (default 90, max 365)
 *
 * Response shape: { user_id, expires_at, events: [...] }
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || token.length < 8) {
    return new NextResponse(JSON.stringify({ error: 'invalid_token' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Look up the token in the database. Tokens are bearer-style: knowing
  // the 192-bit secret grants read access. No enumeration possible.
  const { data: meta, error: lookupErr } = await supabaseAdmin
    .from('schedule_share_tokens')
    .select('user_id, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (lookupErr) {
    return new NextResponse(JSON.stringify({ error: 'lookup_failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!meta) {
    return new NextResponse(JSON.stringify({ error: 'token_not_found_or_revoked' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (new Date(meta.expires_at) < new Date()) {
    return new NextResponse(JSON.stringify({ error: 'token_expired' }), {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = meta.user_id;

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
    return NextResponse.json({
      user_id: userId,
      expires_at: meta.expires_at,
      events: [],
    });
  }

  const teamIds = teamsList.map((t) => t.id);
  const teamById = new Map(teamsList.map((t) => [t.id, t]));

  const url = new URL(req.url);
  const daysParam = parseInt(url.searchParams.get('days') || '90', 10);
  const days = Math.max(1, Math.min(365, Number.isFinite(daysParam) ? daysParam : 90));

  const now = new Date();
  const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const { data: events } = await supabaseAdmin
    .from('team_events')
    .select('id, team_id, event_kind, title, description, starts_at, ends_at, location_note, opposing_team, status, updated_at')
    .in('team_id', teamIds)
    .gte('starts_at', now.toISOString())
    .lte('starts_at', horizon.toISOString())
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true })
    .limit(1000);

  const out = (events || []).map((e) => {
    const team = teamById.get(e.team_id);
    return {
      id: e.id,
      team_id: e.team_id,
      team_name: team?.name || '',
      team_short_name: team ? teamShortLabel(team) : '',
      team_slug: team?.slug || '',
      event_kind: e.event_kind,
      title: e.title,
      description: e.description,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      location_note: e.location_note,
      opposing_team: e.opposing_team,
      status: e.status,
    };
  });

  return NextResponse.json({
    user_id: userId,
    expires_at: meta.expires_at,
    events: out,
  });
}