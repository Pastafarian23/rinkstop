import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

const API_SECRET = process.env.API_SECRET;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

function requireAuth(request: NextRequest) {
  const key = request.headers.get('x-api-secret');
  return key === API_SECRET || key === ADMIN_SECRET;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');
  const country = searchParams.get('country');
  const search = searchParams.get('search');
  const leagueId = searchParams.get('leagueId');
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
    if (leagueId) query = query.eq('league_id', leagueId);
    if (activeOnly && !search) query = query.eq('is_active', true);
    if (search) query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`);
    query = query.limit(limit);
  }

  const orderCol = sort === 'recent' ? 'created_at' : 'name';
  const { data, error, count } = await query.order(orderCol, { ascending: sort === 'recent' ? false : true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count });
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
