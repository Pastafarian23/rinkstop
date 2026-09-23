// /api/admin/articles/quality-check
//
// Per-article + bulk quality scoring. Mirrors the dual-auth pattern
// from /api/admin/articles/[id]/review.
//
//   POST /api/admin/articles/quality-check  body: { slug?: string }
//     When slug is set, scores that one article. Returns { result, post }.
//     When slug is omitted, scans the most recent 200 published articles
//     and returns a band-by-band summary.
//
//   POST /api/admin/articles/quality-check?action=audit-all
//     Walks ALL published articles in pages of 200, scoring each one,
//     and persists quality_score + quality_issues to posts. Returns
//     progress + summary. Use this to refresh the quality index for
//     the existing article corpus.
//
//   GET /api/admin/articles/quality-check
//     Returns the same summary as the omit-slug POST.
//
// Per Arnel 2026-09-22 21:37 CDT: must rerun all articles for QC.
// The audit-all action is the entry point for that rerun.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth as clerkAuth } from '@clerk/nextjs/server';
import { OWNER_EMAILS } from '@/lib/admin-auth';
import { checkArticleQuality, summarizeIssues, type QualityResult } from '@/lib/article-quality';

const RATE_LIMIT = { maxRequests: 30, windowMs: 60 * 1000 };
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

interface Props {
  params: Promise<Record<string, string>>;
}

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

async function scoreAndPersist(supabase: any, post: any): Promise<QualityResult> {
  const result = checkArticleQuality({
    title: post.title,
    subtitle: post.subtitle,
    metaDescription: post.seo_description,
    body: post.content,
  });
  await supabase
    .from('posts')
    .update({
      quality_score: result.score,
      quality_issues: result.issues.map((i: any) =>
        i.type === 'banned-phrase' ? `banned:${i.pattern}` : `${i.type}${i.detail ? `:${i.detail}` : ''}`,
      ),
      regenerated_at: new Date().toISOString(),
    })
    .eq('id', post.id);
  return result;
}

interface BandSummary {
  good: number;
  slopLight: number;
  slopHeavy: number;
  total: number;
  averageScore: number;
}

function newBandSummary(): BandSummary {
  return { good: 0, slopLight: 0, slopHeavy: 0, total: 0, averageScore: 0 };
}

function applyToSummary(summary: BandSummary, result: QualityResult) {
  summary.total++;
  if (result.band === 'good') summary.good++;
  else if (result.band === 'slop-light') summary.slopLight++;
  else summary.slopHeavy++;
  summary.averageScore += result.score;
}

async function auditAll(supabase: any): Promise<{ summary: BandSummary; sample: any[] }> {
  const PAGE = 200;
  const summary = newBandSummary();
  const sample: any[] = [];

  let from = 0;
  while (true) {
    const to = from + PAGE - 1;
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, slug, title, content, subtitle, seo_description, quality_score, status')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    if (!posts || posts.length === 0) break;
    for (const post of posts) {
      const result = await scoreAndPersist(supabase, post);
      applyToSummary(summary, result);
      if (sample.length < 20 && (result.band === 'slop-heavy' || result.band === 'slop-light')) {
        sample.push({
          id: post.id,
          slug: post.slug,
          title: post.title,
          score: result.score,
          band: result.band,
          issues: result.issues.map((i) => `${i.type}${i.detail ? ': ' + i.detail : ''}`).slice(0, 5),
        });
      }
    }
    if (posts.length < PAGE) break;
    from += PAGE;
  }

  if (summary.total > 0) summary.averageScore = Math.round(summary.averageScore / summary.total);

  // Sort sample: slop-heavy first, then by score ascending.
  sample.sort((a, b) => {
    if (a.band !== b.band) return a.band === 'slop-heavy' ? -1 : 1;
    return a.score - b.score;
  });

  return { summary, sample: sample.slice(0, 20) };
}

export async function GET(request: NextRequest) {
  const authResult = await authOk(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: recent } = await supabase
    .from('posts')
    .select('quality_score')
    .eq('status', 'published')
    .not('quality_score', 'is', null)
    .limit(500);

  const summary = newBandSummary();
  if (recent) {
    for (const r of recent) {
      const score = r.quality_score;
      if (score == null) continue;
      summary.total++;
      summary.averageScore += score;
      if (score >= 80) summary.good++;
      else if (score >= 60) summary.slopLight++;
      else summary.slopHeavy++;
    }
    if (summary.total > 0) summary.averageScore = Math.round(summary.averageScore / summary.total);
  }

  return NextResponse.json({ summary, sampled: recent?.length || 0 });
}

export async function POST(request: NextRequest) {
  const authResult = await authOk(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  if (action === 'audit-all') {
    const result = await auditAll(supabase);
    return NextResponse.json(result);
  }

  let body: any = {};
  try { body = await request.json(); } catch {}
  const slug = body.slug || url.searchParams.get('slug');

  if (slug) {
    const { data: post, error } = await supabase
      .from('posts')
      .select('id, slug, title, content, subtitle, seo_description, quality_score, status')
      .eq('slug', slug)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!post) return NextResponse.json({ error: 'post not found' }, { status: 404 });

    const result = await scoreAndPersist(supabase, post);
    return NextResponse.json({
      result,
      summary: summarizeIssues(result.issues),
      post: { id: post.id, slug: post.slug, title: post.title, quality_score: post.quality_score },
    });
  }

  return NextResponse.json({ error: 'provide slug in body OR ?action=audit-all' }, { status: 400 });
}
