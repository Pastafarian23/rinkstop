// src/lib/slug-builder.ts
//
// TypeScript port of scripts/article-from-highlight/slug-builder.mjs
// for client-side use (the SlugPreviewBanner needs to compute the
// slug live as Arnel picks teams in the review page).
//
// Only the pure functions are ported. Supabase-dependent helpers
// (lookupTeamSlug, checkSlugCollision, buildAndCheckSlug, lookupTeamIdByName)
// stay in the .mjs file and are not callable from a client component.

/* ------------------------------------------------------------------ */
/* Errors                                                             */
/* ------------------------------------------------------------------ */

export class SlugCollisionError extends Error {
  public readonly proposedSlug: string;
  public readonly existing: { id: string; highlight_id?: number | null; published_at?: string | null; slug: string };

  constructor(
    proposedSlug: string,
    existing: { id: string; highlight_id?: number | null; published_at?: string | null; slug: string }
  ) {
    super(
      `slug collision: "${proposedSlug}" already exists on post ${existing.id} (highlight_id=${existing.highlight_id ?? '?'}, published_at=${existing.published_at ?? '?'})`
    );
    this.name = 'SlugCollisionError';
    this.proposedSlug = proposedSlug;
    this.existing = existing;
  }
}

export class SlugValidationError extends Error {
  public readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'SlugValidationError';
    this.context = context;
  }
}

/* ------------------------------------------------------------------ */
/* Slug normalization                                                 */
/* ------------------------------------------------------------------ */

/**
 * Normalize a free-form string into a clean slug component.
 * Lowercase, strip diacritics, replace non-alphanumeric with hyphens,
 * trim leading/trailing hyphens, collapse consecutive hyphens.
 */
export function slugifyComponent(input: string | null | undefined): string {
  if (typeof input !== 'string' || input.length === 0) return '';
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

/* ------------------------------------------------------------------ */
/* Date helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Normalize a date to YYYY-MM-DD. Accepts:
 *   - 'YYYY-MM-DD' (returns as-is if parseable)
 *   - ISO timestamp ('2026-06-11T00:00:00Z', etc.)
 *   - Date object
 * Returns null on any parse failure.
 */
export function normalizeDate(input: string | Date | null | undefined): string | null {
  if (input === null || input === undefined) return null;

  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return input.toISOString().slice(0, 10);
  }

  if (typeof input !== 'string' || input.length === 0) return null;

  // Already a YYYY-MM-DD string.
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    // Validate it actually parses.
    const d = new Date(input + 'T00:00:00Z');
    if (isNaN(d.getTime())) return null;
    return input;
  }

  // ISO timestamp.
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* Slug assembly                                                      */
/* ------------------------------------------------------------------ */

export interface BuildSlugInput {
  homeTeamSlug?: string | null;
  homeTeamName?: string | null;
  awayTeamSlug?: string | null;
  awayTeamName?: string | null;
  gameDate: string | Date | null | undefined;
}

export interface BuildSlugResult {
  slug: string;
  source: 'team-slug' | 'raw-name';
  warnings: string[];
}

/**
 * Build a post slug from team slugs/names + a date.
 *
 * Slug format (per docs/CLEAN-POST-SLUGS-SPEC.md §4):
 *   {home-team-slug}-{away-team-slug}-{YYYY-MM-DD}
 *
 * Resolution priority (per §4.2):
 *   1. teamHomeSlug / awayTeamSlug (looked up from teams table by the caller)
 *   2. slugify(homeTeamName) / slugify(awayTeamName) (with a warning)
 *
 * Throws SlugValidationError if any required field is missing or unparseable.
 */
export function buildSlug({
  homeTeamSlug,
  homeTeamName,
  awayTeamSlug,
  awayTeamName,
  gameDate,
}: BuildSlugInput): BuildSlugResult {
  const warnings: string[] = [];

  // 1. Resolve home slug.
  let home: string;
  if (homeTeamSlug) {
    home = slugifyComponent(homeTeamSlug);
    if (!home) {
      throw new SlugValidationError('homeTeamSlug is set but slugifies to empty', { homeTeamSlug });
    }
  } else if (homeTeamName) {
    home = slugifyComponent(homeTeamName);
    warnings.push(`home team slug not found in teams table; slugified raw name "${homeTeamName}" → "${home}"`);
  } else {
    throw new SlugValidationError('buildSlug: must provide homeTeamSlug or homeTeamName', {});
  }

  // 2. Resolve away slug.
  let away: string;
  if (awayTeamSlug) {
    away = slugifyComponent(awayTeamSlug);
    if (!away) {
      throw new SlugValidationError('awayTeamSlug is set but slugifies to empty', { awayTeamSlug });
    }
  } else if (awayTeamName) {
    away = slugifyComponent(awayTeamName);
    warnings.push(`away team slug not found in teams table; slugified raw name "${awayTeamName}" → "${away}"`);
  } else {
    throw new SlugValidationError('buildSlug: must provide awayTeamSlug or awayTeamName', {});
  }

  // 3. Normalize date.
  const date = normalizeDate(gameDate);
  if (!date) {
    throw new SlugValidationError('buildSlug: gameDate is missing or unparseable', { gameDate });
  }

  // 4. Assemble.
  const slug = `${home}-${away}-${date}`;

  // 5. Report the source: 'team-slug' if BOTH teams came from the teams table,
  //    'raw-name' if either was a fallback.
  const source: 'team-slug' | 'raw-name' =
    homeTeamSlug && awayTeamSlug ? 'team-slug' : 'raw-name';

  return { slug, source, warnings };
}
