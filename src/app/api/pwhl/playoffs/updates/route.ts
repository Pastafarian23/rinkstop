import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('pwhl_playoff_updates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json((data || []).map((r: any) => ({ ...r, text: r.content })));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const content = body.text || body.content;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('pwhl_playoff_updates')
      .insert({
        content: content.trim(),
        update_type: body.type || 'update',
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
