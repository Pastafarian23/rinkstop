/**
 * src/lib/username-moderation.ts
 *
 * Layer 2 (brand prefix) + Layer 3 (profanity) username filtering.
 *
 * Arnel, 2026-06-17:
 *   "Maybe it's better to prevent users from claiming any profile with
 *    RinkStop in the name to be safe, but give your thoughts."
 *   "We also need a way to ban all profanities and inappropriate
 *    usernames, since this is a professional platform."
 *
 * Design (per my recommendation):
 *   - Substring block → too many false positives. Rejected.
 *   - Prefix review queue (rinkstop*, rink-stop*, kiloclaw*) → catches
 *     impersonation without blocking legit hockey-handle overlaps.
 *   - Hard-block clear slurs (auto-reject with polite message)
 *   - Soft-queue profanity + borderline terms (admin reviews)
 *   - Leet-normalize the slug before matching so 'h4t3r' → 'hater' is caught.
 *
 * Files:
 *   - supabase/migrations/2026-06-17_username_review.sql
 *   - this file: pure-function helpers + the DB read for the bad_words list
 *   - /api/usernames/check (consumes this) — already exists, will patch
 *   - /api/usernames (set) — already exists, will patch
 *   - /api/admin/username-review/* — new admin endpoints
 *   - /admin/username-review — new admin page
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Brand-protected prefixes. ANY username starting with one of these
 * (case-insensitive) gets sent to the review queue. This is the Layer 2
 * "soft block with human review" rule that catches impersonation while
 * still allowing legit overlap (e.g. someone named "Rink Stop" can
 * request the handle and a human reviews it).
 *
 * Add to this list deliberately — once a prefix is here, every signup
 * with that prefix gets queued. Removing a prefix doesn't auto-approve
 * pending requests, only new ones.
 */
export const BRAND_PREFIXES: string[] = [
  'rinkstop',     // brand
  'rink-stop',    // brand (hyphen variant)
  'kiloclaw',     // assistant / KiloClaw brand
  'rinkstopapp',  // brand
  'rinkstopteam', // brand
];

/**
 * Leet-speak normalization map. Lowercased. We replace each leet char
 * with its letter equivalent so 'h4t3r' → 'hater', 'sh1t' → 'shit', etc.
 * This is intentionally conservative — only unambiguous substitutions.
 */
const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '+': 't',
};

/**
 * Normalize a username for moderation: lowercase + leet translation.
 * Whitespace, hyphens, underscores are preserved as-is.
 */
export function normalizeForModeration(slug: string): string {
  let out = slug.toLowerCase();
  let result = '';
  for (const ch of out) {
    result += LEET_MAP[ch] ?? ch;
  }
  return result;
}

/**
 * Check if a slug starts with any brand-protected prefix.
 * Returns the matched prefix or null.
 */
export function findBrandPrefix(slug: string): string | null {
  const normalized = slug.toLowerCase();
  for (const prefix of BRAND_PREFIXES) {
    if (normalized === prefix || normalized.startsWith(prefix + '') || normalized.startsWith(prefix + '_') || normalized.startsWith(prefix + '.')) {
      return prefix;
    }
  }
  return null;
}

/**
 * Check a slug for bad words. Returns the first hard-block or a list of
 * soft-flag matches. Cached in-memory per process for ~5 minutes to avoid
 * hammering the DB on every keystroke in the UI.
 */
export type ModerationResult =
  | { ok: true }
  | { ok: false; hard_block: string }  // auto-reject; the matched bad word
  | { ok: false; soft_flags: string[]; normalized_slug: string };  // queue for review

let _badWordsCache: { words: { word: string; severity: 'hard' | 'soft' }[]; expires: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

async function loadBadWords(): Promise<{ word: string; severity: 'hard' | 'soft' }[]> {
  if (_badWordsCache && _badWordsCache.expires > Date.now()) {
    return _badWordsCache.words;
  }
  const { data, error } = await supabaseAdmin
    .from('bad_words')
    .select('word, severity');
  if (error) {
    // If the table is missing or DB is down, fail open (allow). Logging
    // here so the issue is visible in the function logs.
    console.error('[username-moderation] bad_words read failed:', error);
    return [];
  }
  const words = (data || []).map((r: any) => ({ word: r.word, severity: r.severity }));
  _badWordsCache = { words, expires: Date.now() + CACHE_MS };
  return words;
}

/**
 * Run all moderation checks against a slug.
 *
 * 1. Brand prefix check → returns `soft_review` with reason='brand_prefix'
 * 2. Bad-words check    → hard block (auto-reject) or soft queue
 * 3. Empty (no flags)   → ok
 */
export async function moderateUsername(slug: string): Promise<ModerationResult> {
  const normalized = normalizeForModeration(slug);

  // 1. Brand prefix
  const brandPrefix = findBrandPrefix(slug);
  if (brandPrefix) {
    return {
      ok: false,
      soft_flags: [`brand_prefix:${brandPrefix}`],
      normalized_slug: normalized,
    };
  }

  // 2. Bad words
  const words = await loadBadWords();
  if (words.length === 0) {
    return { ok: true };
  }
  const matchedSoft: string[] = [];
  for (const w of words) {
    if (normalized.includes(w.word)) {
      if (w.severity === 'hard') {
        return { ok: false, hard_block: w.word };
      }
      matchedSoft.push(w.word);
    }
  }
  if (matchedSoft.length > 0) {
    return { ok: false, soft_flags: matchedSoft, normalized_slug: normalized };
  }

  return { ok: true };
}

/**
 * Soft-review a username: insert into pending_username_review.
 * The user is told their username is "being reviewed" and an admin
 * can approve (commit the username) or reject (notify the user).
 *
 * Returns the pending review id or null on failure.
 */
export async function queueForReview(
  userId: string,
  slug: string,
  reason: 'brand_prefix' | 'soft_profanity' | 'pattern',
  reasonDetail: string,
  normalizedSlug?: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('pending_username_review')
    .upsert(
      {
        user_id: userId,
        requested_slug: slug.toLowerCase(),
        reason,
        reason_detail: `${reasonDetail}${normalizedSlug ? ` (normalized: ${normalizedSlug})` : ''}`,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,requested_slug' }
    )
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('[username-moderation] queueForReview insert failed:', error);
    return null;
  }
  return data?.id ?? null;
}

/**
 * Apply the moderation result to a username-set attempt.
 *
 *   hard_block     → returns { ok: false, hard: <word> }
 *   soft_flags     → inserts review row, returns { ok: false, pending: <id> }
 *   ok             → caller proceeds with the setUsername call
 */
export async function applyModeration(
  userId: string,
  slug: string
): Promise<
  | { ok: true }
  | { ok: false; hard: string }
  | { ok: false; pending: string }
> {
  const result = await moderateUsername(slug);
  if (result.ok) {
    return { ok: true };
  }
  if ('hard_block' in result) {
    return { ok: false, hard: result.hard_block };
  }
  // soft_flags
  if (!('soft_flags' in result)) {
    return { ok: true };
  }
  const flags = result.soft_flags;
  let reason: 'brand_prefix' | 'soft_profanity' | 'pattern' = 'soft_profanity';
  if (flags.some((f) => f.startsWith('brand_prefix:'))) {
    reason = 'brand_prefix';
  }
  const detail = flags.join(', ');
  const reviewId = await queueForReview(userId, slug, reason, detail, result.normalized_slug);
  if (!reviewId) {
    // If we can't queue, fail closed (block) so we don't accidentally
    // commit a username we couldn't moderate.
    return { ok: false, hard: 'review_queue_unavailable' };
  }
  return { ok: false, pending: reviewId };
}
