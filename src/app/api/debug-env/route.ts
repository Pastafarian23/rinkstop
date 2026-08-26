// TEMPORARY DEBUG ENDPOINT — DELETE AFTER FIX VERIFIED
// /api/debug-env — returns the env-var presence state for diagnostic purposes.
// This is publicly accessible. Delete this route once the dashboard issue is resolved.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING',
    supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'MISSING',
    supabase_service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING',
    service_key_length: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
    service_key_prefix: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').slice(0, 10),
    service_key_suffix: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').slice(-10),
    node_env: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV,
    vercel_region: process.env.VERCEL_REGION,
  });
}