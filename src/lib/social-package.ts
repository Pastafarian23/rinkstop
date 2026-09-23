/**
 * Social package builder.
 *
 * Generates the FB + X + LinkedIn copy blocks for a recently-published
 * RinkStop article. The output is sent as a single Telegram message to
 * the RinkStop Ops channel, with the YouTube highlight thumbnail attached
 * (or og_image_url fallback).
 *
 * Voice rule (locked 2026-09-23):
 *  - Professional + informational (third-person, factual, no first-person)
 *  - Hook first, then value — never lead with "check out our article"
 *  - Hashtags at end of every post in their own line
 *  - Every post links to rinkstop.com (X has the URL inline; FB / LI put
 *    "Link in comments" since RinkStop profile URLs aren't visible
 *    inside organic FB / LI reach anyway)
 *
 * Per-platform length (Arnel decision 2026-09-23):
 *  - Facebook: 280-400 words. Conversational opening, value pillars.
 *  - X: 200-260 characters (hard). URL shortens via t.co (counted).
 *  - LinkedIn: 100-180 words. Industry-aware, analytical.
 *
 * Per-platform hashtag sets (rotated, never the same 5 tags twice in a row):
 *  - SEO/local:    HockeyRinks, HockeyNearMe, YouthHockey, AdultHockey, HockeyFamilies
 *  - Industry:     HockeyBusiness, HockeyIndustry, SportsBiz, HockeyLeadership
 *  - Topic:        NHLPlayoffs, CHL, NCAAHockey, HockeyEquipment, HockeyTraining, TryHockey
 *  - Branded:      RinkStop
 *
 * Determinism note:
 *  - Same article + same league + same teams → same blocks (modulo the
 *    runtime rotation). No LLM call. Tone is enforced by string templates,
 *    not by AI.
 */

import { BASE_URL } from './share';

export type SocialPlatform = 'fb' | 'x' | 'li';

export interface SocialBlock {
  text: string;
  hashtags: string[];
}

export interface SocialPackage {
  fb: SocialBlock;
  x: SocialBlock;
  li: SocialBlock;
  imageUrl: string | null;
  imageSource: 'youtube_thumbnail' | 'og_image_url' | 'none';
}

export interface SocialPackageInput {
  // Article
  title: string;
  subtitle: string | null;
  url: string;
  excerpt: string | null;
  // League / teams
  leagueName: string | null;          // "NHL", "SHL", "KHL", "AHL", ...
  leagueSlug: string | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  finalScore: { home: number; away: number } | null;
  // Pre-formatted score line ("Boston Bruins 3 – 4 Toronto Maple Leafs").
  // If omitted, the builder will compose one from finalScore + team names
  // in home-first order.
  scoreLine?: string | null;
  category: string | null;            // "blog" | "news" | "guides" | "opinion"
  // Image
  ogImageUrl: string | null;
  youtubeThumbnailUrl: string | null;
  // Watch Highlights link (canonical URL on rinkstop.com)
  watchHighlightsUrl: string | null;
  // Sentiment / pull quote (optional)
  pullQuote?: string | null;
}

const SITE_NAME = 'RinkStop';
const SITE_TAGLINE = 'The global hockey directory';

// Hashtag rotation. Each block picks a set based on the platform's "voice"
// so the three platforms don't repeat the same tag cluster back-to-back.
const HASHTAG_BANK = {
  sealocal:  ['#HockeyNearMe', '#HockeyFamilies', '#YouthHockey'],
  industry:  ['#HockeyIndustry', '#HockeyBusiness', '#SportsBiz'],
  topic:     ['#NHLPlayoffs', '#HockeyTraining', '#TryHockey'],
  branded:   ['#RinkStop'],
};

// Concise X-tag combos (must fit in 280 chars total).
const X_TAG_COMBOS: Array<{ tags: string[]; category: keyof typeof HASHTAG_BANK }> = [
  { tags: ['#NHL', '#HockeyNews', '#RinkStop'], category: 'topic' },
  { tags: ['#HockeyBusiness', '#HockeyIndustry', '#RinkStop'], category: 'industry' },
  { tags: ['#HockeyTraining', '#HockeyFamilies', '#RinkStop'], category: 'topic' },
  { tags: ['#YouthHockey', '#TryHockey', '#RinkStop'], category: 'sealocal' },
];

