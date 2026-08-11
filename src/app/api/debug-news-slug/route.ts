import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || 'post-lottery-nhl-draft-who-goes-after-gavin-mckenna';

  try {
    // Test 1: simple query (like debug)
    const { data: simple, error: simpleError } = await supabaseAdmin
      .from('posts')
      .select('id, slug, title, status, pillar_slug, subpillar_slug')
      .eq('slug', slug)
      .maybeSingle();

    // Test 2: full query (like getFullPostBySlug)
    const { data: full, error: fullError } = await supabaseAdmin
      .from('posts')
      .select(
        'id, slug, title, subtitle, content, content_html, author_name, author_role, published_at, category, tags, reading_time_minutes, seo_title, seo_description, og_image_url, updated_at, view_count, country_slug, state_slug, city_slug, country_label, state_label, city_label',
      )
      .eq('status', 'published')
      .eq('slug', slug)
      .maybeSingle();

    return NextResponse.json({
      slug,
      simple: { data: simple || null, error: simpleError?.message || null },
      full: { data: full ? { ...full, content: full.content?.substring(0, 50) + '...', content_html: '[truncated]' } : null, error: fullError?.message || null },
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
