import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminRole } from '@/lib/team';
import { trackEvent } from '@/lib/analytics';

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
    .select('id, slug')
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
    const { data } = await baseQuery(
      supabaseAdmin
        .from('team_schedule')
        .select('id, scheduled_at, opponent, kind, venue, home_away, notes, is_cancelled, created_at')
    );
    return NextResponse.json({ data: data || [] });
  }

  // Return all types
  const [news, results, schedule] = await Promise.all([
    baseQuery(supabaseAdmin.from('team_news').select('id, title, body, published_at, is_published, created_at')),
    baseQuery(supabaseAdmin.from('team_results').select('id, game_date, opponent, home_away, our_score, their_score, outcome, notes, created_at')),
    baseQuery(supabaseAdmin.from('team_schedule').select('id, scheduled_at, opponent, kind, venue, home_away, notes, is_cancelled, created_at')),
  ]);

  return NextResponse.json({ news: news.data || [], results: results.data || [], schedule: schedule.data || [] });
}

// POST — create a news item, result, or schedule entry
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug')
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

    const { data, error } = await supabaseAdmin
      .from('team_schedule')
      .insert({
        team_id: team.id,
        author_user_id: userId,
        scheduled_at: scheduledAt,
        opponent: asStr(body.opponent, 120),
        kind,
        venue: asStr(body.venue, 200),
        home_away: homeAway,
        notes: asStr(body.notes, 2000),
        is_cancelled: body.is_cancelled === true,
      })
      .select('id, scheduled_at, opponent, kind, venue')
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
    .select('id, slug')
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

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('team_schedule')
      .update(patch)
      .eq('id', postId)
      .eq('team_id', team.id)
      .select('id, scheduled_at, opponent, kind, venue, home_away, is_cancelled, notes')
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

  const tableMap: Record<string, string> = { news: 'team_news', result: 'team_results', schedule: 'team_schedule' };
  const table = tableMap[postType];

  // Results are immutable — no DELETE
  if (postType === 'result') {
    return NextResponse.json({ error: 'results_are_immutable' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from(table).delete().eq('id', postId).eq('team_id', team.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}