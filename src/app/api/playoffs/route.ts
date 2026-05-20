import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/playoffs — list all live updates
export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from('playoff_updates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST /api/playoffs — create a new live update
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { update_type, content, author, game_id } = body;

  if (!update_type || !content) {
    return NextResponse.json({ error: 'update_type and content are required' }, { status: 400 });
  }

  const validTypes = ['update', 'analysis', 'goal', 'period', 'final', 'trade'];
  if (!validTypes.includes(update_type)) {
    return NextResponse.json({ error: `update_type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('playoff_updates')
    .insert({ update_type, content, author: author || 'RinkStop', game_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}