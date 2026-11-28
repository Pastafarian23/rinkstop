import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { canViewFixture, isPublicFixture } from '@/lib/fixture-visibility';

/**
 * Games of private or unlisted teams that the signed-in viewer is allowed to see.
 *
 * /api/scores and the games list only ever return games between two public teams
 * (they are anonymous and publicly cached). This endpoint is the member-only
 * counterpart: it returns ONLY games that involve a non-public team the viewer
 * is an active member of, and only if the viewer is an active member of EVERY
 * non-public team in the game (the same rule as the game page).
 *
 * It depends on the viewer, so it must never be cached by a shared cache.
 */
export const dynamic = 'force-dynamic';

const NO_STORE = {
  'Cache-Control': 'private, no-store, max-age=0',
  Vary: 'Cookie, Authorization',
} as const;

const SELECT =
  'id, scheduled_at, status, home_score, away_score, season, league_id, ' +
  'home_team:team_workspaces!home_team_id(id, name, slug, visibility, logo_url:avatar_url), ' +
  'away_team:team_workspaces!away_team_id(id, name, slug, visibility, logo_url:avatar_url), ' +
  'league:leagues(id, name, slug)';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function GET(request: NextRequest) {
  let userId: string | null | undefined;
  try {
    ({ userId } = await auth());
  } catch {
    userId = null;
  }
  if (!userId) return json({ error: 'unauthorized', data: [] }, 401);

  const sp = request.nextUrl.searchParams;
  const league = (sp.get('league') || 'all').toLowerCase();
  const team = sp.get('team') || '';
  const from = sp.get('from');
  const to = sp.get('to');
  if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) return json({ error: 'bad date', data: [] }, 400);

  try {
    const { data: memberships } = await supabaseAdmin
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .is('left_at', null);
    const memberTeamIds = Array.from(new Set((memberships || []).map((m: { team_id: string }) => m.team_id)));
    if (memberTeamIds.length === 0) return json({ data: [], count: 0 });

    const ids = memberTeamIds.join(',');
    let q = supabaseAdmin
      .from('fixtures')
      .select(SELECT)
      .or('home_team_id.in.(' + ids + '),away_team_id.in.(' + ids + ')')
      .order('scheduled_at', { ascending: true })
      .limit(200);

    if (league !== 'all') {
      const { data: leagueRow } = await supabaseAdmin.from('leagues').select('id').eq('slug', league).maybeSingle();
      if (!leagueRow) return json({ data: [], count: 0 });
      q = q.eq('league_id', leagueRow.id);
    }
    const start = from ? new Date(from + 'T00:00:00.000Z') : new Date(Date.now() - 7 * 86400000);
    q = q.gte('scheduled_at', start.toISOString());
    if (to) {
      const end = new Date(to + 'T00:00:00.000Z');
      end.setUTCDate(end.getUTCDate() + 1);
      q = q.lt('scheduled_at', end.toISOString());
    }

    const { data, error } = await q;
    if (error) return json({ error: 'query failed', data: [] }, 500);

    const rows = ((data || []) as any[])
      // Public games are already served by the public list; only add the private ones.
      .filter((f) => !isPublicFixture(f))
      .filter((f) => canViewFixture(f, memberTeamIds))
      .filter((f) => !team || f.home_team?.slug === team || f.away_team?.slug === team)
      // The viewer's own visibility flag is not needed by the client.
      .map(({ home_team, away_team, ...rest }) => ({
        ...rest,
        home_team: home_team && { id: home_team.id, name: home_team.name, slug: home_team.slug, logo_url: home_team.logo_url },
        away_team: away_team && { id: away_team.id, name: away_team.name, slug: away_team.slug, logo_url: away_team.logo_url },
      }));

    return json({ data: rows, count: rows.length });
  } catch {
    return json({ error: 'failed', data: [] }, 500);
  }
}
