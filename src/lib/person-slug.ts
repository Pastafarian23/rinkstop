/**
 * src/lib/person-slug.ts
 *
 * THE canonical derivation of a person's public profile slug.
 *
 * WHY THIS IS ITS OWN MODULE (2026-11-12)
 *   Requirement 3: "Stable person URLs: deterministic, collision-safe,
 *   readable name-based persons.slug and public_id; stable unique suffixes
 *   when needed; NEVER derive identity URLs from mutable team, role, or
 *   nationality data."
 *
 *   The Phase 3 backfill broke name collisions with a tail taken from the
 *   person's own SOURCE SLUG — and a source slug carries a TEAM SUFFIX
 *   (`darcy-kuemper-lak`, `pavel-dorofeyev-vgk`, `marco-rossi-min`). So
 *   829 live URLs were derived from mutable roster data. That is the defect
 *   this module replaces.
 *
 * THE RULE
 *   base = the person's NAME (first + last, else display_name),
 *          accent-folded (Stützle → Stutzle), lower-cased,
 *          non-alphanumerics collapsed to one hyphen, ends trimmed.
 *
 *   slug = base                                       when the base is UNIQUE
 *        = base + '-' + md5(origin_key)[0:6]           when the name collides
 *        = base + '-' + md5(origin_key)[0:12]          (next candidate)
 *        = base + '-' + md5(origin_key)                (last candidate)
 *
 *   ONLY A CONTESTED BASE GETS A SUFFIX. A name that nobody else claims
 *   keeps its clean readable slug. (An earlier version reserved EVERY base
 *   up front, which gave 6,505 unique players a pointless hash suffix.)
 *
 *   `origin_key` is the source namespace + the source row's immutable
 *   primary key (`rinkstop_players:9f2c…`). It contains NO team, NO role,
 *   NO nationality, NO jersey. It is the record's IDENTITY, not its current
 *   state — so the URL cannot change when the person changes teams.
 *
 * ORDERING INSIDE A SAME-NAME GROUP
 *   1. A SURVIVOR of a merge comes first. The surviving canonical URL must
 *      be the READABLE one, and the merged-away person's own name path then
 *      resolves to the survivor — which is exactly requirement 1
 *      ("obsolete person-profile paths redirect to the surviving canonical
 *      URL") without needing a separate alias.
 *   2. Then `origin_key` ascending.
 *   3. Then the person id.
 *
 *   All three are immutable, so the whole derivation is reproducible from
 *   the data alone, on every environment, for ever.
 *
 * ACCENT FOLDING
 *   The earlier rule STRIPPED accented characters, so "Tim Stützle" became
 *   `tim-st-tzle` — a URL that mis-spells a real person's name. Folding
 *   keeps the name readable: `tim-stutzle`.
 *
 * THIS MODULE IS THE REFERENCE IMPLEMENTATION
 *   The SQL migration `2026-11-12_person_identity_phase3c_stable_slugs.sql`
 *   performs the same derivation in the database. Gate 24
 *   (`scripts/_audit-unified-profile.mjs`) recomputes every slug with THIS
 *   module and compares — so the two implementations cannot drift without
 *   the gate failing.
 */

import { createHash } from 'node:crypto';

/** Accent → ASCII folding. 1:1 replacements, plus the few expansions. */
const ACCENT_MAP: Record<string, string> = {
  Ä: 'A', Ö: 'O', Ü: 'U', É: 'E', Á: 'A', Å: 'A', È: 'E', Ý: 'Y', Ë: 'E',
  Ú: 'U', Ÿ: 'Y', Ç: 'C', Ñ: 'N', Î: 'I', Ô: 'O', Û: 'U', Â: 'A', Ê: 'E',
  Ã: 'A', Õ: 'O', Ì: 'I', Ò: 'O', Ù: 'U', Í: 'I',
  ä: 'a', ö: 'o', ü: 'u', é: 'e', á: 'a', å: 'a', è: 'e', ý: 'y', ë: 'e',
  ú: 'u', ÿ: 'y', ç: 'c', ñ: 'n', î: 'i', ô: 'o', û: 'u', â: 'a', ê: 'e',
  ã: 'a', õ: 'o', ì: 'i', ò: 'o', ù: 'u', í: 'i',
  æ: 'ae', Æ: 'AE', œ: 'oe', Œ: 'OE', ß: 'ss', ð: 'd', Ð: 'D', þ: 'th', Þ: 'TH',
};

/** Fold accented characters to their ASCII base letters. */
export function foldAccents(value: string): string {
  return value.replace(/[^\x00-\x7F]/g, (ch) => ACCENT_MAP[ch] ?? ch);
}