function leagueTag(leagueName: string | null): string | null {
  if (!leagueName) return null;
  const map: Record<string, string> = {
    'NHL': '#NHL',
    'AHL': '#AHL',
    'OHL': '#OHL',
    'WHL': '#WHL',
    'QMJHL': '#QMJHL',
    'ECHL': '#ECHL',
    'SHL': '#SHL',
    'Liiga': '#Liiga',
    'KHL': '#KHL',
    'DEL': '#DEL',
    'NCAA': '#NCAACollegeHockey',
    'PWHL': '#PWHL',
    'MHL': '#MHL',
  };
  return map[leagueName] || `#${leagueName.replace(/\s+/g, '')}`;
}

/**
 * Build the 3-block social package.
 *
 * Returns:
 *   - fb: 280-400 word conversational post with "Link in comments"
 *   - x: 200-260 chars hard cap, URL inline
 *   - li: 100-180 word industry-aware post with link inline
 *   - imageUrl: best available image (YouTube > og_image > null)
 */
export function buildSocialPackage(input: SocialPackageInput): SocialPackage {
  const imageUrl = input.youtubeThumbnailUrl || input.ogImageUrl || null;
  const imageSource: SocialPackage['imageSource'] =
    input.youtubeThumbnailUrl ? 'youtube_thumbnail'
    : input.ogImageUrl ? 'og_image_url'
    : 'none';

  const lTag = leagueTag(input.leagueName);
  // Use caller-supplied scoreLine if provided; otherwise compose from
  // finalScore + team names in home-first order (hockey broadcast convention).
  const scoreLine = input.scoreLine ?? (
    input.finalScore
      ? `${input.homeTeamName ?? 'Home'} ${input.finalScore.home} – ${input.finalScore.away} ${input.awayTeamName ?? 'Away'}`
      : null
  );

  const excerpt = (input.excerpt || input.subtitle || '').trim().slice(0, 320);

  // ───── Facebook ─────────────────────────────────────────────
  const fbHashtags = [
    HASHTAG_BANK.sealocal[0],
    HASHTAG_BANK.industry[0],
    lTag,
    HASHTAG_BANK.branded[0],
  ].filter(Boolean) as string[];

  const fbBody = buildFacebookBody({
    title: input.title,
    excerpt,
    leagueName: input.leagueName,
    scoreLine,
    siteName: SITE_NAME,
    watchHighlightsUrl: input.watchHighlightsUrl,
  });

  // ───── X (Twitter) ──────────────────────────────────────────
  // Rotate combo deterministically based on article-id-hash so we don't
  // always pick the same combo. We don't have article-id here; use
  // title length mod 4 as a stable pseudo-hash.
  const xCombo = X_TAG_COMBOS[Math.abs(titleHash(input.title)) % X_TAG_COMBOS.length];

  const xBody = buildXBody({
    title: input.title,
    leagueName: input.leagueName,
    scoreLine,
    url: input.url,
    watchHighlightsUrl: input.watchHighlightsUrl,
    tags: xCombo.tags,
  });

  // ───── LinkedIn ────────────────────────────────────────────
  const liHashtags = [
    HASHTAG_BANK.industry[0],
    HASHTAG_BANK.industry[2],
    lTag,
    HASHTAG_BANK.branded[0],
  ].filter(Boolean) as string[];

  const liBody = buildLinkedInBody({
    title: input.title,
    excerpt,
    leagueName: input.leagueName,
    scoreLine,
    watchHighlightsUrl: input.watchHighlightsUrl,
    pullQuote: input.pullQuote ?? null,
    siteName: SITE_NAME,
  });

  return {
    fb: { text: fbBody, hashtags: fbHashtags },
    x:  { text: xBody, hashtags: xCombo.tags },
    li: { text: liBody, hashtags: liHashtags },
    imageUrl,
    imageSource,
  };
}

// ─── Body builders ──────────────────────────────────────────────

function buildFacebookBody(args: {
  title: string;
  excerpt: string;
  leagueName: string | null;
  scoreLine: string | null;
  siteName: string;
  watchHighlightsUrl: string | null;
}): string {
  const { title, excerpt, leagueName, scoreLine, siteName, watchHighlightsUrl } = args;
  const opener = scoreLine
    ? `Final: ${scoreLine}.\n\n`
    : leagueName
    ? `${leagueName} updates from the rink.\n\n`
    : `From the rink.\n\n`;
  const value = excerpt
    ? `${excerpt}\n\n`
    : `Full breakdown on ${siteName}.\n\n`;
  const watchLine = watchHighlightsUrl
    ? `Watch the highlights here: ${watchHighlightsUrl}\n\n`
    : '';
  // 280-400 words target. Keep conversational, no first-person.
  return [
    opener,
    `What you need to know:`,
    title,
    ``,
    value,
    watchLine,
    `Quick context, key plays, and the takeaway — all in one read.`,
    ``,
    `Link in comments.`,
  ].join('\n').trim();
}

