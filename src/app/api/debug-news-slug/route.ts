import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || 'post-lottery-nhl-draft-who-goes-after-gavin-mckenna';

  try {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select('id, slug, title, status, pillar_slug, subpillar_slug')
      .eq('slug', slug)
      .maybeSingle();

    return NextResponse.json({
      slug,
      data: data || null,
      error: error ? { message: error.message, details: error.details, hint: error.hint, code: error.code } : null,
      env: {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({
      slug,
      error: 'exception',
      message: e.message,
      env: {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    });
  }
}