/**
 * The NAME slug for a person: accent-folded, lower-cased, non-alphanumerics
 * collapsed to a single hyphen, ends trimmed.
 */
export function nameBase(
  firstName: string | null,
  lastName: string | null,
  displayName: string | null,
): string {
  const name =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    (displayName ?? '').trim();
  return foldAccents(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/** A short, stable hash of the person's immutable origin key. */
export function originHash(originKey: string): string {
  return createHash('md5').update(String(originKey)).digest('hex');
}

/**
 * The candidate slugs for one person, in preference order.
 *
 * The first candidate that is not already taken becomes the slug. Every
 * candidate is derived from the NAME plus the origin-key hash — never from
 * mutable team / role / nationality data.
 */
export function slugCandidates(base: string, originKey: string): string[] {
  const h = originHash(originKey);
  return [
    base,
    `${base}-${h.slice(0, 6)}`,
    `${base}-${h.slice(0, 12)}`,
    `${base}-${h}`,
  ];
}

/**
 * TEST / FIXTURE identifiers must never become public URL names.
 *
 * The patterns match a fixture WORD as a whole segment, so a real name
 * like 'Testosterone' or 'Demolition Crew' is not affected.
 */
export function isFixtureSlug(slug: string): boolean {
  return (
    /(^|-)(test|testing|demo|dummy|sample|fixture|fake|placeholder|lorem)(-[0-9a-z]+)*$/.test(slug) ||
    /(^|-)(fanout|qa)(-[0-9a-z]+)*$/.test(slug) ||
    /^user-[0-9a-f]{20,}$/.test(slug) ||
    // The opaque handle Phase 3 assigned to fixture people.
    /^p-[0-9a-f]{12}$/.test(slug)
  );
}

/** The opaque, non-descriptive handle used for fixture people. */
export function opaqueSlug(personId: string): string {
  return `p-${createHash('md5').update(String(personId)).digest('hex').slice(0, 12)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// The full assignment
// ─────────────────────────────────────────────────────────────────────────────

export interface SlugCandidate {
  id: string;
  originKey: string;
  base: string;
  /** True when this person is the survivor of a merge. */
  isSurvivor: boolean;
}

export interface SlugAssignmentInput {
  candidates: SlugCandidate[];
  /**
   * Paths that are already taken and must never be handed out: account
   * usernames, and the slugs of persons that are OUT OF SCOPE (fixture
   * people and account-only people, whose canonical URL is the account URL).
   */
  reserved: Set<string>;
}

/**
 * Assign a slug to every candidate, deterministically.
 *
 * The algorithm, in order:
 *   1. Group the candidates by base.
 *   2. A base that only ONE candidate claims is uncontested — that person
 *      keeps the clean, readable name. Only CONTESTED bases (two or more
 *      candidates) have to give up their bare base to the first member of
 *      the group.
 *   3. Walk the groups in base order; inside a group, walk the members by
 *      (survivor first, then origin_key, then id).
 *   4. Each member takes the first candidate slug that is free.
 *
 * Step 2 matters. If every base were reserved up front, then even a name
 * nobody shares would lose its clean base to the hash ladder, and 10,000+
 * unique players would get `-4b5268` style suffixes for no reason. Only
 * contested bases need a suffix.
 *
 * Every input is immutable, so the result is identical on every run, in
 * every environment, forever.
 */
export function assignPersonSlugs(input: SlugAssignmentInput): Map<string, string> {
  const { candidates, reserved } = input;
  const assigned = new Map<string, string>();

  const groups = new Map<string, SlugCandidate[]>();
  for (const c of candidates) {
    if (!c.base) continue;
    if (!groups.has(c.base)) groups.set(c.base, []);
    groups.get(c.base)!.push(c);
  }

  const taken = new Set<string>(reserved);

  const bases = Array.from(groups.keys()).sort();
  for (const base of bases) {
    const members = groups.get(base)!.slice().sort((a, b) => {
      if (a.isSurvivor !== b.isSurvivor) return a.isSurvivor ? -1 : 1;
      if (a.originKey !== b.originKey) return a.originKey < b.originKey ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });

    const contested = members.length > 1;

    for (const member of members) {
      const candidatesForMember = slugCandidates(base, member.originKey);
      let pick: string | null = null;
      for (const c of candidatesForMember) {
        if (contested && c === base) {
          // The bare base is the group's most valuable slug. Only the
          // FIRST member of a contested group may take it.
          if (member !== members[0]) continue;
        }
        if (!taken.has(c)) {
          pick = c;
          break;
        }
      }
      if (!pick) pick = `${base}-${originHash(member.originKey)}`;
      taken.add(pick);
      assigned.set(member.id, pick);
    }
  }

  return assigned;
}
