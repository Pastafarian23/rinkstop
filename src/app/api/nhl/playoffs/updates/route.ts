import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VALID_TYPES = ['update', 'analysis', 'goal', 'period', 'final', 'trade'];

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
    );
    const { data, error } = await supabase
      .from('playoff_updates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    // Normalize content → text for frontend
    return NextResponse.json((data || []).map((r: any) => ({ ...r, text: r.content })));
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch updates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const content = body.text || body.content;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const updateType = VALID_TYPES.includes(body.type) ? body.type : 'update';


    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
    );
    const { data, error } = await supabase
      .from('playoff_updates')
      .insert({
        content: content.trim(),
        update_type: updateType,
        author: body.author || 'RinkStop',
        game_id: body.game_id || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to post update' }, { status: 500 });
  }
}