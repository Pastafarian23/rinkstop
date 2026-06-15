// src/scripts/article-from-highlight/slug-builder.mjs
//
// Pure-ish helpers for building clean post slugs from highlight + team data.
//
// Slug format (per docs/CLEAN-POST-SLUGS-SPEC.md §4):
//   {home-team-slug}-{away-team-slug}-{YYYY-MM-DD}
//
// All lowercase, hyphens only, no `vs` separator, no score, no day-of-week,
// no internal IDs.
//
// Team slug resolution priority (per §4.2):
//   1. teams.slug looked up by team_home_id / team_away_id
//   2. Slugify the raw home_team_name / away_team_name (with a warning)
//
// On collision (per §4.4): refuse, don't auto-dedupe. Throw SlugCollisionError.

/* ------------------------------------------------------------------ */
/* Errors                                                             */
/* ------------------------------------------------------------------ */

export class SlugCollisionError extends Error {
  constructor(proposedSlug, existing) {
    super(
      `slug collision: "${proposedSlug}" already exists on post ${existing.id} (highlight_id=${existing.highlight_id || '?'}, published_at=${existing.published_at || '?'})`
    );
    this.name = 'SlugCollisionError';
    this.proposedSlug = proposedSlug;
    this.existing = existing;
  }
}

export class SlugValidationError extends Error {
  constructor(message, context) {
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
export function slugifyComponent(input) {
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
 *   - 'YYYY-MM-DD' (returns as-is)
 *   - ISO timestamp ('2026-06-11T00:00:00Z', etc.)
 *   - Date object
 * Returns null on any parse failure.
 */
export function normalizeDate(input) {
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
/* Team slug resolution                                               */
/* ------------------------------------------------------------------ */

/**
 * Look up a team's clean slug from the teams table.
 * Returns null if the team_id is missing or the team doesn't exist.
 *
 * Uses the supabase client passed in. The caller decides whether to use
 * supabase (anon, RLS-enforced) or supabaseAdmin (server-only, no RLS).
 *
 * This is a one-row lookup — small and cheap.
 */
export async function lookupTeamSlug(sb, teamId) {
  if (!teamId) return null;
  try {
    const { data, error } = await sb
      .from('teams')
      .select('slug, name')
      .eq('id', teamId)
      .maybeSingle();
    if (error || !data) return null;
    return data.slug || null;
  } catch (e) {
    console.error('[lookupTeamSlug] failed:', e);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Slug assembly                                                      */
/* ------------------------------------------------------------------ */

/**
 * Build a post slug from a highlight + team IDs.
 *
 * @param {Object} args
 * @param {string} [args.homeTeamSlug]  - the clean team slug (e.g. "carolina-hurricanes")
 * @param {string} [args.homeTeamName]  - raw team name (e.g. "Carolina Hurricanes")
 * @param {string} [args.awayTeamSlug]  - the clean team slug
 * @param {string} [args.awayTeamName]  - raw team name
 * @param {string|Date} args.gameDate   - the game date (any format we can parse)
 *
 * @returns {Object}
 *   {
 *     slug: string,             // e.g. "carolina-hurricanes-vegas-golden-knights-2026-06-11"
 *     source: 'team-slug' | 'raw-name',
 *     warnings: string[]        // human-readable warnings about fallback usage
 *   }
 *
 * Throws SlugValidationError if any required field is missing or unparseable.
 */
export function buildSlug({
  homeTeamSlug,
  homeTeamName,
  awayTeamSlug,
  awayTeamName,
  gameDate,
}) {
  const warnings = [];

  // 1. Resolve home slug.
  let home;
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
  let away;
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
  const source = (homeTeamSlug && awayTeamSlug) ? 'team-slug' : 'raw-name';

  return { slug, source, warnings };
}

/* ------------------------------------------------------------------ */
/* Collision check                                                    */
/* ------------------------------------------------------------------ */

/**
 * Check whether a slug is already in use on the posts table.
 * Returns the existing row (id, slug, highlight_id, published_at) or null.
 */
export async function checkSlugCollision(sb, slug) {
  try {
    const { data, error } = await sb
      .from('posts')
      .select('id, slug, highlight_id, published_at')
      .eq('slug', slug)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  } catch (e) {
    console.error('[checkSlugCollision] failed:', e);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* High-level helper: build + check + return                          */
/* ------------------------------------------------------------------ */

/**
 * Build a slug from a post row + supabase client.
 * Handles the full pipeline: team lookups, slug build, collision check.
 *
 * Used by the orchestrate insertDraft path and by the backfill script.
 *
 * @param {Object} args
 * @param {Object} args.sb        - supabase client
 * @param {string} [args.homeTeamId]
 * @param {string} [args.awayTeamId]
 * @param {string} [args.homeTeamName]
 * @param {string} [args.awayTeamName]
 * @param {string|Date} args.gameDate
 *
 * @returns {Object}
 *   {
 *     slug: string,
 *     source: 'team-slug' | 'raw-name',
 *     warnings: string[],
 *   }
 *
 * Throws SlugCollisionError if the slug is already in use.
 * Throws SlugValidationError if required fields are missing.
 */
export async function buildAndCheckSlug(sb, {
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  gameDate,
}) {
  // 1. Look up team slugs (in parallel).
  const [homeTeamSlug, awayTeamSlug] = await Promise.all([
    lookupTeamSlug(sb, homeTeamId),
    lookupTeamSlug(sb, awayTeamId),
  ]);

  // 2. Build.
  const built = buildSlug({
    homeTeamSlug,
    homeTeamName,
    awayTeamSlug,
    awayTeamName,
    gameDate,
  });

  // 3. Check collision.
  const existing = await checkSlugCollision(sb, built.slug);
  if (existing) {
    throw new SlugCollisionError(built.slug, existing);
  }

  return built;
}
