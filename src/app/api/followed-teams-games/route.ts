import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
 *       team: { id, name, slug, logo_url },
 *       lastGame: { id, scheduled_at, opponent, score, status } | null,
 *       nextGame: { id, scheduled_at, opponent, status } | null,
 *     }> }
 */
export async function GET(req: NextRequest) {
  const slugsParam = req.nextUrl.searchParams.get('slugs') || '';
  const slugs = slugsParam.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 30);
  if (slugs.length === 0) return NextResponse.json({ teams: [] });

  const sb = supabaseAdmin;
  const { data: teams, error: tErr } = await sb
    .from('teams')
    .select('id, name, slug, logo_url')
    .in('slug', slugs);
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!teams || teams.length === 0) return NextResponse.json({ teams: [] });

  const teamIds = teams.map((t) => t.id);
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
    ? await sb.from('teams').select('id, name, slug').in('id', Array.from(opponentIds))
    : { data: [] };
  const oppMap = new Map((opps || []).map((o: any) => [o.id, o]));

  const result = teams.map((t: any) => {
    const last = lastByTeam.get(t.id);
    const next = nextByTeam.get(t.id);
    return {
      team: t,
      lastGame: last ? {
        id: last.id,
        scheduled_at: last.scheduled_at,
        opponent: oppMap.get(last.opponent_id) || null,
        opponent_is_home: last.opponent_is_home,
        home_score: last.home_score,
        away_score: last.away_score,
        status: last.status,
      } : null,
      nextGame: next ? {
        id: next.id,
        scheduled_at: next.scheduled_at,
        opponent: oppMap.get(next.opponent_id) || null,
        opponent_is_home: next.opponent_is_home,
        status: next.status,
      } : null,
    };
  });

  return NextResponse.json({ teams: result });
}
