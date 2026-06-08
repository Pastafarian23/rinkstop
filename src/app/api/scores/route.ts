import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { DEFAULT_CHIP, DEFAULT_TIME, DEFAULT_PAGE_SIZE, getChip, getRecentCutoff } from '@/lib/score-chips';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

// Cache league_id lookups per-process (chip → league_id[]) for the lifetime of the lambda.
let leagueIdCache: Record<string, string[]> | null = null;
async function getLeagueIdsForChip(chipSlug: string): Promise<string[]> {
  if (leagueIdCache && leagueIdCache[chipSlug]) return leagueIdCache[chipSlug];
  if (!leagueIdCache) leagueIdCache = {};
  const chip = getChip(chipSlug);
  if (chip.leagueSlugs.length === 0) {
    leagueIdCache[chipSlug] = [];
    return [];
  }
  const { data } = await supabase
    .from('leagues')
    .select('id, slug')
    .in('slug', chip.leagueSlugs);
  leagueIdCache[chipSlug] = (data || []).map(l => l.id);
  return leagueIdCache[chipSlug];
}

// Cache single-league lookups (for subleague within a category chip).
let singleLeagueCache: Record<string, string | null> = {};
async function getLeagueIdBySlug(slug: string): Promise<string | null> {
  if (slug in singleLeagueCache) return singleLeagueCache[slug];
  const { data } = await supabase
    .from('leagues')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  singleLeagueCache[slug] = data?.id ?? null;
  return singleLeagueCache[slug];
}

// Cache team_id lookups (slug → id) for the team filter.
let teamIdCache: Record<string, string | null> = {};
async function getTeamIdBySlug(slug: string): Promise<string | null> {
  if (slug in teamIdCache) return teamIdCache[slug];
  const { data } = await supabase
    .from('teams')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  teamIdCache[slug] = data?.id ?? null;
  return teamIdCache[slug];
}

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const result = checkRateLimit(ip, RATE_LIMIT);
  maybeCleanup();

  if (!result.allowed) {
    const response = new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please slow down.' }),
      { status: 429 }
    );
    applyRateLimitHeaders(response, result);
    response.headers.set('Content-Type', 'application/json');
    return response;
  }

  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league') || DEFAULT_CHIP;
  const team = searchParams.get('team');
  const subleague = searchParams.get('subleague');
  const time = searchParams.get('time') || DEFAULT_TIME;
  const limit = Math.min(parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10), 200);

  const chip = getChip(league);
  const leagueIds = await getLeagueIdsForChip(league);
  const recentCutoffISO = getRecentCutoff().toISOString();

  // Build the fixtures query with joins to teams + leagues for accurate team names.
  // We also exclude fixtures with NULL team_ids — the NHL import was incomplete
  // for ~53% of NHL rows (no home/away team assigned), and they render as the
  // "Home vs Away" placeholder. Hide them until a backfill restores them.
  // Time filter is applied via an OR clause:
  //   current    = status IN (scheduled, in_progress)  OR  (status=completed AND scheduled_at >= recentCutoff)
  //   historical = anything older than recentCutoff AND status != 'in_progress'
  let query = supabase
    .from('fixtures')
    .select(`
      id, scheduled_at, status, home_score, away_score, season, league_id, home_team_id, away_team_id,
      home_team:teams!home_team_id(id, name, slug, logo_url),
      away_team:teams!away_team_id(id, name, slug, logo_url),
      league:leagues(id, name, slug, level, country)
    `)
    .not('home_team_id', 'is', null)
    .not('away_team_id', 'is', null)
    .order('scheduled_at', { ascending: false });

  // League filter
  if (leagueIds.length === 0) {
    const empty = NextResponse.json({ data: [], count: 0, chip: chip.slug, time });
    empty.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return applyRateLimitHeaders(empty, result);
  }
  query = query.in('league_id', leagueIds);

  // Subleague (within a category chip) — narrows to a single league_id
  if (subleague) {
    const subId = await getLeagueIdBySlug(subleague);
    if (subId) query = query.eq('league_id', subId);
  }

  // Team filter (only meaningful for league chips)
  if (team && chip.type === 'league') {
    const teamId = await getTeamIdBySlug(team);
    if (teamId) {
      query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
    }
  }

  // Time filter (status + date)
  // historical = anything older than the recent cutoff EXCEPT in-progress games
  // (old 'scheduled' rows count as historical — some leagues never got status backfilled)
  if (time === 'historical') {
    query = query.neq('status', 'in_progress').lt('scheduled_at', recentCutoffISO);
  } else {
    // current: scheduled/in_progress (any date) OR recently completed
    query = query.or(
      `status.in.(scheduled,in_progress),and(status.eq.completed,scheduled_at.gte.${recentCutoffISO})`
    );
  }

  query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mapped = (data || []).map((g: any) => ({
    id: g.id,
    date: g.scheduled_at,
    status: g.status,
    scheduled_at: g.scheduled_at,
    home_score: g.home_score,
    away_score: g.away_score,
    home_team: g.home_team ? {
      id: g.home_team.id,
      name: g.home_team.name,
      slug: g.home_team.slug,
      logo_url: g.home_team.logo_url || null,
    } : null,
    away_team: g.away_team ? {
      id: g.away_team.id,
      name: g.away_team.name,
      slug: g.away_team.slug,
      logo_url: g.away_team.logo_url || null,
    } : null,
    league: g.league ? { id: g.league.id, name: g.league.name, slug: g.league.slug } : null,
  }));

  const response = NextResponse.json({
    data: mapped,
    count: mapped.length,
    chip: chip.slug,
    time,
    hasMore: mapped.length === limit,
  });
  response.headers.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
  return applyRateLimitHeaders(response, result);
}

