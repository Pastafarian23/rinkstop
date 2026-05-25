import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

  let query = supabase
    .from('players')
    .select('*, teams(name, slug, logo_url, league_id, leagues(name, slug))', { count: 'exact' });

  // Support both UUID lookups and slug lookups (e.g. connor-mcdavid)
  const isUuid = id && /^[0-9a-f-]{36}$/i.test(id);

  if (id) {
    if (isUuid) {
      query = query.eq('id', id).limit(1);
    } else {
      // Treat as name-based slug (e.g. connor-mcdavid) — match slugs that start with clean name
      const cleanSlug = id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      query = query.or(`slug.ilike.${cleanSlug}-%,slug.eq.${cleanSlug}`).limit(1);
    }
  } else {
    if (teamId) query = query.eq('team_id', teamId);
    if (position) query = query.eq('position', position);
    if (country) query = query.eq('nationality', country);
    if (leagueId) query = query.eq('teams.league_id', leagueId);
    if (activeOnly) query = query.eq('is_active', true);
    if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  }

  const { data, error, count } = id
    ? await query.then(d => ({ data: Array.isArray(d.data) ? d.data.slice(0, 1) : d.data ? [d.data] : [], error: d.error, count: d.error ? 0 : 1 }))
    : await query
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })
        .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count, page, totalPages: Math.ceil((count || 0) / limit) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { data, error } = await supabase.from('players').insert(body).select('*, teams(name)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { id, ...rest } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { data, error } = await supabase.from('players').update(rest).eq('id', id).select('*, teams(name)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}