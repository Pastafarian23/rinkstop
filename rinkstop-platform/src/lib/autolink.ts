/**
 * Auto-links team, league, and rink names within blog post content.
 * Scans text for name mentions (case-insensitive) and wraps them in anchor tags.
 * Skips any mentions already inside an <a> tag.
 */

interface NamedEntity {
  name: string;
  slug: string;
}

interface AutolinkOptions {
  teams: NamedEntity[];
  leagues: NamedEntity[];
  rinks: NamedEntity[];
}

type EntityWithType = NamedEntity & { type: 'team' | 'rink' | 'league' };

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
  // Combine and tag all entities with their type
  const entities: EntityWithType[] = [
    ...teams.map(t => ({ ...t, type: 'team' as const })),
    ...leagues.map(l => ({ ...l, type: 'league' as const })),
    ...rinks.map(r => ({ ...r, type: 'rink' as const })),
  ];

  if (entities.length === 0) return text;

  // Sort by name length descending so longer names are matched first (avoids partial matches)
  entities.sort((a, b) => b.name.length - a.name.length);

  // Escape special regex chars in a string
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Build a combined pattern that matches any entity name (case-insensitive)
  // Using word boundary \b so we match whole words only
  const patterns = entities.map(e => `\\b${escapeRegex(e.name)}\\b`);
  const combinedPattern = new RegExp(`(${patterns.join('|')})`, 'gi');

  // Split the text on existing <a>...</a> blocks so we never modify them
  const parts = text.split(/(<a\b[^>]*>[\s\S]*?<\/a>)/gi);

  return parts.map((part, i) => {
    // Odd-index parts are existing anchor tags — pass them through untouched
    if (i % 2 === 1) return part;

    return part.replace(combinedPattern, match => {
      // Find the first entity whose name matches (case-insensitive)
      const entity = entities.find(e => e.name.localeCompare(match, undefined, { sensitivity: 'base' }) === 0);
      if (!entity) return match;

      const href = `/directory/${entity.type}s/${entity.slug}`;
      return `<a href="${href}" style="color: var(--red); text-decoration: underline; text-underline-offset: 2px;">${match}</a>`;
    });
  }).join('');
}