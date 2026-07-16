import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminRole } from '@/lib/team';
import { trackEvent } from '@/lib/analytics';
import { fanOutTeamNotification, fanOutTeamEmail } from '@/lib/team-notifications';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

function asStr(v: unknown, maxLen?: number): string | null {
  if (v == null) return null;
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (trimmed === '') return null;
  if (maxLen && trimmed.length > maxLen) return null;
  return trimmed;
}

function asInt(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) && Number.isInteger(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) && Number.isInteger(n) ? n : null;
  }
  return null;
}

function asDate(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + 'T00:00:00Z');
  return Number.isFinite(d.getTime()) ? v : null;
}

function asTsz(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v !== 'string') return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? v : null;
}

// GET — list recent posts for the team (for the admin UI)
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, timezone')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!team) return NextResponse.json({ error: 'team_not_found' }, { status: 404 });

  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();

  if (!membership || !isAdminRole(membership.role)) {
    return NextResponse.json({ error: 'not_admin' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

  const baseQuery = (q: any) =>
    q.eq('team_id', team.id).order('created_at', { ascending: false }).limit(limit);

  if (type === 'news') {
    const { data } = await baseQuery(
      supabaseAdmin.from('team_news').select('id, title, body, is_published, published_at, created_at')
    );
    return NextResponse.json({ data: data || [] });
  }
  if (type === 'results') {
    const { data } = await baseQuery(
      supabaseAdmin.from('team_results').select('id, game_date, opponent, home_away, our_score, their_score, outcome, notes, created_at')
    );
    return NextResponse.json({ data: data || [] });
  }
  if (type === 'schedule') {
    // team_events is the single source of truth for schedule.
    // Map team_events fields into the same shape the legacy UI expects.
    const { data: eventsData } = await supabaseAdmin
      .from('team_events')
      .select('id, event_kind, starts_at, opposing_team, location_note, status, description, created_at, legacy_schedule_id')
      .eq('team_id', team.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    const eventsAsSchedule = (eventsData || []).map(eventRowToSchedule);
    return NextResponse.json({ data: eventsAsSchedule });
  }

  // Return all types
  const [news, results, eventsAll] = await Promise.all([
    baseQuery(supabaseAdmin.from('team_news').select('id, title, body, published_at, is_published, created_at')),
    baseQuery(supabaseAdmin.from('team_results').select('id, game_date, opponent, home_away, our_score, their_score, outcome, notes, created_at')),
    supabaseAdmin
      .from('team_events')
      .select('id, event_kind, starts_at, opposing_team, location_note, status, description, created_at, legacy_schedule_id')
      .eq('team_id', team.id)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);
  const mergedSchedule = (eventsAll.data || []).map(eventRowToSchedule);

  return NextResponse.json({ news: news.data || [], results: results.data || [], schedule: mergedSchedule });
}

// Map a team_events row into the legacy schedule shape the UI consumes.
// Returns id as `legacy_schedule_id` if present (back-compat with old clients
// that stored team_schedule ids), else `evt_<team_events.id>` for clients that
// recognise the prefix, else the raw uuid.
function eventRowToSchedule(e: { id: string; event_kind: string; starts_at: string; opposing_team: string | null; location_note: string | null; status: string; description: string | null; created_at: string; legacy_schedule_id: string | null; }): { id: string; scheduled_at: string; opponent: string | null; kind: string; venue: string | null; home_away: null; notes: string | null; is_cancelled: boolean; is_published: boolean; published_at: string; created_at: string } {
  return {
    id: e.legacy_schedule_id || `evt_${e.id}`,
    scheduled_at: e.starts_at,
    opponent: e.opposing_team,
    kind: e.event_kind,
    venue: e.location_note,
    home_away: null,
    notes: e.description,
    is_cancelled: e.status === 'cancelled',
    is_published: true,
    published_at: e.created_at,
    created_at: e.created_at,
  };
}

// POST — create a news item, result, or schedule entry
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, timezone')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!team) return NextResponse.json({ error: 'team_not_found' }, { status: 404 });

  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();

  if (!membership || !isAdminRole(membership.role)) {
    return NextResponse.json({ error: 'not_admin' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const postType = asStr(body.type);
  if (!postType || !['news', 'result', 'schedule'].includes(postType)) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  }

  // ── NEWS ──────────────────────────────────────────────────────────────────
  if (postType === 'news') {
    const title = asStr(body.title, 160);
    const newsBody = asStr(body.body, 8000);
    if (!title) return NextResponse.json({ error: 'title_required' }, { status: 400 });
    if (!newsBody) return NextResponse.json({ error: 'body_required' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('team_news')
      .insert({
        team_id: team.id,
        author_user_id: userId,
        title,
        body: newsBody,
        is_published: body.is_published !== false,
      })
      .select('id, title, published_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    try {
      await trackEvent({
        name: 'team_news_posted',
        userId,
        pathname: `/dashboard/team/${team.slug}`,
        props: { team_id: team.id, team_slug: team.slug, post_id: data.id },
      });
    } catch {}
    // Fan out to team members (only when published)
    if (body.is_published !== false) {
      const fanoutArgs = {
        team_id: team.id,
        actor_user_id: userId,
        kind: 'news' as const,
        entity_id: data.id,
        title,
        body: newsBody.length > 200 ? newsBody.slice(0, 200) + '…' : newsBody,
        payload: { team_slug: team.slug, post_id: data.id },
        pref: 'notify_news' as const,
      };
      void fanOutTeamNotification(fanoutArgs);
      void fanOutTeamEmail(fanoutArgs);
    }
    return NextResponse.json({ ok: true, data });
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (postType === 'result') {
    const gameDate = asDate(body.game_date);
    const opponent = asStr(body.opponent, 120);
    const homeAway = asStr(body.home_away);
    const ourScore = asInt(body.our_score);
    const theirScore = asInt(body.their_score);

    if (!gameDate) return NextResponse.json({ error: 'game_date_required' }, { status: 400 });
    if (!opponent) return NextResponse.json({ error: 'opponent_required' }, { status: 400 });
    if (homeAway && !['home', 'away', 'neutral'].includes(homeAway)) {
      return NextResponse.json({ error: 'invalid_home_away' }, { status: 400 });
    }
    if (ourScore == null) return NextResponse.json({ error: 'our_score_required' }, { status: 400 });
    if (theirScore == null) return NextResponse.json({ error: 'their_score_required' }, { status: 400 });
    if (ourScore < 0 || ourScore > 99) return NextResponse.json({ error: 'invalid_our_score' }, { status: 400 });
    if (theirScore < 0 || theirScore > 99) return NextResponse.json({ error: 'invalid_their_score' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('team_results')
      .insert({
        team_id: team.id,
        author_user_id: userId,
        game_date: gameDate,
        opponent,
        home_away: homeAway || 'home',
        our_score: ourScore,
        their_score: theirScore,
        notes: asStr(body.notes, 2000),
      })
      .select('id, game_date, opponent, our_score, their_score, outcome')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    try {
      await trackEvent({
        name: 'team_result_posted',
        userId,
        pathname: `/dashboard/team/${team.slug}`,
        props: { team_id: team.id, team_slug: team.slug, result_id: data.id },
      });
    } catch {}
    {
      const fanoutArgs = {
        team_id: team.id,
        actor_user_id: userId,
        kind: 'result' as const,
        entity_id: data.id,
        title: `${data.outcome} vs ${data.opponent} ${data.our_score}–${data.their_score}`,
        payload: {
          team_slug: team.slug,
          result_id: data.id,
          outcome: data.outcome,
          opponent: data.opponent,
          our_score: data.our_score,
          their_score: data.their_score,
          game_date: data.game_date,
        },
        pref: 'notify_results' as const,
      };
      void fanOutTeamNotification(fanoutArgs);
      void fanOutTeamEmail(fanoutArgs);
    }
    return NextResponse.json({ ok: true, data });
  }

  // ── SCHEDULE ──────────────────────────────────────────────────────────────
  if (postType === 'schedule') {
    const scheduledAt = asTsz(body.scheduled_at);
    const kind = asStr(body.kind);
    if (!scheduledAt) return NextResponse.json({ error: 'scheduled_at_required' }, { status: 400 });
    if (!kind || !['game', 'practice', 'tournament', 'meeting', 'other'].includes(kind)) {
      return NextResponse.json({ error: 'invalid_kind' }, { status: 400 });
    }

    const homeAway = asStr(body.home_away);
    if (homeAway && !['home', 'away', 'neutral'].includes(homeAway)) {
      return NextResponse.json({ error: 'invalid_home_away' }, { status: 400 });
    }

    // team_events is the single source of truth. Insert directly there.
    // Legacy form fields (home_away, is_published) are silently dropped — the
    // new event system has status + always-public + rink location, no home/away.
    const allowedKinds = new Set(['practice', 'game', 'tournament', 'meeting', 'other']);
    const newEventKind = allowedKinds.has(kind) ? kind : 'other';
    const startsAtMs = new Date(scheduledAt).getTime();
    const endsAtIso = new Date(startsAtMs + 90 * 60 * 1000).toISOString();
    const venueText = asStr(body.venue, 200);
    let rinkId: string | null = null;
    if (venueText) {
      const sanitizedVenue = venueText.replace(/[%_,]/g, '');
      const { data: rinkMatch } = await supabaseAdmin
        .from('rinks')
        .select('id')
        .or(`name.ilike.%${sanitizedVenue}%,city.ilike.%${sanitizedVenue}%`)
        .limit(1)
        .maybeSingle();
      rinkId = rinkMatch?.id ?? null;
    }
    const oppText = asStr(body.opponent, 120);
    const kindLabel = newEventKind.charAt(0).toUpperCase() + newEventKind.slice(1);
    const notesText = asStr(body.notes, 2000);
    const teamEventRow = {
      team_id: team.id,
      rink_id: rinkId,
      event_kind: newEventKind,
      title: oppText ? `${kindLabel} vs ${oppText}` : kindLabel,
      starts_at: scheduledAt,
      ends_at: endsAtIso,
      arrival_minutes: 30,
      opposing_team: oppText || null,
      location_note: venueText || null,
      description: notesText || null,
      rsvp_required: false,
      status: body.is_cancelled === true ? 'cancelled' : 'scheduled',
      created_by: userId,
      timezone: team.timezone || 'UTC',
    };
    const { data, error } = await supabaseAdmin
      .from('team_events')
      .insert(teamEventRow)
      .select('id, event_kind, starts_at, opposing_team, location_note, status, description, created_at, legacy_schedule_id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    try {
      await trackEvent({
        name: 'team_schedule_added',
        userId,
        pathname: `/dashboard/team/${team.slug}`,
        props: { team_id: team.id, team_slug: team.slug, schedule_id: data.id },
      });
    } catch {}
    if (body.is_published !== false) {
      const opp = asStr(body.opponent, 120);
      const ven = asStr(body.venue, 200);
      const fanoutArgs = {
        team_id: team.id,
        actor_user_id: userId,
        kind: 'schedule' as const,
        entity_id: data.id,
        title: `New ${kind}${opp ? `: ${opp}` : ''}${ven ? ` @ ${ven}` : ''}`,
        payload: {
          team_slug: team.slug,
          schedule_id: data.id,
          kind,
          opponent: opp,
          venue: ven,
          scheduled_at: data.starts_at,
        },
        pref: 'notify_schedule' as const,
      };
      void fanOutTeamNotification(fanoutArgs);
      void fanOutTeamEmail(fanoutArgs);
    }
    return NextResponse.json({ ok: true, data });
  }

  return NextResponse.json({ error: 'unreachable' }, { status: 500 });
}

// PATCH — edit a news or schedule post (results are immutable; delete + repost)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, timezone')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!team) return NextResponse.json({ error: 'team_not_found' }, { status: 404 });

  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();

  if (!membership || !isAdminRole(membership.role)) {
    return NextResponse.json({ error: 'not_admin' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const postType = asStr(body.type);
  const postId = asStr(body.id);
  if (!postType || !['news', 'schedule'].includes(postType)) {
    return NextResponse.json({ error: 'invalid_type_or_immutable' }, { status: 400 });
  }
  if (!postId) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  // ── NEWS ──────────────────────────────────────────────────────────────────
  if (postType === 'news') {
    const patch: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const t = asStr(body.title, 160);
      if (!t) return NextResponse.json({ error: 'title_invalid' }, { status: 400 });
      patch.title = t;
    }
    if (body.body !== undefined) {
      const b = asStr(body.body, 8000);
      if (!b) return NextResponse.json({ error: 'body_invalid' }, { status: 400 });
      patch.body = b;
    }
    if (body.is_published !== undefined) {
      patch.is_published = body.is_published !== false;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('team_news')
      .update(patch)
      .eq('id', postId)
      .eq('team_id', team.id)
      .select('id, title, body, is_published, published_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    try {
      await trackEvent({
        name: 'team_news_edited',
        userId,
        pathname: `/dashboard/team/${team.slug}`,
        props: { team_id: team.id, team_slug: team.slug, post_id: postId, fields: Object.keys(patch) },
      });
    } catch {}
    return NextResponse.json({ ok: true, data });
  }

  // ── SCHEDULE ──────────────────────────────────────────────────────────────
  if (postType === 'schedule') {
    const patch: Record<string, unknown> = {};
    if (body.scheduled_at !== undefined) {
      const s = asTsz(body.scheduled_at);
      if (!s) return NextResponse.json({ error: 'scheduled_at_invalid' }, { status: 400 });
      patch.scheduled_at = s;
    }
    if (body.opponent !== undefined) {
      patch.opponent = asStr(body.opponent, 120);
    }
    if (body.kind !== undefined) {
      const k = asStr(body.kind);
      if (!k || !['game', 'practice', 'tournament', 'meeting', 'other'].includes(k)) {
        return NextResponse.json({ error: 'invalid_kind' }, { status: 400 });
      }
      patch.kind = k;
    }
    if (body.venue !== undefined) {
      patch.venue = asStr(body.venue, 200);
    }
    if (body.home_away !== undefined) {
      const ha = asStr(body.home_away);
      if (ha && !['home', 'away', 'neutral'].includes(ha)) {
        return NextResponse.json({ error: 'invalid_home_away' }, { status: 400 });
      }
      patch.home_away = ha;
    }
    if (body.notes !== undefined) {
      patch.notes = asStr(body.notes, 2000);
    }
    if (body.is_cancelled !== undefined) {
      patch.is_cancelled = body.is_cancelled === true;
    }
    if (body.is_published !== undefined) {
      const wantPublished = body.is_published === true;
      patch.is_published = wantPublished;
      // Set published_at on first publish; leave it alone on subsequent edits.
      if (wantPublished) patch.published_at = new Date().toISOString();
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
    }

    // Resolve postId: strip evt_ prefix if present, then look up matching team_events row.
    // Forgiving: matches by id, legacy_schedule_id, or id-with-prefix-stripped.
    const stripEvt = postId.startsWith('evt_') ? postId.slice(4) : postId;
    const { data: existing } = await supabaseAdmin
      .from('team_events')
      .select('id, legacy_schedule_id, event_kind, opposing_team')
      .eq('team_id', team.id)
      .or(`id.eq.${stripEvt},legacy_schedule_id.eq.${stripEvt}`)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: 'event_not_found' }, { status: 404 });

    // team_events is the single source of truth. Update directly here.
    // Map legacy schedule fields → team_events fields.
    // home_away, is_published, published_at are silently dropped (legacy concepts).
    const teamEventsPatch: Record<string, unknown> = {};
    if (patch.scheduled_at !== undefined) {
      teamEventsPatch.starts_at = patch.scheduled_at;
      // Keep ends_at as a 90-min default from new starts_at
      const startsAtMs = new Date(patch.scheduled_at as string).getTime();
      teamEventsPatch.ends_at = new Date(startsAtMs + 90 * 60 * 1000).toISOString();
    }
    if (patch.opponent !== undefined) {
      teamEventsPatch.opposing_team = patch.opponent || null;
      const kind = (existing.event_kind || 'other') as string;
      const kindLabel = kind.charAt(0).toUpperCase() + kind.slice(1);
      teamEventsPatch.title = patch.opponent ? `${kindLabel} vs ${patch.opponent}` : kindLabel;
    }
    if (patch.venue !== undefined) teamEventsPatch.location_note = patch.venue || null;
    if (patch.notes !== undefined) teamEventsPatch.description = patch.notes || null;
    if (patch.is_cancelled !== undefined) {
      teamEventsPatch.status = patch.is_cancelled === true ? 'cancelled' : 'scheduled';
    }
    if (Object.keys(teamEventsPatch).length === 0) {
      return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin
      .from('team_events')
      .update(teamEventsPatch)
      .eq('id', existing.id)
      .eq('team_id', team.id)
      .select('id, event_kind, starts_at, opposing_team, location_note, status, description, created_at, legacy_schedule_id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    try {
      await trackEvent({
        name: 'team_schedule_edited',
        userId,
        pathname: `/dashboard/team/${team.slug}`,
        props: { team_id: team.id, team_slug: team.slug, schedule_id: postId, fields: Object.keys(patch) },
      });
    } catch {}
    return NextResponse.json({ ok: true, data });
  }

  return NextResponse.json({ error: 'unreachable' }, { status: 500 });
}

// DELETE — delete a post (any type)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!team) return NextResponse.json({ error: 'team_not_found' }, { status: 404 });

  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();

  if (!membership || !isAdminRole(membership.role)) {
    return NextResponse.json({ error: 'not_admin' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const postType = searchParams.get('type');
  const postId = searchParams.get('id');

  if (!postType || !['news', 'result', 'schedule'].includes(postType)) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  }
  if (!postId) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  const tableMap: Record<string, string> = { news: 'team_news', result: 'team_results', schedule: 'team_events' };
  const table = tableMap[postType];

  // Results are immutable — no DELETE
  if (postType === 'result') {
    return NextResponse.json({ error: 'results_are_immutable' }, { status: 400 });
  }

  if (postType === 'schedule') {
    // Resolve postId: strip evt_ prefix if present, then look up matching row.
    const stripEvt = postId.startsWith('evt_') ? postId.slice(4) : postId;
    const { data: existing } = await supabaseAdmin
      .from('team_events')
      .select('id, legacy_schedule_id')
      .eq('team_id', team.id)
      .or(`id.eq.${stripEvt},legacy_schedule_id.eq.${stripEvt}`)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: 'event_not_found' }, { status: 404 });
    const { error } = await supabaseAdmin
      .from('team_events')
      .delete()
      .eq('id', existing.id)
      .eq('team_id', team.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabaseAdmin.from(table).delete().eq('id', postId).eq('team_id', team.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}