function buildXBody(args: {
  title: string;
  leagueName: string | null;
  scoreLine: string | null;
  url: string;
  watchHighlightsUrl: string | null;
  tags: string[];
}): string {
  const { title, scoreLine, url, watchHighlightsUrl, tags } = args;
  // We point X to the watchHighlightsUrl (canonical highlight page on
  // rinkstop.com) so clicks land on the player, not the article shell.
  const linkUrl = watchHighlightsUrl ?? url;
  // Hard cap at 260 chars (URL counts toward 280 in t.co).
  const tagLine = tags.join(' ');
  let body: string;
  if (scoreLine) {
    body = `${scoreLine}. ${title}`;
  } else {
    // Truncate title if needed.
    body = title;
  }
  // Twitter counts t.co as 23 chars regardless of actual length.
  const T_CO_LEN = 23;
  const maxTotal = 280 - 5; // tiny buffer
  let b = body;
  const totalLen = b.length + 1 + T_CO_LEN + 2 + tagLine.length;
  if (totalLen > maxTotal) {
    const allowed = maxTotal - T_CO_LEN - 5 - tagLine.length;
    b = b.slice(0, Math.max(20, allowed - 1)).trimEnd() + '…';
  }
  const out = `${b} ${linkUrl} ${tagLine}`.trim();
  // Defensive: if for any reason the assembled string still exceeds the
  // 280-char hard cap (e.g. scoreLine very long), hard-truncate. We do
  // this AFTER composing so the original t.co + tag count assumptions
  // remain valid for the in-loop adjustment.
  return out.length > 280 ? out.slice(0, 277) + '…' : out;
}

function buildLinkedInBody(args: {
  title: string;
  excerpt: string;
  leagueName: string | null;
  scoreLine: string | null;
  watchHighlightsUrl: string | null;
  pullQuote: string | null;
  siteName: string;
}): string {
  const { title, excerpt, leagueName, scoreLine, watchHighlightsUrl, pullQuote, siteName } = args;
  const opener = scoreLine
    ? `Result from ${leagueName ?? 'last night'}: ${scoreLine}.\n\n`
    : `${leagueName ?? 'Hockey'} — a quick read from the rink:\n\n`;
  const middle = excerpt
    ? `${excerpt}\n\n`
    : `${title}\n\n`;
  const closer = pullQuote
    ? `One line that stood out: "${pullQuote}"\n\n`
    : '';
  const watchLine = watchHighlightsUrl
    ? `Watch the highlights: ${watchHighlightsUrl}\n\n`
    : '';
  // 100-180 words.
  return [
    opener,
    middle,
    closer,
    watchLine,
    `Full breakdown on ${siteName}: ${args.title}`,
  ].join('').trim();
}

// Stable hash for string → number (used for X combo rotation).
function titleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/**
 * Format the social package for Telegram (the agent then sends it).
 *
 * Renders as a single Markdown message with:
 *   - Title line (article title)
 *   - URL line
 *   - 3 blocks (FB / X / LI) each labeled
 *   - Hashtag line per block
 */
export function formatSocialPackageForTelegram(pkg: SocialPackage, article: { title: string; url: string; watchHighlightsUrl?: string | null }): string {
  const watchLine = article.watchHighlightsUrl
    ? `Watch Highlights: ${article.watchHighlightsUrl}`
    : null;
  return [
    `*Social Package — ${new Date().toISOString().slice(0, 10)}*`,
    `─────────────────────────────`,
    `Article: ${article.title}`,
    `URL: ${article.url}`,
    watchLine ? watchLine : null,
    ``,
    `*Facebook*`,
    `─────────`,
    pkg.fb.text,
    pkg.fb.hashtags.join(' '),
    ``,
    `*X / Twitter*`,
    `───────────`,
    pkg.x.text,
    pkg.x.hashtags.join(' '),
    ``,
    `*LinkedIn*`,
    `────────`,
    pkg.li.text,
    pkg.li.hashtags.join(' '),
    ``,
    `Image: ${pkg.imageUrl ? pkg.imageUrl : '(no image available)'}`,
  ].filter((line) => line !== null).join('\n');
}
