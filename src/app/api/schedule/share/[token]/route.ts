import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { teamShortLabel } from '@/lib/team-color';

export const dynamic = 'force-dynamic';

// We re-import the token store. In Next.js, each route file gets its own
// module instance in dev, but in production both route files share the same
// Node.js module cache for /api/schedule/share* handlers since they're in
// different paths. To be safe, we re-define a tiny accessor here too — but
// since module cache works on file path, the simpler approach is to share via
// a global symbol. Use a globalThis key to survive module boundaries.

// NOTE: In Next.js production, each route file is bundled separately and
// won't share module state with sibling routes. The cleaner pattern is a
// database table. For G1c we use a globalThis map so both routes see the
// same store even when bundled separately. Tokens are short-lived and
// ephemeral — that's an explicit tradeoff documented in the prep doc.

declare global {
  // eslint-disable-next-line no-var
  var __rinkstopShareStore: Map<string, { userId: string; createdAt: number; expiresAt: number }> | undefined;
}

function getStore(): Map<string, { userId: string; createdAt: number; expiresAt: number }> {
  if (!globalThis.__rinkstopShareStore) {
    globalThis.__rinkstopShareStore = new Map();
  }
  return globalThis.__rinkstopShareStore;
}

/**
 * GET /api/schedule/share/[token]
 *
 * Returns a JSON blob of the user's shared events. No auth required —
 * the token IS the credential. Excludes cancelled events.
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

  const store = getStore();
  const meta = store.get(token);
  if (!meta) {
    return new NextResponse(JSON.stringify({ error: 'token_not_found_or_revoked' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (meta.expiresAt < Date.now()) {
    store.delete(token);
    return new NextResponse(JSON.stringify({ error: 'token_expired' }), {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = meta.userId;

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
      expires_at: new Date(meta.expiresAt).toISOString(),
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
    expires_at: new Date(meta.expiresAt).toISOString(),
    events: out,
  });
}