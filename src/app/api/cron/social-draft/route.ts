// /api/cron/social-draft
//
// Vercel cron every 30 minutes. Finds posts published in the last
// 5 minutes that don't yet have a social_drafts row. For each one:
//   1. Fetches the parent highlight (for image + score)
//   2. Builds a 3-block FB + X + LinkedIn package (no LLM call — pure
//      deterministic templates from src/lib/social-package.ts)
//   3. Sends the package to RinkStop Ops Telegram with the highlight
//      image attached + inline ✅/❌/✏ buttons
//   4. Inserts a social_drafts row so we don't re-process the same post
//
// Arnel's directive (2026-09-23 03:51 CDT): post EVERY published game,
// no cap. No platform-API integration (manually copy/paste after ✅).
//
// Auth: Vercel sends `Authorization: Bearer ${CRON_SECRET}`. Internal
// triggers (x-internal-self-heal) bypass auth for the OpenClaw keep-warm.
//
// Per Arnel 2026-09-23 03:23 CDT: no IG post (Arnel handles IG manually).
// Per TOOLS.md rule 19: Telegram delivery is the only output channel.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  buildSocialPackage,
  formatSocialPackageForTelegram,
} from '@/lib/social-package';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes — Vercel hobby limit

// Maximum number of articles to process in one cron run. Per Arnel
// 2026-09-23 "no cap" — but we still cap per-run to avoid Vercel
// timeouts during scoring storms. Set high enough (20) that it
// never actually restricts a real workload.
const MAX_RUN = 20;

// Telegram send options
const TELEGRAM_MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

interface IncomingPost {
  id: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  excerpt: string | null;
  slug: string;
  published_at: string;
  category: string | null;
  og_image_url: string | null;
  highlight_id: number | null;
  team_home_id: number | null;
  team_away_id: number | null;
  league_id: number | null;
  seo_description: string | null;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const selfHeal = request.headers.get('x-internal-self-heal') === '1';
  if (!selfHeal && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startMs = Date.now();
  const result = {
    found: 0,
    processed: 0,
    errors: 0,
    draftIds: [] as string[],
    errorDetails: [] as string[],
  };

  try {
    // Step 1: Find recently-published posts that don't have a draft yet.
    // Window: published in last 24 hours but not within the last 5 min
    // (5-min cool-down so auto-publish gate + audit pipeline can settle
    // before we attach a draft to a not-yet-finalized post).
    const { data: posts, error: postsErr } = await supabaseAdmin
      .from('posts')
      .select(`
        id, title, subtitle, content, slug, published_at,
        category, og_image_url, highlight_id,
        team_home_id, team_away_id, league_id, seo_description
      `)
      .eq('status', 'published')
      .gte('published_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .lt('published_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .not('highlight_id', 'is', null) // Only auto-generated articles
      .order('published_at', { ascending: true })
      .limit(MAX_RUN) as { data: IncomingPost[] | null; error: any };

    if (postsErr) {
      throw new Error(`find posts: ${postsErr.message}`);
    }
    result.found = posts?.length ?? 0;

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        ok: true,
        ...result,
        durationMs: Date.now() - startMs,
        message: 'no published posts in window',
      });
    }

    // Step 2: Filter out posts that already have a draft.
    const postIds = posts.map((p) => p.id);
    const { data: existing, error: existErr } = await supabaseAdmin
      .from('social_drafts')
      .select('article_id')
      .in('article_id', postIds);
    if (existErr) {
      throw new Error(`check existing: ${existErr.message}`);
    }
    const existingSet = new Set((existing ?? []).map((e: any) => e.article_id));
    const todo = posts.filter((p) => !existingSet.has(p.id));

    if (todo.length === 0) {
      return NextResponse.json({
        ok: true,
        ...result,
        durationMs: Date.now() - startMs,
        message: 'all posts already drafted',
      });
    }

    // Step 3: For each post, fetch parent highlight + teams + league in batch.
    const highlightIds = todo.map((p) => p.highlight_id).filter((h): h is number => h != null);
    const teamIds = Array.from(new Set(todo.flatMap((p) => [p.team_home_id, p.team_away_id]).filter((t): t is number => t != null)));
    const leagueIds = Array.from(new Set(todo.map((p) => p.league_id).filter((l): l is number => l != null)));

    const [highlightsRes, teamsRes, leaguesRes] = await Promise.all([
      highlightIds.length
        ? supabaseAdmin.from('highlight_backups').select('id, title, image_url, video_url, home_team_name, away_team_name, league_name, match_id').in('id', highlightIds)
        : { data: [], error: null },
      teamIds.length
        ? supabaseAdmin.from('teams').select('id, name, display_name').in('id', teamIds)
        : { data: [], error: null },
      leagueIds.length
        ? supabaseAdmin.from('leagues').select('id, name, slug').in('id', leagueIds)
        : { data: [], error: null },
    ]);

    if (highlightsRes.error) throw new Error(`fetch highlights: ${highlightsRes.error.message}`);
    if (teamsRes.error) throw new Error(`fetch teams: ${teamsRes.error.message}`);
    if (leaguesRes.error) throw new Error(`fetch leagues: ${leaguesRes.error.message}`);

    const highlightsById = new Map((highlightsRes.data ?? []).map((h: any) => [h.id, h]));
    const teamsById = new Map((teamsRes.data ?? []).map((t: any) => [t.id, t]));
    const leaguesById = new Map((leaguesRes.data ?? []).map((l: any) => [l.id, l]));

