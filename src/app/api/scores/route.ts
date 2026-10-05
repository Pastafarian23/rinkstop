/**
 * GET /api/scores
 *
 * Self-contained scores endpoint — only depends on @supabase/supabase-js and
 * the service-role env var. Does NOT import from @/lib/scores or any other
 * module that could fail to load. This is the 2026-10-05 rewrite after the
 * prior /api/* surface started returning HTTP 500 for every route on Vercel.
 *
 * Query params:
 *   league     — league slug or "all" (default: "all")
 *   time       — "current" | "recent" | "historical" (default: "current")
 *   team       — team slug (optional)
 *   from       — YYYY-MM-DD lower bound (optional, overrides time)
 *   to         — YYYY-MM-DD upper bound (optional, overrides time)
 *   limit      — 1-200, default 50
 *   offset     — pagination offset, default 0
 *
 * Response: { data, count, chip, time, hasMore, from, to }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function json(data: unknown, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    },
  });
}

function err(message: string, status = 500) {
  return json({ error: message, data: [], count: 0, hasMore: false }, status);
}

export async function GET(request: NextRequest) {
  const sb = getSupabase();
  if (!sb) return err('Supabase env not configured', 500);

  const sp = request.nextUrl.searchParams;
  const league = (sp.get('league') || 'all').toLowerCase();
  const time = (sp.get('time') || 'current').toLowerCase();
  const team = sp.get('team') || '';
  const fromParam = sp.get('from');
  const toParam = sp.get('to');
  const limit = Math.min(Math.max(parseInt(sp.get('limit') || '50', 10) || 50, 1), 200);
  const offset = Math.max(parseInt(sp.get('offset') || '0', 10) || 0, 0);
  const hasExplicitRange = !!(fromParam || toParam);

  try {
    // Resolve league(s)
    let leagueIds: string[] = [];
    if (league !== 'all') {
      const { data: leagueRow } = await sb
        .from('leagues')
        .select('id')
        .eq('slug', league)
        .maybeSingle();
      if (!leagueRow) {
        return json({ data: [], count: 0, chip: league, time, hasMore: false });
      }
      leagueIds = [leagueRow.id];
    } else {
      // Default top-level leagues for the "all" chip
      const { data: topLeagues } = await sb
        .from('leagues')
        .select('id, slug')
        .in('slug', ['nhl', 'ahl', 'pwhl', 'khl', 'shl', 'liiga', 'del', 'nl', 'extraliga', 'ncaa', 'chl', 'ushl']);
      leagueIds = (topLeagues || []).map((l) => l.id);
    }

    // Build query
    let q = sb
      .from('fixtures')
      .select(
        `id, scheduled_at, status, home_score, away_score, season, league_id,
         home_team:teams!home_team_id(id, name, slug, logo_url),
         away_team:teams!away_team_id(id, name, slug, logo_url),
         league:leagues(id, name, slug)`,
        { count: 'exact' }
      )
      .not('home_team_id', 'is', null)
      .not('away_team_id', 'is', null)
      .order('scheduled_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (leagueIds.length > 0) q = q.in('league_id', leagueIds);

    // Team filter
    if (team) {
      const { data: teamRow } = await sb
        .from('team_workspaces')
        .select('id')
        .eq('slug', team)
        .maybeSingle();
      if (teamRow) q = q.or(`home_team_id.eq.${teamRow.id},away_team_id.eq.${teamRow.id}`);
    }

    // Time filter
    const recentCutoff = new Date(Date.now() - 7 * 86400000).toISOString();
    if (hasExplicitRange) {
      if (fromParam) q = q.gte('scheduled_at', `${fromParam}T00:00:00.000Z`);
      if (toParam) q = q.lte('scheduled_at', `${toParam}T23:59:59.999Z`);
    } else if (time === 'historical') {
      q = q.neq('status', 'in_progress').lt('scheduled_at', recentCutoff);
    } else if (time === 'recent') {
      q = q.eq('status', 'completed').gte('scheduled_at', recentCutoff);
    } else {
      // current = scheduled/in_progress OR recently completed
      q = q.or(`status.in.(scheduled,in_progress),and(status.eq.completed,scheduled_at.gte.${recentCutoff})`);
    }

    const { data, count, error } = await q;
    if (error) {
      console.error('[/api/scores] query error:', error.message);
      return err(`query error: ${error.message}`, 500);
    }

    return json({
      data: data || [],
      count: count || 0,
      chip: league,
      time,
      hasMore: (count || 0) > offset + limit,
      from: fromParam,
      to: toParam,
    });
  } catch (e: any) {
    console.error('[/api/scores] catch:', e?.message || e);
    return err(`internal: ${e?.message || 'unknown'}`, 500);
  }
}
