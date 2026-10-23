// src/lib/seo-title.ts
//
// Builds SERP titles that account for the layout's title TEMPLATE.
//
// WHY THIS EXISTS (2026-10-23, GSC title-length pass)
//
// The root layout declares:
//
//   title: { default: '...', template: '%s | RinkStop' }
//
// Next.js then renders every child page's title as `"<child title> | RinkStop"`.
// The suffix is **11 characters long** (" | RinkStop" — space, pipe, space,
// then 8 letters). A test asserts this matches the layout's template.
//
// The rink page's own generator budgeted its title at 60 chars — but that was
// the FINAL length it wanted, and the template then added 10 more on top. So
// every "60 char" title it produced actually rendered at 70 chars, and Google
// truncated it mid-phrase:
//
//   "Ice Rink StarCenter Euless | Ice Rink — Euless, Tarrant County, TX | RinkStop"  (76)
//   "Ice Skating Rink – Othaim Mall Riyadh — Riyadh, Saudi Arabia 12839 | RinkStop" (76)
//
// The bug class is the same as the PostgREST `limit` cap: a limit that LOOKS
// like it works and silently doesn't, because the thing being measured (the
// page's own title) is not the thing being rendered (the templated title).
//
// THE FIX
//
// Build the title against the FINAL length — i.e. budget for the suffix.
// `TITLE_TEMPLATE_SUFFIX` must stay in sync with the layout's template. A test
// asserts that, so the two cannot drift apart silently.

/** The layout's title template suffix. Keep in sync with src/app/layout.tsx. */
export const TITLE_TEMPLATE_SUFFIX = ' | RinkStop';

/** Google truncates titles around 60 characters; we target at or under that. */
export const SERP_TITLE_MAX = 60;

/**
 * The budget a page's own title string may use, given that the layout appends
 * the template suffix to it.
 */
export function pageTitleBudget(max = SERP_TITLE_MAX, suffix = TITLE_TEMPLATE_SUFFIX): number {
  return Math.max(0, max - suffix.length);
}

/**
 * Choose the first candidate that fits the budget, otherwise the last one.
 *
 * The candidate list must be ordered from most-detailed to least-detailed, so
 * dropping to a later candidate drops the least load-bearing field rather
 * than truncating text mid-word (a truncated "Pr..." reads as broken).
 *
 * @param candidates ordered most-detailed first
 * @param suffix    the template suffix that will be appended
 * @param max       the maximum length of the FINAL rendered title
 */
export function pickSercTitle(
  candidates: string[],
  suffix = TITLE_TEMPLATE_SUFFIX,
  max = SERP_TITLE_MAX,
): string {
  const budget = pageTitleBudget(max, suffix);
  const usable = candidates.filter((c) => typeof c === 'string' && c.trim().length > 0);
  if (usable.length === 0) return '';

  for (const c of usable) {
    if (c.length <= budget) return c;
  }
  // Nothing fits. Use the shortest candidate we were given rather than
  // hard-truncating — a clean short title beats a cut-off phrase.
  return usable.reduce((shortest, c) => (c.length < shortest.length ? c : shortest), usable[0]);
}

/**
 * Shorten a long title to fit the SERP budget by dropping trailing clauses.
 *
 * Titles in this codebase are usually "Headline: Subtitle — Extra Detail".
 * When the whole thing is too long we drop from the END, preferring to cut at
 * a clause boundary (`:`, `—`, `–`, `,`) and never mid-word.
 *
 * If no clause boundary yields something short enough, the title is hard
 * truncated at a word boundary — a clean short title still beats one Google
 * truncates for us at an arbitrary character.
 *
 * @param title  the page's own title (without the template suffix)
 * @param suffix the template suffix that will be appended
 * @param max    the maximum length of the FINAL rendered title
 */
export function shortenSercTitle(
  title: string,
  suffix = TITLE_TEMPLATE_SUFFIX,
  max = SERP_TITLE_MAX,
): string {
  if (typeof title !== 'string') return '';
  const trimmed = title.trim();
  if (!trimmed) return '';
  if (trimmed.length + suffix.length <= max) return trimmed;

  const budget = pageTitleBudget(max, suffix);

  // Try progressively dropping trailing clauses.
  // Split on clause boundaries but KEEP the separators so the result reads
  // naturally ("Hockey in India 2026: All 6 Rinks" not "Hockey in India 2026").
  const parts = trimmed.split(/(?<=[:—–,–])\s*/);
  for (let i = parts.length - 1; i >= 1; i--) {
    const candidate = parts.slice(0, i).join('').replace(/[\s:—–,–]+$/, '').trim();
    if (candidate.length > 0 && candidate.length <= budget) {
      return candidate;
    }
  }

  // No clause boundary fit. Truncate at a word boundary.
  if (parts[0] && parts[0].length <= budget) return parts[0].trim();

  const hardCut = trimmed.slice(0, budget);
  const lastSpace = hardCut.lastIndexOf(' ');
  return (lastSpace > 20 ? hardCut.slice(0, lastSpace) : hardCut).replace(/[\s:—–,–]+$/, '').trim();
}
