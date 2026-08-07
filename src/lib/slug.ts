// src/lib/slug.ts
//
// Utility for generating URL-safe slugs from titles.
// Used by events + division naming (WS17 PR1).
//
// Rules (slugify v1):
//   - lowercase
//   - ASCII letters/digits only (no accents in v1; future: transliterate)
//   - spaces and runs of non-alnum collapse to single hyphen
//   - trim leading/trailing hyphens
//   - cap at 80 chars
//   - suffix with a short random tail if input is empty or only punctuation

const MAX_LEN = 80;

export function slugify(input: string): string {
  const lowered = input.trim().toLowerCase();
  // Replace any non-[a-z0-9] with a hyphen, then collapse
  const replaced = lowered.replace(/[^a-z0-9]+/g, '-');
  const trimmed = replaced.replace(/^-+|-+$/g, '');
  if (!trimmed) return 'event';
  if (trimmed.length <= MAX_LEN) return trimmed;
  return trimmed.slice(0, MAX_LEN).replace(/-+$/g, '');
}

/**
 * Generate a unique slug for a given table column. Caller passes a check
 * function that returns true if the slug is already taken; the helper
 * appends -2, -3, ... until the check returns false. Bounded to 20 attempts.
 *
 * Used by the events POST handler to avoid clashing with sibling events
 * at the same rink (collab candidates), even though rink_events.slug is a
 * database-level UNIQUE — the database itself enforces the dedupe at insert,
 * we just produce a friendlier first-attempt.
 */
export async function uniqueSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  let candidate = slugify(base);
  for (let attempt = 1; attempt <= 20; attempt++) {
    if (!(await isTaken(candidate))) return candidate;
    candidate = `${slugify(base)}-${attempt + 1}`;
  }
  // Fall back to deterministic suffix if the table is somehow dense
  return `${slugify(base)}-${Date.now().toString(36).slice(-4)}`;
}
