import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

const API_SECRET = process.env.API_SECRET;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

function requireAuth(request: NextRequest) {
  const key = request.headers.get('x-api-secret');
  return key === API_SECRET || key === ADMIN_SECRET;
}

// Helpers to format NHL player records to match the RinkStop 'players' shape
// so the existing /directory/players/[id] UI works for both datasets.
function formatNhlPlayer(p: any) {
  const name = p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  const [first, ...rest] = name.split(' ');
  const last = rest.join(' ');
  return {
    id: `nhl-${p.id}`,            // prefix to avoid clashing with UUIDs
    source: 'nhl',
    first_name: first || null,
    last_name: last || null,
    full_name: name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    position: p.position ?? null,
    jersey_number: p.jersey_number ?? null,
    nationality: p.nationality ?? null,
    birth_date: p.birth_date ?? null,
    height_cm: p.height ?? null,
    weight_kg: p.weight ?? null,
    shoots: p.shoots ?? null,
    headshot_url: p.logo ?? null,
    is_active: true,
    team_id: p.current_team_id ? `nhl-team-${p.current_team_id}` : null,
    teams: null, // hydrated below by team_id if needed
    draft: {
      year: p.draft_year ?? null,
      team: p.draft_team ?? null,
      round: p.draft_round ?? null,
      pick: p.draft_pick ?? null,
    },
    role: p.role ?? 'player',
    was_player: p.was_player ?? false,
    highlightly_id: p.id,
    _partial: !(p.birth_date && p.position && p.height), // flag for backfill
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const teamId = searchParams.get('teamId');
  const position = searchParams.get('position');
  const country = searchParams.get('country');
  const leagueId = searchParams.get('leagueId');
  const search = searchParams.get('search');
  const activeOnly = searchParams.get('activeOnly') !== 'false';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '24');
  const offset = (page - 1) * limit;

  const isUuid = id && /^[0-9a-f-]{36}$/i.test(id);
  const isNhlPrefixed = id && id.startsWith('nhl-');
  const isNhlNumeric = id && /^nhl-\d+$/.test(id);

  // ---- Single-player lookup (by UUID, slug, or nhl id) ----
  if (id) {
    // 1) RinkStop UUID lookup
    if (isUuid) {
      const { data, error } = await supabase
        .from('players')
        .select('*, teams(name, slug, logo_url, league_id, leagues(name, slug))')
        .eq('id', id)
        .limit(1)
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (data) return NextResponse.json({ data: [{ ...data, source: 'rinkstop' }], count: 1, page: 1, totalPages: 1 });
    }

    // 2) NHL numeric id (with or without nhl- prefix)
    if (isNhlNumeric || (/^\d+$/.test(id))) {
      const numericId = isNhlNumeric ? id.replace('nhl-', '') : id;
      const { data, error } = await supabase
        .from('nhl_players')
        .select('*')
        .eq('id', Number(numericId))
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (data) {
        const formatted = formatNhlPlayer(data);
        // Hydrate team info if available
        if (data.current_team_id) {
          const { data: team } = await supabase
            .from('nhl_teams')
            .select('id, name, short_name, logo')
            .eq('id', String(data.current_team_id))
            .maybeSingle();
          if (team) {
            formatted.teams = {
              name: team.name,
              logo_url: team.logo,
              league_id: 'NHL',
              leagues: { name: 'NHL', slug: 'nhl' },
            };
          }
        }
        return NextResponse.json({ data: [formatted], count: 1, page: 1, totalPages: 1 });
      }
    }

    // 3) Slug lookup — try RinkStop first, then NHL by full_name
    const cleanSlug = id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const { data: rsData, error: rsErr } = await supabase
      .from('players')
      .select('*, teams(name, slug, logo_url, league_id, leagues(name, slug))')
      .or(`slug.ilike.${cleanSlug}-%,slug.eq.${cleanSlug}`)
      .limit(1)
      .maybeSingle();
    if (rsErr) return NextResponse.json({ error: rsErr.message }, { status: 500 });
    if (rsData) return NextResponse.json({ data: [{ ...rsData, source: 'rinkstop' }], count: 1, page: 1, totalPages: 1 });

    // Try NHL by matching name
    const { data: nhlData, error: nhlErr } = await supabase
      .from('nhl_players')
      .select('*')
      .ilike('full_name', id.replace(/-/g, ' '))
      .limit(1)
      .maybeSingle();
    if (nhlErr) return NextResponse.json({ error: nhlErr.message }, { status: 500 });
    if (nhlData) {
      const formatted = formatNhlPlayer(nhlData);
      return NextResponse.json({ data: [formatted], count: 1, page: 1, totalPages: 1 });
    }

    return NextResponse.json({ data: [], count: 0, page: 1, totalPages: 0 });
  }

  // ---- List query (paginated) ----
  // If leagueId=NHL, query nhl_players; otherwise query players.
  const isNhlList = leagueId === 'NHL';

  if (isNhlList) {
    let q = supabase
      .from('nhl_players')
      .select('*', { count: 'exact' });
    if (teamId) q = q.eq('current_team_id', teamId.replace(/^nhl-team-/, ''));
    if (position) q = q.ilike('position', `%${position}%`);
    if (search) q = q.ilike('full_name', `%${search.replace(/-/g, ' ')}%`);
    q = q.order('full_name', { ascending: true })
      .range(offset, offset + limit - 1);
    const { data, error, count } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      data: (data || []).map(formatNhlPlayer),
      count: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
      source: 'nhl',
    });
  }

  // Default: RinkStop players table
  let query = supabase
    .from('players')
    .select('*, teams(name, slug, logo_url, league_id, leagues(name, slug))', { count: 'exact' });

  if (teamId) query = query.eq('team_id', teamId);
  if (position) query = query.eq('position', position);
  if (country) query = query.eq('nationality', country);
  if (leagueId) query = query.eq('teams.league_id', leagueId);
  if (activeOnly) query = query.eq('is_active', true);
  if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);

  const { data, error, count } = await query
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count, page, totalPages: Math.ceil((count || 0) / limit), source: 'rinkstop' });
}

export async function POST(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const { data, error } = await supabaseAdmin.from('players').insert(body).select('*, teams(name)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, ...rest } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { data, error } = await supabaseAdmin.from('players').update(rest).eq('id', id).select('*, teams(name)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { error } = await supabaseAdmin.from('players').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}