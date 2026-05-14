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

  return jsonResponse(data);
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

// DELETE - Archive post
export async function DELETE(request: NextRequest, { params }: Props) {
  const admin = await verifyAdmin(request);
  if (!admin) return jsonResponse({ error: 'Unauthorized' }, 401);

  const { slug } = await params;
  const { error } = await supabase.from('posts').delete().eq('slug', slug);

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ success: true });
}

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}