import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

/**
 * /api/followed-teams-games
 *
 * 2026-10-14 (Phase 5): used by the home 'Your teams' strip. The
 * client passes a comma-separated list of team slugs in the URL
 * (?slugs=...) — we look up their team_ids, then return the latest
 * completed + next scheduled game for each team. Response shape:
 *
 *   { teams: Array<{
 *       team: { id, name, slug, avatar_url },  // 2026-11-06: was logo_url
 *       //   (legacy `teams` column); the canonical table calls it avatar_url.
 *       lastGame: { id, scheduled_at, opponent, score, status } | null,
 *       nextGame: { id, scheduled_at, opponent, status } | null,
 *     }> }
 */
export async function GET(req: NextRequest) {
  const slugsParam = req.nextUrl.searchParams.get('slugs') || '';
  const slugs = slugsParam.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 30);
  if (slugs.length === 0) return NextResponse.json({ teams: [] });

  const sb = supabaseAdmin;

  // PRIVACY: this endpoint is anonymous and uses a privileged client. A team (or an
  // opponent) that is private or unlisted is shown only to a signed-in viewer who is
  // an active member of that team. Everyone else gets nothing for it, exactly as if
  // it did not exist.
  let memberTeamIds = new Set<string>();
  try {
    const { userId } = await auth();
    if (userId) {
      const { data: mem } = await sb.from('team_members').select('team_id').eq('user_id', userId).is('left_at', null);
      memberTeamIds = new Set((mem || []).map((m: { team_id: string }) => m.team_id));
    }
  } catch {
    memberTeamIds = new Set<string>();
  }
  const canSee = (t: { id: string; visibility?: string | null } | null | undefined): boolean =>
    !!t && (t.visibility === 'public' || memberTeamIds.has(t.id));
  let includesNonPublic = false;
  // 2026-11-06: the LEGACY `teams` table -> the canonical
  // `team_workspaces`. A followed team that exists only in
  // team_workspaces (every club a federation creates) was invisible here.
  const { data: teams, error: tErr } = await sb
    .from('team_workspaces')
    .select('id, name, slug, avatar_url, visibility')
    .in('slug', slugs);
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  const visibleTeams = (teams || []).filter((t: any) => canSee(t));
  if (visibleTeams.length === 0) return NextResponse.json({ teams: [] });

  const teamIds = visibleTeams.map((t: any) => t.id);
  // Last completed per team
  const { data: lastGames } = await sb
    .from('fixtures')
    .select('id, scheduled_at, status, home_score, away_score, home_team_id, away_team_id')
    .in('home_team_id', teamIds.length > 0 ? teamIds : ['00000000-0000-0000-0000-000000000000'])
    .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
    .eq('status', 'completed')
    .order('scheduled_at', { ascending: false })
    .limit(teamIds.length * 3);
  // Next scheduled per team
  const { data: nextGames } = await sb
    .from('fixtures')
    .select('id, scheduled_at, status, home_score, away_score, home_team_id, away_team_id')
    .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
    .in('status', ['scheduled', 'in_progress'])
    .gt('scheduled_at', new Date(Date.now() - 4 * 3600 * 1000).toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(teamIds.length * 3);

  const lastByTeam = new Map<string, any>();
  for (const g of lastGames || []) {
    const tId = g.home_team_id;
    const awayId = g.away_team_id;
    // The .or() above returns rows where the team is home OR away. The
    // first row per team is the most recent because of the order.
    if (!lastByTeam.has(tId)) {
      const isHome = tId === g.home_team_id;
      lastByTeam.set(tId, {
        id: g.id,
        scheduled_at: g.scheduled_at,
        opponent_id: isHome ? awayId : tId,
        opponent_is_home: !isHome,
        home_score: g.home_score,
        away_score: g.away_score,
        status: g.status,
      });
    }
  }
  // Note: the map keyed by home_team_id is wrong for away teams. Let me
  // re-derive by checking both columns.
  lastByTeam.clear();
  for (const g of lastGames || []) {
    for (const tId of [g.home_team_id, g.away_team_id]) {
      if (!lastByTeam.has(tId)) {
        const isHome = tId === g.home_team_id;
        lastByTeam.set(tId, {
          id: g.id,
          scheduled_at: g.scheduled_at,
          opponent_id: isHome ? g.away_team_id : g.home_team_id,
          opponent_is_home: !isHome,
          home_score: g.home_score,
          away_score: g.away_score,
          status: g.status,
        });
      }
    }
  }
  const nextByTeam = new Map<string, any>();
  for (const g of nextGames || []) {
    for (const tId of [g.home_team_id, g.away_team_id]) {
      if (!nextByTeam.has(tId)) {
        const isHome = tId === g.home_team_id;
        nextByTeam.set(tId, {
          id: g.id,
          scheduled_at: g.scheduled_at,
          opponent_id: isHome ? g.away_team_id : g.home_team_id,
          opponent_is_home: !isHome,
          status: g.status,
        });
      }
    }
  }

  // Resolve opponent names in one query
  const opponentIds = new Set<string>();
  for (const v of lastByTeam.values()) opponentIds.add(v.opponent_id);
  for (const v of nextByTeam.values()) opponentIds.add(v.opponent_id);
  const { data: opps }: { data: any[] | null } = opponentIds.size > 0
    ? await sb.from('team_workspaces').select('id, name, slug, visibility').in('id', Array.from(opponentIds))
    : { data: [] };
  // Only opponents the viewer may see are resolvable; a game against any other
  // opponent is dropped below (its link would be a 404 anyway).
  const oppMap = new Map((opps || []).filter((o: any) => canSee(o)).map((o: any) => [o.id, o]));
  const oppOk = (id: string | undefined) => !id || oppMap.has(id);

  const result = visibleTeams.map((t: any) => {
    const last0 = lastByTeam.get(t.id);
    const next0 = nextByTeam.get(t.id);
    const last = last0 && oppOk(last0.opponent_id) ? last0 : undefined;
    const next = next0 && oppOk(next0.opponent_id) ? next0 : undefined;
    if (t.visibility !== 'public') includesNonPublic = true;
    if (last && oppMap.get(last.opponent_id)?.visibility !== 'public') includesNonPublic = true;
    if (next && oppMap.get(next.opponent_id)?.visibility !== 'public') includesNonPublic = true;
    const { visibility: _v, ...team } = t;
    return {
      team,
      lastGame: last ? {
        id: last.id,
        scheduled_at: last.scheduled_at,
        opponent: oppMap.get(last.opponent_id) ? (({ visibility: _o, ...o }) => o)(oppMap.get(last.opponent_id)) : null,
        opponent_is_home: last.opponent_is_home,
        home_score: last.home_score,
        away_score: last.away_score,
        status: last.status,
      } : null,
      nextGame: next ? {
        id: next.id,
        scheduled_at: next.scheduled_at,
        opponent: oppMap.get(next.opponent_id) ? (({ visibility: _o, ...o }) => o)(oppMap.get(next.opponent_id)) : null,
        opponent_is_home: next.opponent_is_home,
        status: next.status,
      } : null,
    };
  });

  // A body that depends on the viewer's membership must never sit in a shared cache.
  return NextResponse.json(
    { teams: result },
    includesNonPublic ? { headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' } } : undefined,
  );
}
