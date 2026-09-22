/**
 * Auto-links team, league, and rink names within blog post content.
 * Scans text for name mentions (case-insensitive) and wraps them in anchor tags.
 * Skips any mentions already inside an <a> tag.
 *
 * 2026-09-12 WS26 quality pass: added stopword filter + occurrence threshold
 * + long-form league disambiguation. See scripts/_autolink-audit.mjs for the
 * dry-run that motivated this. Arnel explicitly flagged 100% accuracy as the
 * gating concern for #1 (news article auto-linking).
 *
 * Quality gates (in priority order, applied per-article):
 *   1. Skip names that are in the STOPWORDS list (countries, league acronyms,
 *      generic English words that happen to match DB entity names).
 *   2. Only link entities that appear at least MIN_OCCURRENCES times in the
 *      article body (per Arnel directive — avoids 1-time mention false positives).
 *   3. Long-form league names (e.g. "American Hockey League") are dropped if
 *      the short form (e.g. "AHL") is also present in the body — users search
 *      the acronym, not the expansion.
 *
 * Cache invalidation: module-level cache in FullArticle.tsx is keyed by entity
 * name + threshold version. Bump AUTOLINK_VERSION to force a refresh.
 */

interface NamedEntity {
  name: string;
  slug: string;
  _fullNameLength?: number; // 2026-09-22: populated for short-name aliases so colliders pick the more-specific match
}

interface AutolinkOptions {
  teams: NamedEntity[];
  leagues: NamedEntity[];
  rinks: NamedEntity[];
}

type EntityWithType = NamedEntity & { type: 'team' | 'rink' | 'league' };

// Bump this when changing the algorithm — FullArticle's cache key includes it.
export const AUTOLINK_VERSION = 'v5-2026-09-22-paginated-entity-fetch';

// 2026-09-12: stopword list. Every entry here is a known false positive that
// the dry-run audit surfaced. Add new ones here as they're discovered.
//
// League acronyms (AHL, WHL, USHL, etc.) are NOT in the stopword list —
// they're filtered by the MIN_OCCURRENCES threshold instead. An article
// that uses "AHL" once in passing won't link (occurrence < 2); an article
// that's actually about the AHL uses the acronym multiple times and DOES
// link. This is the correct gate for acronym-vs-prose disambiguation.
const STOPWORDS = new Set<string>([
  // Generic English words that happen to match DB team names
  'sport', 'gap', 'aware', 'stars', 'wild', 'panthers', 'kings',
  'ducks', 'jets', 'sharks', 'kraken', 'bruins', 'sabres', 'flames',
  'oilers', 'predators', 'saints', 'vikings', 'warriors', 'wolves',
  // Country names — prose uses them, not as national-team references
  'canada', 'usa', 'finland', 'sweden', 'russia', 'slovakia', 'latvia',
  'germany', 'denmark', 'norway', 'switzerland', 'czechia', 'austria',
  'japan', 'china', 'kazakhstan', 'france', 'italy', 'poland', 'uk',
  // State / province / city names commonly in prose
  'york', 'vermont', 'hampshire', 'windsor', 'moncton',
  // Generic hockey words that match league names
  'championship', 'classic',
  // The lone country/region word that ALSO matches a league row exactly
  'ncaa', // "Ncaa" is uncommon in prose, and 'ncaa-usa' is the only DB slug
]);

// 2026-09-12: occurrence threshold per Arnel directive — "only auto-link
// entities that appear ≥2 times in the article". Catches the "1-time
// mention" false positive class (Canada appearing once in a long article).
const MIN_OCCURRENCES = 2;

// 2026-09-12: long-form league names that should be dropped when the short
// form is also present. Articles using "AHL" 5 times and "American Hockey
// League" once shouldn't link the long form.
const LONG_FORM_LEAGUES = new Map<string, string>([
  ['American Hockey League', 'AHL'],
  ['Ontario Hockey League', 'OHL'],
  ['Western Hockey League', 'WHL'],
  ['Quebec Major Junior Hockey League', 'QMJHL'],
  ['United States Hockey League', 'USHL'],
  ['Kontinental Hockey League', 'KHL'],
  ['Professional Women\'s Hockey League', 'PWHL'],
  ['International Ice Hockey Federation', 'IIHF'],
  ['IIHF World Championship', 'IIHF Worlds'],
]);

/**
 * Converts plain text mentions into links pointing to the appropriate directory page.
 * Names are sorted longest-first to avoid partial replacements.
 * Existing anchor tags are preserved.
 */
