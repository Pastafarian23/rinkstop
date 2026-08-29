import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    // Test simple query
    const serviceKeySet = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name')
      .limit(1)
      .maybeSingle();
    return NextResponse.json({
      serviceKeySet,
      queryResult: data ? { id: (data as any).id?.slice(0, 8), first_name: (data as any).first_name } : null,
      error: error?.message ?? null,
    });
  }

  // Test with specific player id/slug
  const isUuid = /^[0-9a-f-]{36}$/i.test(id);
  const { data, error } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, slug')
    .eq(isUuid ? 'id' : 'slug', id)
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    id,
    isUuid,
    found: !!data,
    player: data ? { id: (data as any).id?.slice(0, 8), first_name: (data as any).first_name, slug: (data as any).slug } : null,
    error: error?.message ?? null,
  });
}
