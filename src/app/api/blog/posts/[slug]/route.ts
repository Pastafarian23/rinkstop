// GET /api/blog/posts/[slug] - Get single post (increment views)
// PUT /api/blog/posts/[slug] - Update post (admin)
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function verifyAdmin(request: NextRequest) {
  const apiSecret = request.headers.get('x-api-secret');
  if (!apiSecret) return null;
  return { id: 'admin', role: 'super_admin' };
}

interface Props {
  params: Promise<{ slug: string }>;
}

// GET - Single post by slug
export async function GET(request: NextRequest, { params }: Props) {
  const { slug } = await params;

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) return jsonResponse({ error: error.message }, 500);
  if (!data) return jsonResponse({ error: 'Post not found' }, 404);

  // 2026-06-11: Vercel Hobby limit reduction — blog posts are static-ish, cache 10min
  const response = jsonResponse(data);
  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=600, stale-while-revalidate=7200');
  return response;
}

// PUT - Update post
export async function PUT(request: NextRequest, { params }: Props) {
  const admin = await verifyAdmin(request);
  if (!admin) return jsonResponse({ error: 'Unauthorized' }, 401);

  const { slug } = await params;
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

// DELETE - Archive post (soft delete: status = 'archived')
// Hard delete is intentionally NOT supported through this endpoint.
// Use the new /api/admin/articles/[id] DELETE only for permanent removal.
export async function DELETE(request: NextRequest, { params }: Props) {
  const admin = await verifyAdmin(request);
  if (!admin) return jsonResponse({ error: 'Unauthorized' }, 401);

  const { slug } = await params;

  // Soft delete: set status to archived, preserve the row for the rewrite pipeline.
  // The posts table has no archived_at column — use updated_at as the proxy.
  const { data, error } = await supabaseAdmin
    .from('posts')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('slug', slug)
    .select('id, slug, status')
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);
  if (!data) return jsonResponse({ error: 'Post not found' }, 404);
  return jsonResponse({ success: true, archived: data });
}

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}