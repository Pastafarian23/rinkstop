import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Test 1: simple lookup
  const test1 = await supabaseAdmin
    .from('players')
    .select('id, first_name')
    .limit(1)
    .maybeSingle();

  // Test 2: playerExists query (same as page)
  const test2 = await supabaseAdmin
    .from('players')
    .select('id')
    .eq(isUuid ? 'id' : 'slug', id)
    .maybeSingle();

  // Test 3: seoPlayer query (same as page)
  const test3 = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, slug')
    .eq(isUuid ? 'id' : 'slug', id)
    .maybeSingle();

  return NextResponse.json({
    id,
    isUuid,
    test1: test1.data ? { id: (test1.data as any).id?.slice(0, 8), first_name: (test1.data as any).first_name } : null,
    test2: test2.data ? { id: (test2.data as any).id } : null,
    test3: test3.data ? { id: (test3.data as any).id?.slice(0, 8), first_name: (test3.data as any).first_name, slug: (test3.data as any).slug } : null,
    error1: test1.error?.message ?? null,
    error2: test2.error?.message ?? null,
    error3: test3.error?.message ?? null,
  });
}
