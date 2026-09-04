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

// Security note (2026-08-26 audit fix #2):
//   - GET uses the anon client (RLS-filtered). Only published posts are readable.
//   - POST/PUT use the admin client (service role) — required because anon can
//     no longer INSERT/UPDATE posts after the 2026-06-16 RLS tightening.
//   - The previous `supabaseAdmin ?? supabase` fallback was a latent bug: if
//     SUPABASE_SERVICE_ROLE_KEY was ever unset, writes would silently fall
//     through to the anon client and fail RLS (status='published' mismatch on
//     insert, no INSERT policy on update). Removed.

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

function requireSecret(request: NextRequest): 'api_secret' | 'admin_secret' | 'none' {
  const key = request.headers.get('x-api-secret');
  if (!key || key === '') return 'none';
  if (key === API_SECRET) return 'api_secret';
  if (key === ADMIN_SECRET) return 'admin_secret';
  return 'none';
}

// OWASP A05 audit 2026-08-26: log every call to /api/blog/publish so we can
// trace content writes back to the caller IP + which secret was used.
async function logPublishEvent(params: {
  action: 'insert' | 'update' | 'reject';
  secretKind: 'api_secret' | 'admin_secret' | 'none';
  request: NextRequest;
  slug?: string;
  postId?: string;
  statusCode: number;
  error?: string;
}): Promise<void> {
  try {
    const fwd = params.request.headers.get('x-forwarded-for') || '';
    const callerIp = fwd.split(',')[0]?.trim()
      || params.request.headers.get('x-real-ip')
      || 'unknown';
    const ua = params.request.headers.get('user-agent') || 'unknown';
    await supabaseAdmin.from('publish_audit_log').insert({
      action: params.action,
      slug: params.slug ?? null,
      post_id: params.postId ?? null,
      secret_kind: params.secretKind,
      caller_ip: callerIp,
      user_agent: ua,
      status_code: params.statusCode,
      error: params.error ?? null,
      metadata: null,
    });
  } catch (e) {
    // Audit log failure must NOT block the publish.
    console.error('[blog/publish] audit log write failed', e);
  }
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
  if (typeof body.disable_autolink === 'boolean') out.disable_autolink = body.disable_autolink;
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
    // GET must use the anon (RLS-filtered) client: anon can read published
    // posts but cannot see drafts. Admin would bypass RLS and leak drafts.
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .limit(1);
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ data: (data || [])[0] || null });
  }

  if (list === 'recent') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);
    const { data, error } = await supabase
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
  const secretKind = requireSecret(request);
  if (secretKind === 'none') {
    await logPublishEvent({
      action: 'reject',
      secretKind: 'none',
      request,
      statusCode: 401,
      error: 'missing or wrong x-api-secret',
    });
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

  // POST writes use the service-role client (RLS-bypassing). Anon can no
  // longer INSERT posts (2026-06-16 critical-rls-fixes). Fail loudly if
  // service role is missing rather than silently 500'ing in RLS.
  if (!supabaseAdmin) {
    console.error('[blog/publish] POST called but supabaseAdmin is null — service role key missing');
    return jsonResponse({ error: 'Server misconfigured: service role key missing' }, 500);
  }
  const db = supabaseAdmin;
  const { data, error } = await db
    .from('posts')
    .insert(normalized)
    .select('id, slug, title, status, published_at, created_at')
    .single();
  if (error) {
    await logPublishEvent({
      action: 'insert',
      secretKind,
      request,
      slug: normalized.slug as string,
      statusCode: 500,
      error: error.message,
    });
    return jsonResponse({ error: error.message }, 500);
  }
  await logPublishEvent({
    action: 'insert',
    secretKind,
    request,
    slug: (data as any)?.slug,
    postId: (data as any)?.id,
    statusCode: 201,
  });
  return jsonResponse({ data, ok: true }, 201);
}

// === PUT — update by slug ===
//
// Body: any subset of the post fields. Used for re-publish, status flips,
// or content corrections done by the agent.
export async function PUT(request: NextRequest) {
  const secretKind = requireSecret(request);
  if (secretKind === 'none') {
    await logPublishEvent({
      action: 'reject',
      secretKind: 'none',
      request,
      statusCode: 401,
      error: 'missing or wrong x-api-secret',
    });
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
  // OWASP follow-up 2026-08-26: ADMIN_SECRET is required to flip a post's
  // status to or from 'published' (republish or unpublish). The agent's
  // API_SECRET is fine for new posts (POST) and content corrections that
  // don't change publish state. This prevents an API_SECRET leak from
  // being able to silently retract or republish articles.
  if (normalized.status && normalized.status !== undefined && secretKind !== 'admin_secret') {
    // Look up current status to see if this is a status flip.
    const dbCheck = supabaseAdmin;
    if (dbCheck) {
      const { data: current } = await dbCheck
        .from('posts')
        .select('status')
        .eq('slug', slug)
        .maybeSingle();
      const currentStatus = current?.status as string | undefined;
      if (
        (currentStatus === 'published' && normalized.status !== 'published') ||
        (currentStatus !== 'published' && normalized.status === 'published')
      ) {
        await logPublishEvent({
          action: 'reject',
          secretKind,
          request,
          slug,
          statusCode: 403,
          error: 'admin_secret_required_for_publish_flip',
          // detail column doesn't exist on publish_audit_log; pass via metadata instead
        });
        return jsonResponse({
          error: 'ADMIN_SECRET required to flip a post to or from published status. Use x-api-secret with ADMIN_SECRET.',
        }, 403);
      }
    }
  }
  // PUT writes use the service-role client — anon UPDATE on posts is denied.
  if (!supabaseAdmin) {
    console.error('[blog/publish] PUT called but supabaseAdmin is null — service role key missing');
    return jsonResponse({ error: 'Server misconfigured: service role key missing' }, 500);
  }
  const db = supabaseAdmin;
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
  if (error) {
    await logPublishEvent({
      action: 'update',
      secretKind,
      request,
      slug,
      statusCode: 500,
      error: error.message,
    });
    return jsonResponse({ error: error.message }, 500);
  }
  await logPublishEvent({
    action: 'update',
    secretKind,
    request,
    slug,
    postId: (data as any)?.id,
    statusCode: 200,
  });
  return jsonResponse({ data, ok: true });
}

// === OPTIONS — CORS preflight ===
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}