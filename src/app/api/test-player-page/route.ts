import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const id = 'leevi-aaltonen';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const result = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, slug')
    .eq(isUuid ? 'id' : 'slug', id)
    .maybeSingle();

  return NextResponse.json({
    id,
    isUuid,
    found: !!result.data,
    data: result.data,
    error: result.error?.message ?? null,
    supabaseUrlSet: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
