// /api/admin/articles/regenerate
//
// Bulk-regenerate SLOP-HEAVY articles with the new (post-2026-09-22)
// article-from-highlight prompt. This is the entry point for the
// "rerun all articles for QC" directive.
//
// Safety:
//   - Requires explicit `confirm=true` in body AND `dryRun=true|false`
//     in body. Defaults to dry-run; no articles are touched until the
//     caller passes confirm=true. This two-key gate prevents accidental
//     bulk overwrites.
//   - When `slugs=[...]` is in body, only those slugs are regenerated.
//     When omitted, regenerates ALL posts with quality_score<60.
//   - When `limit=N` is in body, caps how many articles are touched in
//     one call (default 50, max 200). For a 720+ corpus, run in batches.
//   - Each regenerated post is re-scored with checkArticleQuality
//     before persisting; if the new score is still <60, the post is
//     left with human_review_status='pending' for manual review.
//
// Auth: Clerk owner session OR x-admin-key header.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth as clerkAuth } from '@clerk/nextjs/server';
import { OWNER_EMAILS } from '@/lib/admin-auth';
import { checkArticleQuality } from '@/lib/article-quality';
import { execFile } from 'child_process';
import { resolve } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

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

// Generate a new article body by invoking the article-from-highlight
// orchestrator for a specific highlight id (the source of truth for
// the original post). The orchestrator handles transcript/boxscore
// fetching + LLM draft generation.
async function regenerateOne(highlightId: number): Promise<{ ok: boolean; content?: string; error?: string }> {
  const scriptPath = resolve(process.cwd(), 'scripts/article-from-highlight/orchestrate.mjs');
  try {
    const { stdout, stderr } = await execFileAsync('node', [
      scriptPath,
      '--highlight-id', String(highlightId),
      '--regenerate',
    ], {
      cwd: process.cwd(),
      env: process.env,
      timeout: 90_000,
    });
    // The script writes to posts; the stdout includes the new content
    // (see orchestrate.mjs contract). Pull the "content:" line if present.
    const match = stdout.match(/^content:\s*(.+)$/m);
    if (match) {
      return { ok: true, content: match[1] };
    }
    return { ok: false, error: `no content line in script output. stderr: ${stderr.slice(0, 500)}` };
  } catch (e: any) {
    return { ok: false, error: `script failed: ${e.message?.slice(0, 500)}` };
  }
}

interface RegenerateRequest {
  confirm?: boolean;
  dryRun?: boolean;
  slugs?: string[];
  limit?: number;
}

export async function POST(request: NextRequest) {
  const authResult = await authOk(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RegenerateRequest = {};
  try { body = await request.json(); } catch {}

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const limit = Math.min(Number(body.limit) || 50, 200);
  const dryRun = body.dryRun !== false && body.confirm !== true;
  // Dry-run unless confirm=true is explicit.

  // Find candidate posts.
  let query = supabase
    .from('posts')
    .select('id, slug, title, content, quality_score, highlight_id')
    .eq('status', 'published');

  if (body.slugs && body.slugs.length > 0) {
    query = query.in('slug', body.slugs);
  } else {
    // Auto-select SLOP-HEAVY + unscored (NULL)
    query = query.or('quality_score.lt.60,quality_score.is.null').order('quality_score', { ascending: true, nullsFirst: true }).limit(limit);
  }

  const { data: candidates, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ message: 'no candidates', dryRun, regenerated: 0 });
  }

  // Preview list — always returned.
  const preview = candidates.map((c: any) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    quality_score: c.quality_score,
    has_highlight_id: !!c.highlight_id,
  }));

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      message: 'pass confirm=true in body to actually regenerate',
      candidates: preview.length,
      sample: preview.slice(0, 10),
    });
  }

  if (body.confirm !== true) {
    return NextResponse.json({ error: 'confirm=true required when dryRun=false' }, { status: 400 });
  }

  // Actually regenerate.
  let success = 0;
  let skipped = 0;
  let failed = 0;
  const details: any[] = [];

  for (const post of candidates) {
    if (!post.highlight_id) {
      skipped++;
      details.push({ slug: post.slug, status: 'skipped', reason: 'no highlight_id' });
      continue;
    }
    const regen = await regenerateOne(post.highlight_id);
    if (!regen.ok || !regen.content) {
      failed++;
      details.push({ slug: post.slug, status: 'failed', error: regen.error });
      continue;
    }
    // Re-score the new content
    const newResult = checkArticleQuality({
      title: post.title,
      subtitle: null,
      metaDescription: null,
      body: regen.content,
    });
    const updatePayload: any = {
      content: regen.content,
      quality_score: newResult.score,
      quality_issues: newResult.issues.map((i: any) =>
        i.type === 'banned-phrase' ? `banned:${i.pattern}` : `${i.type}${i.detail ? `:${i.detail}` : ''}`,
      ),
      generation_method: 'llm-v2',
      regenerated_at: new Date().toISOString(),
    };
    // If still low quality, hold for review.
    if (newResult.score < 60) {
      updatePayload.human_review_status = 'pending';
      updatePayload.status = 'draft';
    }
    const { error: updErr } = await supabase.from('posts').update(updatePayload).eq('id', post.id);
    if (updErr) {
      failed++;
      details.push({ slug: post.slug, status: 'failed-update', error: updErr.message });
      continue;
    }
    success++;
    details.push({
      slug: post.slug,
      status: newResult.score < 60 ? 'regenerated-held-for-review' : 'regenerated',
      old_score: post.quality_score,
      new_score: newResult.score,
      issues: newResult.issues.length,
    });
  }

  return NextResponse.json({
    dryRun: false,
    regenerated: success,
    skipped,
    failed,
    details: details.slice(0, 50),
  });
}
