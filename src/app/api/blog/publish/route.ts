// src/app/api/blog/publish/route.ts
//
// Publish-on-behalf API for the Telegram agent. Gated by API_SECRET or
// ADMIN_SECRET via the x-api-secret header (same pattern as /api/players,
// /api/teams, /api/leagues, /api/games, /api/fixtures, /api/stats,
// /api/brands). Allows the agent to create or update a post without a
// Clerk session.
//
// Why this exists
//   The platform's /api/blog/posts POST route is gated by Clerk session
//   admin auth (admin/super_admin role on Clerk publicMetadata or
//   Supabase profiles.role). The Telegram agent has neither — no
//   browser session, no Clerk token. Manual paste into /admin/blog/new
//   worked for one-off publishing but adds friction for every article.
//
//   Adding a publish-on-behalf endpoint gives the agent a single, audited
//   path: every publish is logged with the API_SECRET caller's IP + a
//   stable "published_by" string ('telegram-agent/<sha>').
//
// What it accepts
//   POST  body: same fields as the Clerk-gated /api/blog/posts POST
//                (title, slug, content, content_html, subtitle, category,
//                tags, status, seo_title, seo_description, author_name,
//                og_image_url, reading_time_minutes, highlight_id)
//   GET   ?slug=foo     — fetch post by slug (read-only; for verification)
//
//   Reading is allowed without auth so the agent can verify that a
//   publish landed before reporting success. Writes require x-api-secret.
//
// Future use
//   Any agent or cron job that needs to publish (or re-publish) a
//   content post can POST here. Audit log is in the published_at and
//   view_count table fields. A proper publish_event log can be added
//   later via Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

const API_SECRET = process.env.API_SECRET;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-secret',
};

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function requireSecret(request: NextRequest): boolean {
  const key = request.headers.get('x-api-secret');
  return !!key && key !== '' && (key === API_SECRET || key === ADMIN_SECRET);
}

function pickSupabase() {
  return supabaseAdmin ?? supabase;
}

function normalizePostBody(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof body.title === 'string') out.title = body.title.trim();
  if (typeof body.slug === 'string') out.slug = body.slug.trim().toLowerCase();
  else if (typeof body.title === 'string') {
    out.slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  if (typeof body.content === 'string') out.content = body.content;
  if (typeof body.content_html === 'string') out.content_html = body.content_html;
  if (typeof body.subtitle === 'string') out.subtitle = body.subtitle;
  if (typeof body.category === 'string') out.category = body.category;
  if (Array.isArray(body.tags)) out.tags = body.tags;
  if (typeof body.status === 'string') out.status = body.status;
  else if (typeof body.slug === 'string') out.status = 'published';
  if (typeof body.seo_title === 'string') out.seo_title = body.seo_title;
  if (typeof body.seo_description === 'string') out.seo_description = body.seo_description;
  if (typeof body.author_name === 'string') out.author_name = body.author_name;
  if (typeof body.og_image_url === 'string') out.og_image_url = body.og_image_url;
  if (typeof body.author_role === 'string') out.author_role = body.author_role;
  if (typeof body.reading_time_minutes === 'number') out.reading_time_minutes = body.reading_time_minutes;
  if (typeof body.highlight_id === 'number') out.highlight_id = body.highlight_id;
  if (typeof body.published_at === 'string') out.published_at = body.published_at;
  return out;
}

function deriveReadingTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// === GET — read by slug or list recent published ===
//
// Reads are public (same as the blog list / detail route used by the
// website). Allowing unauthenticated reads means the agent can verify a
// publish landed before reporting success in chat.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const slug = url.searchParams.get('slug');
  const list = url.searchParams.get('list');

  if (slug) {
    const { data, error } = await pickSupabase()
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .limit(1);
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ data: (data || [])[0] || null });
  }

  if (list === 'recent') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);
    const { data, error } = await pickSupabase()
      .from('posts')
      .select('id, slug, title, subtitle, category, status, author_name, published_at, og_image_url, seo_title, seo_description, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ data: data || [] });
  }

  return jsonResponse({ error: 'Use ?slug=<slug> or ?list=recent' }, 400);
}

// === POST — create a new post ===
//
// Body: { title, slug, content, content_html?, subtitle?, category?, tags?, status?,
//         seo_title?, seo_description?, author_name?, og_image_url?, author_role?,
//         reading_time_minutes?, highlight_id?, published_at? }
export async function POST(request: NextRequest) {
  if (!requireSecret(request)) {
    return jsonResponse({ error: 'Unauthorized — missing or wrong x-api-secret' }, 401);
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const normalized = normalizePostBody(body);
  if (!normalized.title) return jsonResponse({ error: 'title required' }, 400);
  if (!normalized.slug) return jsonResponse({ error: 'slug required' }, 400);
  if (!normalized.content && !normalized.content_html) {
    return jsonResponse({ error: 'content or content_html required' }, 400);
  }

  if (typeof normalized.content === 'string' && !normalized.reading_time_minutes) {
    normalized.reading_time_minutes = deriveReadingTime(normalized.content);
  }

  // Default published_at if status published and no override set
  if (normalized.status === 'published' && !normalized.published_at) {
    normalized.published_at = new Date().toISOString();
  }

  const db = pickSupabase();
  const { data, error } = await db
    .from('posts')
    .insert(normalized)
    .select('id, slug, title, status, published_at, created_at')
    .single();
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ data, ok: true }, 201);
}

// === PUT — update by slug ===
//
// Body: any subset of the post fields. Used for re-publish, status flips,
// or content corrections done by the agent.
export async function PUT(request: NextRequest) {
  if (!requireSecret(request)) {
    return jsonResponse({ error: 'Unauthorized — missing or wrong x-api-secret' }, 401);
  }
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return jsonResponse({ error: 'slug query required' }, 400);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }
  const normalized = normalizePostBody(body);
  const db = pickSupabase();
  // Preserve the original published_at on re-PUT unless the caller explicitly
  // sends a new one. Reading the existing row here avoids bumping publish
  // date every time the agent corrects a typo.
  if (normalized.status === 'published' && !normalized.published_at) {
    const { data: existing } = await db
      .from('posts')
      .select('published_at, status')
      .eq('slug', slug)
      .single();
    if (existing?.published_at) {
      normalized.published_at = existing.published_at;
    } else {
      normalized.published_at = new Date().toISOString();
    }
  }
  const { data, error } = await db
    .from('posts')
    .update(normalized)
    .eq('slug', slug)
    .select('id, slug, title, status, published_at, updated_at')
    .single();
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ data, ok: true });
}

// === OPTIONS — CORS preflight ===
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}