    // Step 4: For each post, build the package + send to Telegram.
    const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!chatId || !telegramToken) {
      throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_NOTIFY_CHAT_ID not configured');
    }

    for (const post of todo) {
      try {
        const highlight = post.highlight_id ? highlightsById.get(post.highlight_id) : null;
        const homeTeam = post.team_home_id ? teamsById.get(post.team_home_id) : null;
        const awayTeam = post.team_away_id ? teamsById.get(post.team_away_id) : null;
        const league = post.league_id ? leaguesById.get(post.league_id) : null;

        // Build excerpt by stripping HTML, falling back to subtitle or
        // seo_description or first 320 chars of content.
        const excerpt = pickExcerpt(post);

        // Extract final score from content if present (parser was added
        // by the article-from-highlight orchestrator — looks like
        // "**Final Score:** Team A 5, Team B 2.").
        const finalScore = pickFinalScore(post.content, highlight);

        const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com'}/news/${league?.slug ?? 'news'}/${post.slug}`;

        const articleUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com'}/news/${post.slug}`;

        const pkg = buildSocialPackage({
          title: post.title,
          subtitle: post.subtitle,
          url: articleUrl,
          excerpt,
          leagueName: league?.name ?? highlight?.league_name ?? null,
          leagueSlug: league?.slug ?? null,
          homeTeamName: homeTeam?.display_name ?? homeTeam?.name ?? highlight?.home_team_name ?? null,
          awayTeamName: awayTeam?.display_name ?? awayTeam?.name ?? highlight?.away_team_name ?? null,
          finalScore,
          category: post.category,
          ogImageUrl: post.og_image_url,
          youtubeThumbnailUrl: highlight?.image_url ?? null,
          pullQuote: null,
        });

        // Send to Telegram with image attached.
        // No buttons / no callbacks — Arnel reads the message in RinkStop Ops,
        // saves the image, copies each block, posts manually at 9am PH.
        const telegramResult = await sendTelegramWithImage({
          token: telegramToken,
          chatId,
          imageUrl: pkg.imageUrl,
          caption: formatSocialPackageForTelegram(pkg, { title: post.title, url: articleUrl }),
          postId: post.id,
        });

        if (!telegramResult.ok) {
          throw new Error(`telegram: ${telegramResult.error}`);
        }

        // Insert social_drafts row. Use the message_id so we can edit/react.
        const { data: inserted, error: insErr } = await supabaseAdmin
          .from('social_drafts')
          .insert({
            article_id: post.id,
            copy_json: {
              fb: pkg.fb,
              x: pkg.x,
              li: pkg.li,
            } as any,
            image_url: pkg.imageUrl,
            message_id: telegramResult.messageId,
            status: 'pending_review',
          })
          .select('id')
          .single();

        if (insErr) {
          throw new Error(`insert draft: ${insErr.message}`);
        }

        result.processed += 1;
        result.draftIds.push(inserted.id);
      } catch (e: any) {
        result.errors += 1;
        result.errorDetails.push(`${post.id}: ${e.message ?? e}`);
      }
    }

    return NextResponse.json({
      ok: result.errors === 0,
      ...result,
      durationMs: Date.now() - startMs,
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      ...result,
      error: e.message ?? String(e),
      durationMs: Date.now() - startMs,
    }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function pickExcerpt(post: IncomingPost): string {
  const raw =
    post.seo_description ||
    post.subtitle ||
    stripHtml(post.content ?? '').slice(0, 320);
  if (!raw) return '';
  return raw.trim().slice(0, 320);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function pickFinalScore(content: string | null, highlight: any): { home: number; away: number } | null {
  if (!content) return null;

  // Pattern 1: orchestrator-injected "**Final Score:** Team A 5, Team B 2."
  const m1 = content.match(/\*\*Final Score:\*\*\s+([^\d]+?)\s+(\d+)\s*,\s*([^\d]+?)\s+(\d+)\s*\.?/);
  if (m1) {
    // away team score, home team score
    return { home: parseInt(m1[4], 10), away: parseInt(m1[2], 10) };
  }

  // Pattern 2: highlight.league_name-like is JSON (may have score)
  // Skip — too fragile.

  return null;
}

async function sendTelegramWithImage(args: {
  token: string;
  chatId: string;
  imageUrl: string | null;
  caption: string;
  postId: string;
}): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const { token, chatId, imageUrl, caption } = args;

  // Telegram message character limit is 4096; ours is well below.

  if (imageUrl) {
    // Use sendPhoto (fetches the image, attaches inline).
    // If fetch fails, fall back to sendMessage with image URL in caption.
    try {
      const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: imageUrl,
          caption: caption.slice(0, 1024), // caption cap
          parse_mode: 'Markdown',
        }),
      });
      const data: any = await photoRes.json();
      if (!data.ok) {
        // Fall through to text-only send.
      } else {
        return { ok: true, messageId: data.result?.message_id };
      }
    } catch (_e) { /* fall through */ }
  }

  // Fallback: send text-only with URL in caption.
  const msgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: caption,
      parse_mode: 'Markdown',
    }),
  });
  const data: any = await msgRes.json();
  if (!data.ok) {
    return { ok: false, error: data.description ?? 'unknown' };
  }
  return { ok: true, messageId: data.result?.message_id };
}
