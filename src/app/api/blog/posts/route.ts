// RinkStop Blog API Routes
// GET  /api/blog/posts         - List published posts (with pagination)
// GET  /api/blog/posts/:slug   - Get single post (increment views)
// POST /api/blog/posts         - Create post (admin)
// PUT  /api/blog/posts/:slug   - Update post (admin)
// DELETE /api/blog/posts/:slug  - Archive post (admin)

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase';
import { getAdminFromRequest } from '@/lib/admin-auth';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// Admin auth via Clerk session (same pattern as /api/admin/articles/[id]).
// Returns the admin context, or a 401 Response if not signed in / not admin.
async function verifyAdmin(_request: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;
  return auth.admin;
}

// GET - List posts
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 10;
  const offset = (page - 1) * limit;
  const highlightId = searchParams.get('highlight_id');

  // Single-article lookup by highlight_id (used by the video popup on the
  // home page, player pages, and any other surface that shows highlights).
  // Returns only the published article; if no article exists yet, returns
  // { data: [] } so the client can hide the snippet.
  if (highlightId) {
    const { data, error } = await supabase
      .from('posts')
      .select('id, slug, title, subtitle, category, reading_time_minutes, author_name, published_at, og_image_url, seo_title, seo_description, content, highlight_id, status')
      .eq('highlight_id', parseInt(highlightId, 10))
      .eq('status', 'published')
      .limit(1);
    if (error) return jsonResponse({ error: error.message }, 500);
    const post = (data || [])[0] || null;
    return jsonResponse({
      data: post ? [{
        ...post,
        excerpt: post.subtitle || (post.content ? post.content.replace(/<[^>]*>/g, '').substring(0, 280).trim() + '…' : ''),
      }] : [],
    });
  }

  const { data, error, count } = await supabase
    .from('posts')
    .select('id, slug, title, subtitle, category, reading_time_minutes, author_name, published_at, og_image_url, seo_title, seo_description, content', { count: 'exact' })
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return jsonResponse({ error: error.message }, 500);

  const dataWithExcerpt = (data || []).map(post => ({
    ...post,
    excerpt: post.subtitle || (post.content ? post.content.replace(/<[^>]*>/g, '').substring(0, 160).trim() + '...' : ''),
  }));

  return jsonResponse({
    data: dataWithExcerpt,
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  });
}

// POST - Create post
export async function POST(request: NextRequest) {
  const adminOrResp = await verifyAdmin(request);
  if (adminOrResp instanceof Response) return adminOrResp;
  const admin = adminOrResp;

  const body = await request.json();
  const { title, slug, content, category, tags, status, seo_title, seo_description, subtitle } = body;

  const postData: any = {
    title,
    slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    content,
    category: category || 'blog',
    tags: tags || [],
    status: status || 'draft',
    seo_title: seo_title || title,
    seo_description: seo_description || subtitle || title.substring(0, 160),
  };

  const wordCount = content.split(/\s+/).length;
  postData.reading_time_minutes = Math.max(1, Math.ceil(wordCount / 200));

  const insertQuery = supabaseAdmin
    ? supabaseAdmin.from('posts').insert(postData).select().single()
    : supabase.from('posts').insert(postData).select().single();

  const { data, error } = await insertQuery;

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse(data, 201);
}

// PUT - Update post
export async function PUT(request: NextRequest) {
  const adminOrResp = await verifyAdmin(request);
  if (adminOrResp instanceof Response) return adminOrResp;
  const admin = adminOrResp;

  const slug = request.nextUrl.pathname.replace(/\/api\/blog\/posts\//, '') || '';
  if (!slug) return jsonResponse({ error: 'Slug required' }, 400);

  const body = await request.json();
  const { data, error } = await supabase
    .from('posts')
    .update(body)
    .eq('slug', slug)
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse(data);
}

// DELETE - Archive post
export async function DELETE(request: NextRequest) {
  const adminOrResp = await verifyAdmin(request);
  if (adminOrResp instanceof Response) return adminOrResp;
  const admin = adminOrResp;

  const slug = request.nextUrl.pathname.replace(/\/api\/blog\/posts\//, '') || '';
  if (!slug) return jsonResponse({ error: 'Slug required' }, 400);

  const { error } = await supabase.from('posts').delete().eq('slug', slug);

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ success: true });
}

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}