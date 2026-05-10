// RinkStop Blog API Routes
// GET  /api/blog/posts         - List published posts (with pagination)
// GET  /api/blog/posts/:slug   - Get single post (increment views)
// POST /api/blog/posts         - Create post (admin)
// PUT  /api/blog/posts/:slug   - Update post (admin)
// DELETE /api/blog/posts/:slug  - Archive post (admin)

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Verify admin auth from request
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);

  // Check admin_secret first (simpler for script-based publishing)
  if (token === process.env.ADMIN_SECRET) {
    return { id: 'admin', email: 'arnel@rinkstop.com', role: 'super_admin' };
  }

  // Check admin_users table
  if (supabaseAdmin) {
    const { data: admin, error } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('id', token)
      .single();
    if (!error) return admin;
  }
  return null;
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

// GET /api/blog/posts - List published posts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const tag = searchParams.get('tag');
  const slug = searchParams.get('slug');
  const limit = parseInt(searchParams.get('limit') || '20');
  const page = parseInt(searchParams.get('page') || '1');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (slug) {
    // Fetch by slug
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) return NextResponse.json({ error: 'Post not found' }, { ...CORS_HEADERS, status: 404 });
    return NextResponse.json(data, { headers: CORS_HEADERS });
  }

  if (status) query = query.eq('status', status);
  else query = query.eq('status', 'published');

  if (category) query = query.eq('category', category);
  if (tag) query = query.contains('tags', [tag]);

  const { data: posts, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { ...CORS_HEADERS, status: 500 });
  }

  // Increment view count if slug parameter present and just fetching one post
  return NextResponse.json({
    posts,
    pagination: {
      total: count,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit)
    }
  }, { headers: CORS_HEADERS });
}

// POST /api/blog/posts - Create post (admin)
export async function POST(request: NextRequest) {
  // Allow unauthenticated creation for pipeline (we validate via admin_secret in headers)
  const body = await request.json();
  const { title, subtitle, content, slug, category, tags, status, seo_title, seo_description, publish_now, api_secret } = body;

  // Validate API secret
  if (api_secret !== process.env.API_SECRET && api_secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized - invalid API secret' }, { ...CORS_HEADERS, status: 401 });
  }

  if (!title || !slug || !content) {
    return NextResponse.json({ error: 'Missing required fields: title, slug, content' }, { ...CORS_HEADERS, status: 401 });
  }

  const postData: any = {
    slug,
    title,
    subtitle: subtitle || '',
    content,
    content_html: content,
    status: publish_now ? 'published' : (status || 'draft'),
    category: category || 'blog',
    tags: tags || [],
    author_name: 'Arnel',
    author_role: 'Founder, RinkStop',
    seo_title: seo_title || title,
    seo_description: seo_description || subtitle || title.substring(0, 160),
  };

  // Calculate reading time
  const wordCount = content.split(/\s+/).length;
  postData.reading_time_minutes = Math.max(1, Math.ceil(wordCount / 200));

  const { data, error } = await supabaseAdmin
    ? supabaseAdmin.from('posts').insert(postData).select().single()
    : supabase.from('posts').insert(postData).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { ...CORS_HEADERS, status: 500 });
  }

  return NextResponse.json(data, { ...CORS_HEADERS, status: 201 });
}

// PUT /api/blog/posts/:slug - Update post
export async function PUT(request: NextRequest) {
  const { slug } = request.nextUrl.pathname.match(/\/api\/blog\/posts\/(.+)/)?.slice(1) || {};
  if (!slug) return NextResponse.json({ error: 'Slug required' }, { ...CORS_HEADERS, status: 400 });

  const body = await request.json();
  const api_secret = body.api_secret;

  if (api_secret !== process.env.API_SECRET && api_secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { ...CORS_HEADERS, status: 401 });
  }

  const { data, error } = await (supabaseAdmin || supabase)
    .from('posts')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { ...CORS_HEADERS, status: 500 });
  }

  return NextResponse.json(data, { headers: CORS_HEADERS });
}