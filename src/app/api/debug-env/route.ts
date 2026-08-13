import { NextResponse } from 'next/server';

export async function GET() {
  const val = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  // Try to create the supabase client to see if it throws
  let importError: string | null = null;
  try {
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      importError = 'supabaseAdmin is null/undefined';
    }
  } catch (e: any) {
    importError = `Import error: ${e?.message}`;
  }
  return NextResponse.json({
    supabaseKey: {
      isSet: !!val,
      length: val.length,
      prefix: val.substring(0, 20),
    },
    supabaseUrl: { isSet: !!url, prefix: url.substring(0, 30) },
    importError,
    env: process.env.VERCEL_ENV,
    runtime: process.env.NEXT_RUNTIME || 'nodejs',
  });
}