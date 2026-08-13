import { NextResponse } from 'next/server';

export async function GET() {
  const val = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return NextResponse.json({
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    isSet: !!val,
    length: val.length,
    prefix: val.substring(0, 20),
    suffix: val.substring(val.length - 10),
    env: process.env.VERCEL_ENV,
  });
}