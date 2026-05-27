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
  const playerId = searchParams.get('playerId');
  const teamId = searchParams.get('teamId');

  let query = supabase.from('player_stats').select('*, players(first_name,last_name,headshot_url)');
  if (playerId) query = query.eq('player_id', playerId);
  if (teamId) {
    const { data: players } = await supabase.from('players').select('id').eq('team_id', teamId);
    if (players?.length) query = query.in('player_id', players.map((p: any) => p.id));
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const { data, error } = await supabaseAdmin.from('player_stats').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, ...rest } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { data, error } = await supabaseAdmin.from('player_stats').update(rest).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { error } = await supabaseAdmin.from('player_stats').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}