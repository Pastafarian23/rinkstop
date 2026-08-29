import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/feeds?target_type=team|league&target_id=uuid&limit=20
export async function GET(req: NextRequest) {
  const targetType = req.nextUrl.searchParams.get('target_type');
  const targetId = req.nextUrl.searchParams.get('target_id');
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20', 10) || 20, 50);

  if (!targetType || !targetId) {
    return NextResponse.json({ error: 'target_type and target_id required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('profile_posts')
    .select('id, body, media_url, created_at, target_type, target_id, user_id, sport')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
