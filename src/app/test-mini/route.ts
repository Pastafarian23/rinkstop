// Minimal test: can supabaseAdmin query work from a Next.js page component?
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, slug')
    .eq('slug', 'leevi-aaltonen')
    .maybeSingle();

  return NextResponse.json({
    works: !!data,
    error: error?.message ?? null,
    data,
    keyLen: process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0,
  });
}