export function autolinkContent(
  text: string,
  teams: NamedEntity[],
  leagues: NamedEntity[],
  rinks: NamedEntity[],
): string {
  // 2026-09-22: add short-name aliases for teams (e.g. 'Flyers' for
  // 'Philadelphia Flyers'). Only added when the last word of the full
  // name is unique enough not to collide with single-word teams. The
  // aliases are duplicates in the sense they point at the same slug,
  // but they let 'Philadelphia' or 'Washington' in prose resolve to
  // their full team. NOTE: this changes matching for ALL teams, so
  // MIN_OCCURRENCES still gates per-entity (per Arnel's prior
  // directive). Without that gate, 'the' would link everywhere.
  const teamsWithAliases = [...teams, ...buildShortNameAliases(teams)];

  // Combine and tag all entities with their type
  const entities: EntityWithType[] = [
    ...teamsWithAliases.map(t => ({ ...t, type: 'team' as const })),
    ...leagues.map(l => ({ ...l, type: 'league' as const })),
    ...rinks.map(r => ({ ...r, type: 'rink' as const })),
  ];

  if (entities.length === 0) return text;

  // Filter stopwords before sorting (cheaper, smaller list to sort)
  const filteredEntities = entities.filter(e => !STOPWORDS.has(e.name.toLowerCase()));

  // Drop long-form league names whose short form is also present
  const strippedHtml = text.replace(/<[^>]*>/g, ' ');
  const longFormFiltered = filteredEntities.filter(e => {
    if (e.type !== 'league') return true;
    const short = LONG_FORM_LEAGUES.get(e.name);
    if (!short) return true;
    // If the short form appears in the body, skip the long form link
    const shortRe = new RegExp(`\\b${escapeRegex(short)}\\b`, 'i');
    return !shortRe.test(strippedHtml);
  });

  // Compute occurrence count per entity in the stripped body
  const occurrences = new Map<string, number>();
  for (const e of longFormFiltered) {
    const k = e.name + '|' + e.type + '|' + e.slug;
    if (occurrences.has(k)) continue;
    const re = new RegExp(`\\b${escapeRegex(e.name)}\\b`, 'gi');
    const matches = strippedHtml.match(re) || [];
    occurrences.set(k, matches.length);
  }

  // Apply occurrence threshold
  const thresholdFiltered = longFormFiltered.filter(e => {
    const k = e.name + '|' + e.type + '|' + e.slug;
    return (occurrences.get(k) || 0) >= MIN_OCCURRENCES;
  });

  if (thresholdFiltered.length === 0) return text;

  // Sort by name length descending so longer names are matched first (avoids partial matches)
  thresholdFiltered.sort((a, b) => b.name.length - a.name.length);

  // Build a combined pattern that matches any entity name (case-insensitive)
  // Using word boundary \b so we match whole words only
  const patterns = thresholdFiltered.map(e => `\\b${escapeRegex(e.name)}\\b`);
  const combinedPattern = new RegExp(`(${patterns.join('|')})`, 'gi');

  // Split the text on existing <a>...</a> blocks so we never modify them
  const parts = text.split(/(<a\b[^>]*>[\s\S]*?<\/a>)/gi);

  return parts.map((part, i) => {
    // Odd-index parts are existing anchor tags — pass them through untouched
    if (i % 2 === 1) return part;

    return part.replace(combinedPattern, match => {
      // 2026-09-22: when multiple entities match (e.g. short-name alias
      // collision — 'Flyers' matches both Philadelphia and Nazareth),
      // prefer the one whose full entity name is longer / more specific.
      const candidates = thresholdFiltered.filter(e => e.name.localeCompare(match, undefined, { sensitivity: 'base' }) === 0);
      const entity = candidates.length > 1
        ? candidates.reduce((a, b) => ((b._fullNameLength || b.name.length) > (a._fullNameLength || a.name.length) ? b : a))
        : candidates[0];
      if (!entity) return match;

      const href = `/directory/${entity.type}s/${entity.slug}`;
      return `<a href="${href}" style="color: var(--red); text-decoration: underline; text-underline-offset: 2px;">${match}</a>`;
    });
  }).join('');
}

// 2026-09-22 per Arnel 10:47 CDT: article body uses short forms
// ("Philadelphia", "Washington") but entities are full names
// ("Philadelphia Flyers", "Washington Capitals"). Add short-name
// aliases for teams so common prose mentions resolve. Each alias
// points at the same slug as its parent entity. Generated at
// autolink-time from the teams[] input — no separate config.
//
// 2026-09-22 audit fix: only generate aliases when the last word is
// UNIQUE across the active team list. Without this guard, "Flyers"
// became an alias for all 4 Flyers-named teams (Philadelphia,
// Nazareth, Pensacola, Fife) and the alphabetical-first-match picked
// Fife Flyers. "Capitals" aliased to all 6 Capitals teams and picked
// Cowichan Valley Capitals. Both wrong for the actual article context.
// After this guard, only unambiguous last-words get aliases.
function buildShortNameAliases(teams: NamedEntity[]): NamedEntity[] {
  // First pass: count how many teams have each last word.
  const lastWordCount = new Map<string, number>();
  for (const t of teams) {
    const parts = t.name.split(/\s+/);
    if (parts.length < 2) continue;
    const last = parts[parts.length - 1];
    if (last.length < 4) continue;
    const key = last.toLowerCase();
    lastWordCount.set(key, (lastWordCount.get(key) || 0) + 1);
  }
  const out: any[] = [];
  const seen = new Set<string>();
  for (const t of teams) {
    const parts = t.name.split(/\s+/);
    if (parts.length < 2) continue;
    const last = parts[parts.length - 1];
    if (last.length < 4) continue;
    // Only emit alias when this last word is UNIQUE among active teams.
    if ((lastWordCount.get(last.toLowerCase()) || 0) > 1) continue;
    const alias = last;
    const key = alias.toLowerCase() + '|' + t.slug;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: alias, slug: t.slug, _fullNameLength: t.name.length });
  }
  return out as NamedEntity[];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}