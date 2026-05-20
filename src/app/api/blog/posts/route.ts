// RinkStop Blog API Routes
// GET  /api/blog/posts         - List published posts (with pagination)
// GET  /api/blog/posts/:slug   - Get single post (increment views)
// POST /api/blog/posts         - Create post (admin)
// PUT  /api/blog/posts/:slug   - Update post (admin)
// DELETE /api/blog/posts/:slug  - Archive post (admin)

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase';

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

// Verify admin auth from request
async function verifyAdmin(request: NextRequest) {
  const apiSecret = request.headers.get('x-api-secret');
  if (!apiSecret) return null;
  return { id: 'admin', role: 'super_admin' };
}

// GET - List posts
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 10;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({
    data,
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  });
}

// POST - Create post
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return jsonResponse({ error: 'Unauthorized' }, 401);

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
  const admin = await verifyAdmin(request);
  if (!admin) return jsonResponse({ error: 'Unauthorized' }, 401);

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
  const admin = await verifyAdmin(request);
  if (!admin) return jsonResponse({ error: 'Unauthorized' }, 401);

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