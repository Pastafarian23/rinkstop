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
        ? supabaseAdmin.from('highlight_backups').select('id, title, image_url, video_url, embed_url, home_team_name, away_team_name, league_name, match_id').in('id', highlightIds)
        : { data: [], error: null },
      teamIds.length
        ? supabaseAdmin.from('teams').select('id, name, city').in('id', teamIds)
        : { data: [], error: null },
      leagueIds.length
        ? supabaseAdmin.from('leagues').select('id, name, slug').in('id', leagueIds)
        : { data: [], error: null },
    ]);

    // Fetch fixtures for cross-verification of the final score. We use
    // team_home_id + team_away_id to look up the row, then pick the
    // fixture whose scheduled_at is closest to the post's published_at.
    //
    // Why the closest-date filter matters (caught 2026-09-23):
    // A team-pair can have 10+ historical fixtures (every season they
    // played). Picking the first row from PostgREST would return an
    // arbitrary old game. We need the row whose date matches the article.
    const fixtureLookups = todo
      .filter((p) => p.team_home_id && p.team_away_id)
      .map((p) => ({
        home: p.team_home_id,
        away: p.team_away_id,
        date: p.published_at,
        post: p,
      }));
    const fixturesRes = fixtureLookups.length
      ? await supabaseAdmin
          .from('fixtures')
          .select('id, home_team_id, away_team_id, home_score, away_score, scheduled_at, status')
          .in('home_team_id', fixtureLookups.map((l) => l.home!))
          .in('away_team_id', fixtureLookups.map((l) => l.away!))
      : { data: [] as any[], error: null as any };
    if (fixturesRes.error) {
      // Non-fatal: log but continue with content-only scoring.
      console.warn('[cron/social-draft] fixtures fetch warning:', fixturesRes.error.message);
    }
    // Index all fixtures for all team-pairs, then in the loop pick the
    // one with the smallest |scheduled_at - post.published_at| delta.
    const fixturesByPair = new Map<string, any[]>();
    for (const f of (fixturesRes.data ?? []) as any[]) {
      const key = `${f.home_team_id}|${f.away_team_id}`;
      if (!fixturesByPair.has(key)) fixturesByPair.set(key, []);
      fixturesByPair.get(key)!.push(f);
    }

    if (highlightsRes.error) throw new Error(`fetch highlights: ${highlightsRes.error.message}`);
    if (teamsRes.error) throw new Error(`fetch teams: ${teamsRes.error.message}`);
    if (leaguesRes.error) throw new Error(`fetch leagues: ${leaguesRes.error.message}`);

    const highlightsById = new Map((highlightsRes.data ?? []).map((h: any) => {
      // highlight_backups.league_name is sometimes a JSON-stringified
      // object (per 2026-09-22 07:57 CDT audit). Normalize to plain string.
      if (h.league_name && typeof h.league_name === 'string') {
        try {
          const parsed = JSON.parse(h.league_name);
          if (parsed && typeof parsed === 'object' && parsed.name) {
            h.league_name = parsed.name;
          }
        } catch { /* leave as-is */ }
      }
      // Upgrade YouTube thumbnails from hqdefault (320x240) to maxresdefault
      // (1280x720) when available. Telegram confirmed (test 2026-09-23)
      // that ytimg.com URLs work for all 3 size variants. Better image =
      // higher engagement on social platforms.
      if (h.image_url && typeof h.image_url === 'string') {
        h.image_url = h.image_url
          .replace('/hqdefault.jpg', '/maxresdefault.jpg')
          .replace('/sddefault.jpg', '/maxresdefault.jpg')
          .replace('/mqdefault.jpg', '/maxresdefault.jpg');
      }
      return [h.id, h];
    }));
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
        const contentScore = pickFinalScore(post.content, highlight);
        // Cross-verify against fixtures table (ground truth from highlightly).
        // If they disagree, fall back to fixtures and flag the mismatch.
        // Pick the fixture whose scheduled_at is closest to the post's
        // published_at — a team-pair can have many historical rows.
        const candidateFixtures = post.team_home_id && post.team_away_id
          ? fixturesByPair.get(`${post.team_home_id}|${post.team_away_id}`) ?? []
          : [];
        const postTime = new Date(post.published_at).getTime();
        const fixtureRow = candidateFixtures
          .filter((f) => f.scheduled_at && typeof f.home_score === 'number' && typeof f.away_score === 'number')
          .sort((a, b) => {
            const da = Math.abs(new Date(a.scheduled_at).getTime() - postTime);
            const db = Math.abs(new Date(b.scheduled_at).getTime() - postTime);
            return da - db;
          })[0] ?? null;
        const fixtureScore = fixtureRow
          ? { home: fixtureRow.home_score, away: fixtureRow.away_score }
          : null;
        const finalScore = crossVerifyScore(contentScore, fixtureScore, post.id);

        // Build scoreLine in conventional home-first order: "Home 2 – 1 Away".
        // Convention in hockey broadcasts: home team first, then away team.
        const homeTeamLabel = homeTeam?.name ?? highlight?.home_team_name ?? 'Home';
        const awayTeamLabel = awayTeam?.name ?? highlight?.away_team_name ?? 'Away';

        // Title-vs-score consistency check (added 2026-09-23 per Arnel directive).
        // If the post title says one team won but the Final Score line + fixture
        // say the other team won, the article is internally inconsistent.
        // REFUSE to draft a social post from an inconsistent article — better
        // to skip than to put wrong information on social media.
        const titleInconsistency = detectTitleScoreMismatch(post.title, post.content, finalScore, homeTeamLabel, awayTeamLabel);
        if (titleInconsistency) {
          console.warn(
            `[cron/social-draft] skipping post ${post.id} — title-vs-score inconsistency: ${titleInconsistency.reason}`,
          );
          // We don't insert a draft row, but we DO post a Telegram alert so
          // Arnel can fix the article upstream.
          await sendTelegramAlert(telegramToken, chatId, post, titleInconsistency);
          result.errors += 1;
          result.errorDetails.push(`${post.id}: skipped — ${titleInconsistency.reason}`);
          continue;
        }

        const scoreLine = finalScore
          ? `${homeTeamLabel} ${finalScore.home} – ${finalScore.away} ${awayTeamLabel}`
          : null;

        const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com'}/news/${league?.slug ?? 'news'}/${post.slug}`;

        const articleUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com'}/news/${post.slug}`;
        const scoreLineFinal = scoreLine; // capture for use in builder below

        // Build the canonical Watch Highlights URL on rinkstop.com.
        // Pattern: /highlights/{id}/{slug-from-title}. Slug uses the
        // same slugify as src/app/highlights/[id]/[slug]/page.tsx.
        const watchHighlightsUrl = highlight
          ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com'}/highlights/${highlight.id}/${slugifyHighlight(highlight.title ?? post.title)}`
          : null;

        const pkg = buildSocialPackage({
          title: post.title,
          subtitle: post.subtitle,
          url: articleUrl,
          excerpt,
          leagueName: league?.name ?? highlight?.league_name ?? null,
          leagueSlug: league?.slug ?? null,
          homeTeamName: homeTeamLabel,
          awayTeamName: awayTeamLabel,
          finalScore,
          scoreLine: scoreLineFinal,
          category: post.category,
          ogImageUrl: post.og_image_url,
          youtubeThumbnailUrl: highlight?.image_url ?? null,
          watchHighlightsUrl,
          pullQuote: null,
        });

        // Send to Telegram with image attached.
        // No buttons / no callbacks — Arnel reads the message in RinkStop Ops,
        // saves the image, copies each block, posts manually at 9am PH.
        const fullText = formatSocialPackageForTelegram(pkg, { title: post.title, url: articleUrl, watchHighlightsUrl });
        // Telegram sendPhoto caps caption at 1024 chars. The full formatted
        // package is ~1500 chars, so we send the image with a short caption
        // (header + image URL + brief context) and then send the full text
        // as a follow-up sendMessage so Arnel sees everything.
        const shortCaption = buildShortCaption({ title: post.title, url: articleUrl, watchHighlightsUrl, imageUrl: pkg.imageUrl });
        const telegramResult = await sendTelegramWithImage({
          token: telegramToken,
          chatId,
          imageUrl: pkg.imageUrl,
          caption: shortCaption,
          fullText,
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
  // Strip HTML tags first, then decode common HTML entities. Without
  // the entity decoding, "Tom &amp; Jerry" → "Tom &amp; Jerry" survives
  // into the social draft and looks like a typo.
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickFinalScore(content: string | null, highlight: any): { home: number; away: number } | null {
  if (!content) return null;

  // Pattern 1: orchestrator-injected "**Final Score:** Team A 5, Team B 2."
  // The article-from-highlight pipeline formats home team first, then
  // away team (per the orchestrator code path). So:
  //   m1[1] = home team name, m1[2] = home score
  //   m1[3] = away team name, m1[4] = away score
  const m1 = content.match(/\*\*Final Score:\*\*\s+([^\d]+?)\s+(\d+)\s*,\s*([^\d]+?)\s+(\d+)\s*\.?/);
  if (m1) {
    return { home: parseInt(m1[2], 10), away: parseInt(m1[4], 10) };
  }

  // Pattern 2: less-formal "Final Score: Team A 5, Team B 2." (no bold).
  // Some older articles may have been published before the bold variant
  // was standardized. Catch those too.
  const m2 = content.match(/(?:^|\n)\s*Final Score:\s+([^\d]+?)\s+(\d+)\s*,\s*([^\d]+?)\s+(\d+)\s*\.?/);
  if (m2) {
    return { home: parseInt(m2[2], 10), away: parseInt(m2[4], 10) };
  }

  return null;
}

/**
 * Cross-verify the score from the article body against the fixtures
 * table (canonical source from highlightly). If they disagree, the
 * fixtures row wins — it's been verified by the audit pipeline.
 *
 * Returns the agreed-upon {home, away} or null if both sources are
 * missing. Logs mismatches so we can fix the orchestrator upstream.
 */
function crossVerifyScore(
  contentScore: { home: number; away: number } | null,
  fixtureScore: { home: number; away: number } | null,
  postId: string,
): { home: number; away: number } | null {
  if (contentScore && fixtureScore) {
    if (contentScore.home === fixtureScore.home && contentScore.away === fixtureScore.away) {
      return contentScore; // agreement
    }
    console.warn(
      `[cron/social-draft] score mismatch for post ${postId}: ` +
      `content=${contentScore.home}-${contentScore.away} ` +
      `fixtures=${fixtureScore.home}-${fixtureScore.away}. ` +
      `Using fixtures.`,
    );
    return fixtureScore;
  }
  // Prefer whichever source we have.
  return fixtureScore ?? contentScore;
}

/**
 * Slugify a highlight title for the /highlights/[id]/[slug] route.
 * Mirrors the helper in src/app/highlights/[id]/[slug]/page.tsx.
 */
function slugifyHighlight(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Detect when the post title says one team won but the body Final Score
 * line says the other team won. Returns null if no mismatch detected.
 *
 * Same heuristics as scripts/article-from-highlight/orchestrate.mjs
 * extractWinnerFromTitle() — kept in sync intentionally. If we add a new
 * win-verb here, add it there too.
 */
function detectTitleScoreMismatch(
  title: string | null,
  content: string | null,
  finalScore: { home: number; away: number } | null,
  homeTeamName: string | null,
  awayTeamName: string | null,
): { reason: string; titleWinner: string; scoreWinner: string } | null {
  if (!title || !content || !finalScore || !homeTeamName || !awayTeamName) return null;

  // Parse Final Score line: "<winnerName> <winnerScore>, <loserName> <loserScore>"
  const bodyScoreMatch = content.match(/\*\*Final Score:\*\*\s+([^\d]+?)\s+(\d+)\s*,\s+([^\d]+?)\s+(\d+)/);
  if (!bodyScoreMatch) return null;
  const bodyTeamA = bodyScoreMatch[1].trim();
  const bodyScoreA = parseInt(bodyScoreMatch[2], 10);
  const bodyTeamB = bodyScoreMatch[3].trim();
  const bodyScoreB = parseInt(bodyScoreMatch[4], 10);

  // Determine winner's team from the title
  const lower = title.toLowerCase();
  let titleWinnerName: string | null = null;

  if (/\broad win\b/.test(lower)) {
    // "X earn N-N road win" — winner is X
    const earnMatch = title.match(/([\w'\-\.]+?)\s+\w+\s+\d+\s*[-–]\s*\d+\s+road win/i);
    if (earnMatch) titleWinnerName = earnMatch[1].toLowerCase().trim();
  } else if (/\btied\b/.test(lower)) {
    if (finalScore.home !== finalScore.away) {
      return {
        reason: `Title says tied but Final Score line shows ${bodyScoreA}-${bodyScoreB}`,
        titleWinner: 'tie',
        scoreWinner: `${bodyScoreA}-${bodyScoreB}`,
      };
    }
    return null;
  } else {
    // Win-verb patterns
    const WIN_VERBS = 'edge[sd]?|beat(?:en)?|top[s]?|handle[sd]?|down(?:ed)?|roll[s]? past|blank(?:ed)?|shut[s]? out|stun(?:ned)?|knock[s]? off';
    const winRe = new RegExp(`([\\w'\\-\\.]+)\\s+(?:${WIN_VERBS})\\s+`, 'i');
    const wm = winRe.exec(title);
    if (wm) titleWinnerName = wm[1].toLowerCase().trim();

    if (!titleWinnerName) {
      const LOSS_VERBS = 'falls? to|drops? to|loses? to|surrenders? to';
      const lossRe = new RegExp(`([\\w'\\-\\.]+)\\s+(?:${LOSS_VERBS})\\s+([\\w'\\-\\.]+)`, 'i');
      const lm = lossRe.exec(title);
      if (lm) titleWinnerName = lm[2].toLowerCase().trim();  // winner is the team AFTER the verb
    }
  }

  if (!titleWinnerName) return null;

  // Map winner name to home or away team
  const winnerIsHome = teamInString(titleWinnerName, homeTeamName);
  const winnerIsAway = teamInString(titleWinnerName, awayTeamName);
  if (!winnerIsHome && !winnerIsAway) return null;

  // Check: winner's score (from finalScore) should be > loser's score
  const winnerSlotScore = winnerIsHome ? finalScore.home : finalScore.away;
  const loserSlotScore = winnerIsHome ? finalScore.away : finalScore.home;
  const winnerName = winnerIsHome ? homeTeamName : awayTeamName;
  const loserName = winnerIsHome ? awayTeamName : homeTeamName;

  if (winnerSlotScore <= loserSlotScore) {
    return {
      reason: `Title says ${titleWinnerName} won but Final Score line shows ${finalScore.home}-${finalScore.away} (${loserName} scored ${loserSlotScore})`,
      titleWinner: `${winnerName} won ${winnerSlotScore}-${loserSlotScore} per title`,
      scoreWinner: `${finalScore.home}-${finalScore.away} (${loserName} actually won)`,
    };
  }

}

function extractBodyTeamA(content: string): string | null {
  const m = content.match(/\*\*Final Score:\*\*\s+([^\d]+?)\s+\d+/);
  return m ? m[1].trim() : null;
}

function extractBodyTeamB(content: string): string | null {
  const m = content.match(/\*\*Final Score:\*\*\s+[^\d]+?\s+\d+\s*,\s+([^\d]+?)\s+\d+/);
  return m ? m[1].trim() : null;
}

function teamInString(short: string, longer: string): boolean {
  if (!short || !longer) return false;
  const s = short.toLowerCase();
  const l = longer.toLowerCase();
  // Check if any 3+ char word from `short` appears in `longer`
  return s.split(/\s+/).some((w) => w.length >= 3 && l.includes(w));
}

async function sendTelegramAlert(
  token: string,
  chatId: string,
  post: IncomingPost,
  mismatch: { reason: string; titleWinner: string; scoreWinner: string },
): Promise<void> {
  const text = [
    `⚠️ *Skipped social draft — title/score mismatch*`,
    ``,
    `Article: ${post.title}`,
    `URL: https://rinkstop.com/news/${post.slug}`,
    ``,
    `Reason: ${mismatch.reason}`,
    ``,
    `Title winner: ${mismatch.titleWinner}`,
    `Score winner: ${mismatch.scoreWinner}`,
    ``,
    `Action needed: fix the article body or fixture row, then re-run /api/cron/social-draft.`,
  ].join('\n');
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
  } catch (_e) { /* best-effort */ }
}

async function sendTelegramWithImage(args: {
  token: string;
  chatId: string;
  imageUrl: string | null;
  caption: string;
  fullText: string;
  postId: string;
}): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const { token, chatId, imageUrl, caption, fullText } = args;

  // Telegram message character limit is 4096; ours is well below.
  // Telegram sendPhoto caps CAPTION at 1024 chars. The full formatted
  // package is ~1500 chars. Strategy:
  //   1. sendPhoto with the short caption (image + header + URL)
  //   2. sendMessage with the full text (3 blocks)
  // If image is missing or sendPhoto fails, fall back to a single
  // sendMessage with the full text.

  if (imageUrl) {
    try {
      const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: imageUrl,
          caption: caption.slice(0, 1024),
          parse_mode: 'Markdown',
        }),
      });
      const data: any = await photoRes.json();
      if (data.ok) {
        // Follow-up: send the full text as a separate message.
        const textRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: fullText,
            parse_mode: 'Markdown',
          }),
        });
        const textData: any = await textRes.json();
        if (!textData.ok) {
          // Image was sent but follow-up text failed — still return success
          // for the image so the draft gets recorded. Log the failure.
          return { ok: true, messageId: data.result?.message_id };
        }
        return { ok: true, messageId: data.result?.message_id };
      }
      // Fall through to text-only if photo failed.
    } catch (_e) { /* fall through */ }
  }

  // Fallback: send text-only with the full content.
  const msgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: fullText,
      parse_mode: 'Markdown',
    }),
  });
  const data: any = await msgRes.json();
  if (!data.ok) {
    return { ok: false, error: data.description ?? 'unknown' };
  }
  return { ok: true, messageId: data.result?.message_id };
}

/**
 * Build a short caption (under 1024 chars) for the Telegram sendPhoto
 * call. Includes the article title, URL, watch URL, and a pointer to the
 * follow-up message.
 */
function buildShortCaption(args: {
  title: string;
  url: string;
  watchHighlightsUrl: string | null;
  imageUrl: string | null;
}): string {
  const lines = [
    `*${args.title}*`,
    ``,
    `Article: ${args.url}`,
  ];
  if (args.watchHighlightsUrl) {
    lines.push(`Watch Highlights: ${args.watchHighlightsUrl}`);
  }
  lines.push(``);
  lines.push(`(Full FB/X/LinkedIn copy in next message ↓)`);
  return lines.join('\n');
}
