import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const serviceKeySet = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Test a simple query
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
