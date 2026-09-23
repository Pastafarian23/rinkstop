// /api/admin/articles/[id]/review
//
// Single endpoint for both approve and reject. Action via `action` query param.
//
//   POST /api/admin/articles/<uuid>/review?action=approve
//     → flips human_review_status='approved', status='published',
//       records reviewed_at + reviewed_by
//
//   POST /api/admin/articles/<uuid>/review?action=reject
//     body: { note: string (required) }
//     → flips human_review_status='rejected', status='rejected',
//       records reviewed_at + reviewed_by + review_note
//
//   GET /api/admin/articles/<uuid>/review
//     → returns article metadata for the review UI (title, body preview,
//       audit_status, last_audit_check_at, etc.)
//
// Auth: Clerk owner session OR x-admin-key header matching ADMIN_API_KEY.
//       Mirrors the dual-auth pattern in /api/admin/publish-stats.
//
// Per Arnel 2026-09-22 19:00 CDT (Open Protocol Gap 3):
//   - Articles should publish automatically when audit passes
//   - Human review only kicks in for unverifiable / failed-audit content
//   - Reject is a separate status from draft (rejected ≠ in-progress)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth as clerkAuth } from '@clerk/nextjs/server';
import { OWNER_EMAILS } from '@/lib/admin-auth';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };
const ADMIN_KEY = process.env.ADMIN_API_KEY;

async function authOk(request: NextRequest): Promise<{ ok: true; who: string } | { ok: false }> {
  if (ADMIN_KEY) {
    const headerKey = request.headers.get('x-admin-key');
    if (headerKey && headerKey === ADMIN_KEY) return { ok: true, who: 'api-key' };
    const url = new URL(request.url);
    const queryKey = url.searchParams.get('key');
    if (queryKey && queryKey === ADMIN_KEY) return { ok: true, who: 'api-key' };
  }
  const session = await clerkAuth();
  if (session.userId) {
    const userEmail = session.sessionClaims?.email as string | undefined;
    if (userEmail && OWNER_EMAILS.has(userEmail)) {
      return { ok: true, who: `clerk:${userEmail}` };
    }
  }
  return { ok: false };
}

interface ReviewResponse {
  ok: boolean;
  post?: {
    id: string;
    slug: string;
    title: string;
    status: string;
    human_review_status: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
    review_note: string | null;
  };
  error?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const ip = getClientIP(request);
  const rateResult = await checkRateLimit(`admin-article-review:${ip}`, RATE_LIMIT);
  maybeCleanup();

  const authResult = await authOk(request);
  if (!authResult.ok) {
    const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return applyRateLimitHeaders(response, rateResult);
  }

  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (action !== 'approve' && action !== 'reject') {
    const response = NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
    return applyRateLimitHeaders(response, rateResult);
  }

  // Reject requires a note
  let note: string | null = null;
  if (action === 'reject') {
    try {
      const body = await request.json();
      note = String(body?.note || '').trim();
    } catch {}
    if (!note) {
      const response = NextResponse.json({ error: 'reject requires non-empty note in request body' }, { status: 400 });
      return applyRateLimitHeaders(response, rateResult);
    }
    if (note.length > 1000) {
      const response = NextResponse.json({ error: 'note too long (max 1000 chars)' }, { status: 400 });
      return applyRateLimitHeaders(response, rateResult);
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const postId = params.id;
  const reviewerLabel = authResult.who;

  // Build the update payload
  const now = new Date().toISOString();
  const update: Record<string, any> = {
    human_review_status: action === 'approve' ? 'approved' : 'rejected',
    reviewed_at: now,
    reviewed_by: reviewerLabel,
    review_note: note,
    // Approve → published. Reject → rejected.
    // We do NOT touch 'draft' status here. A draft article that gets
    // approved should flip to published; a draft that gets rejected
    // should flip to rejected (per Arnel 20:23: rejected is a new
    // status, different from draft).
    status: action === 'approve' ? 'published' : 'rejected',
    // Approve also sets published_at if the post never had one.
    ...(action === 'approve' ? { published_at: now } : {}),
  };

  const { data: updated, error } = await supabase
    .from('posts')
    .update(update)
    .eq('id', postId)
    .select('id, slug, title, status, human_review_status, reviewed_at, reviewed_by, review_note')
    .maybeSingle();

  if (error) {
    const response = NextResponse.json({ ok: false, error: error.message } satisfies ReviewResponse, { status: 500 });
    return applyRateLimitHeaders(response, rateResult);
  }
  if (!updated) {
    const response = NextResponse.json({ ok: false, error: 'post not found' } satisfies ReviewResponse, { status: 404 });
    return applyRateLimitHeaders(response, rateResult);
  }

  const response = NextResponse.json({ ok: true, post: updated } satisfies ReviewResponse);
  applyRateLimitHeaders(response, rateResult);
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await authOk(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: post, error } = await supabase
    .from('posts')
    .select('id, slug, title, subtitle, content, status, human_review_status, reviewed_at, reviewed_by, review_note, audit_status, last_audit_check_at, last_audit_status, created_at, updated_at, published_at')
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!post) {
    return NextResponse.json({ error: 'post not found' }, { status: 404 });
  }

  return NextResponse.json({ post });
}
