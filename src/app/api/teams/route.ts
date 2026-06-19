import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { enrichEntitiesWithClaimTier, compareByTier } from '@/lib/listingTier';
import { LEAGUE_LEVELS, LEVEL_ORDER, type Level } from '@/lib/league-levels';

const API_SECRET = process.env.API_SECRET;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

function requireAuth(request: NextRequest) {
  const key = request.headers.get('x-api-secret');
  return key === API_SECRET || key === ADMIN_SECRET;
}

/**
 * Resolve ?level= to a list of league_ids for an efficient DB filter.
 * Returns null if no level filter is set (caller skips the in-clause).
 */
async function leagueIdsForLevel(level: string): Promise<string[] | null> {
  if (!LEVEL_ORDER.includes(level as Level)) return null;
  const { data: leagues, error } = await supabase
    .from('leagues')
    .select('id, name');
  if (error || !leagues) return null;
  return leagues
    .filter((l: any) => LEAGUE_LEVELS[l.name] === level)
    .map((l: any) => l.id);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');
  const country = searchParams.get('country');
  const search = searchParams.get('search');
  const leagueId = searchParams.get('leagueId');
  const league = searchParams.get('league');     // league NAME filter (case-insensitive)
  const level = searchParams.get('level');        // pro | junior | college | international | adult
  const rinkId = searchParams.get('rinkId');
  const city = searchParams.get('city');
  const sort = searchParams.get('sort') || 'name';
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const activeOnly = searchParams.get('activeOnly') !== 'false';

  let query = supabase.from('teams').select('*, leagues(name)');

  if (id) {
    query = query.eq('id', id).limit(1);
  } else if (slug) {
    query = query.eq('slug', slug).limit(1);
  } else {
    if (rinkId) query = query.eq('home_rink_id', rinkId);
    if (city) query = query.ilike('city', `%${city}%`);
    if (country) query = query.eq('country', country);
    if (leagueId) {
      query = query.eq('league_id', leagueId);
    } else if (league) {
      // Filter by league name via the joined table.
      // Two-step because PostgREST doesn't support ilike-on-relation directly here.
      // Fetch the matching league id(s) first.
      const { data: matchedLeagues } = await supabase
        .from('leagues')
        .select('id')
        .ilike('name', `%${league}%`);
      if (matchedLeagues && matchedLeagues.length > 0) {
        query = query.in('league_id', matchedLeagues.map((m: any) => m.id));
      } else {
        // No league matches the search → return empty set.
        return NextResponse.json({ data: [], count: 0 });
      }
    } else if (level) {
      const ids = await leagueIdsForLevel(level);
      if (ids === null) {
        // Bad level value → ignore (don't filter)
      } else if (ids.length === 0) {
        return NextResponse.json({ data: [], count: 0 });
      } else {
        query = query.in('league_id', ids);
      }
    }
    if (activeOnly && !search) query = query.eq('is_active', true);
    if (search) query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`);
    query = query.limit(limit);
  }

  const orderCol = sort === 'recent' ? 'created_at' : 'name';
  const { data, error, count } = await query.order(orderCol, { ascending: sort === 'recent' ? false : true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich list responses with the active claimer's tier so the directory can sort
  // claimed listings (Pro/Verified) to the top.
  let enrichedData = data;
  if (!id && !slug && data && data.length) {
    const tierMap = await enrichEntitiesWithClaimTier(supabaseAdmin, 'team', data.map((d: any) => d.id));
    enrichedData = data.map((d: any) => {
      const claim = tierMap.get(d.id);
      return {
        ...d,
        claimed_by_tier: claim?.tier || null,
        claimed_by_user_id: claim?.user_id || null,
      };
    });
    if (sort === 'tier') {
      enrichedData.sort(compareByTier);
    }
  }

  return NextResponse.json({ data: enrichedData, count });
}

export async function POST(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const { data, error } = await supabaseAdmin.from('teams').insert(body).select('*, leagues(name)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, ...rest } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { data, error } = await supabaseAdmin.from('teams').update(rest).eq('id', id).select('*, leagues(name)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { error } = await supabaseAdmin.from('teams').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
