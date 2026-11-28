/**
 * Single source of truth for the 12 PWHL franchises and their URLs.
 *
 * Facts: thepwhl.com (FAQ and the 2026-27 schedule announcement, 2026-10-02) lists
 * 12 teams, uses /en/teams/{slug} with exactly these slugs, and places six teams in
 * each conference. RinkStop team pages live at /directory/teams/{slug}.
 *
 * The team table currently holds duplicate and placeholder rows for these
 * franchises (see PWHL_CONSOLIDATED_PLAN.md). The alias list below maps every known
 * legacy slug to its franchise so old links can be redirected permanently once the
 * canonical page is publicly viewable.
 *
 * Rows such as "seattle-storm" (a basketball team) and "minnesota-whitecaps" (a
 * separate historic club) are deliberately NOT aliases: matching by name would
 * merge unrelated teams.
 */
import { supabaseAdmin } from '@/lib/supabase';

export type PwhlFranchise = {
  slug: string;
  name: string;
  city: string;
  country: 'US' | 'CA';
  conference: 'Eastern' | 'Western';
  aliases: string[];
};

export const PWHL_FRANCHISES: readonly PwhlFranchise[] = [
  { slug: 'boston-fleet', name: 'Boston Fleet', city: 'Boston', country: 'US', conference: 'Eastern', aliases: ['boston-fleet-pwhl', 'pwhl-boston-fleet', 'pwhl-boston-women'] },
  { slug: 'hamilton-havoc', name: 'Hamilton Havoc', city: 'Hamilton', country: 'CA', conference: 'Eastern', aliases: ['pwhl-hamilton'] },
  { slug: 'montreal-victoire', name: 'Montréal Victoire', city: 'Montréal', country: 'CA', conference: 'Eastern', aliases: ['montréal-victoire', 'montreal-victo', 'pwhl-montreal-victoire', 'pwhl-montreal-women'] },
  { slug: 'new-york-sirens', name: 'New York Sirens', city: 'New York', country: 'US', conference: 'Eastern', aliases: ['new-york-sirens-pwhl', 'pwhl-new-york-sirens', 'pwhl-new-york-women'] },
  { slug: 'ottawa-charge', name: 'Ottawa Charge', city: 'Ottawa', country: 'CA', conference: 'Eastern', aliases: ['ottawa-charge-pwhl', 'pwhl-ottawa-charge', 'pwhl-ottawa-women'] },
  { slug: 'toronto-sceptres', name: 'Toronto Sceptres', city: 'Toronto', country: 'CA', conference: 'Eastern', aliases: ['toronto-pwhl', 'toronto-sceptres-pwhl', 'pwhl-toronto-sceptres', 'pwhl-toronto-women'] },
  { slug: 'detroit-clutch', name: 'Detroit Clutch', city: 'Detroit', country: 'US', conference: 'Western', aliases: ['pwhl-detroit'] },
  { slug: 'minnesota-frost', name: 'Minnesota Frost', city: 'Saint Paul', country: 'US', conference: 'Western', aliases: ['pwhl-minnesota-frost', 'pwhl-minnesota-women'] },
  { slug: 'san-jose-sea-lions', name: 'San Jose Sea Lions', city: 'San Jose', country: 'US', conference: 'Western', aliases: ['pwhl-san-jose'] },
  { slug: 'seattle-torrent', name: 'Seattle Torrent', city: 'Seattle', country: 'US', conference: 'Western', aliases: ['pwhl-seattle-torrent'] },
  { slug: 'vancouver-goldeneyes', name: 'Vancouver Goldeneyes', city: 'Vancouver', country: 'CA', conference: 'Western', aliases: ['pwhl-vancouver'] },
  { slug: 'vegas-vanguards', name: 'Vegas Vanguards', city: 'Las Vegas', country: 'US', conference: 'Western', aliases: ['pwhl-las-vegas'] },
];

const CANONICAL = new Set(PWHL_FRANCHISES.map((f) => f.slug));
const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const f of PWHL_FRANCHISES) for (const a of f.aliases) ALIAS_TO_CANONICAL.set(a, f.slug);

/**
 * PostgREST value for .not('slug', 'in', ...) that excludes every known legacy PWHL
 * alias slug (25). Public listings use it so duplicate rows do not compete with the 12
 * canonical franchise pages. Built from the registry, never from display names, so
 * unrelated clubs (e.g. seattle-storm, minnesota-whitecaps) are untouched.
 */
export const PWHL_ALIAS_SLUGS: readonly string[] = PWHL_FRANCHISES.flatMap((f) => f.aliases);
export const PWHL_ALIAS_NOT_IN: string = '(' + PWHL_ALIAS_SLUGS.map((a) => '"' + a + '"').join(',') + ')';

export function isPwhlCanonicalSlug(slug: string): boolean {
  return CANONICAL.has(slug);
}

/** The canonical slug this legacy slug belongs to, or null if it is not a known alias. */
export function pwhlCanonicalForAlias(slug: string): string | null {
  return ALIAS_TO_CANONICAL.get(slug) ?? null;
}

export function isPwhlAliasSlug(slug: string | null | undefined): boolean {
  return !!slug && ALIAS_TO_CANONICAL.has(slug);
}

/**
 * Where a legacy slug should be permanently redirected, or null.
 *
 * It redirects only when the canonical page is publicly viewable (row exists, is
 * active and is public). Until then the legacy page keeps working as before, so no
 * existing link turns into a 404 and a private team is never revealed. A canonical
 * slug never redirects, so a redirect loop is impossible.
 */
export async function pwhlAliasRedirectTarget(slug: string): Promise<string | null> {
  const canonical = pwhlCanonicalForAlias(slug);
  if (!canonical || canonical === slug) return null;
  try {
    const { data } = await supabaseAdmin
      .from('team_workspaces')
      .select('id')
      .eq('slug', canonical)
      .eq('is_active', true)
      .eq('visibility', 'public')
      .maybeSingle();
    return data ? canonical : null;
  } catch {
    return null;
  }
}


/**
 * TEMPORARY stopgap, delete after the Montreal data decision (PWHL_CONSOLIDATED_PLAN.md,
 * Phase 2). Until the canonical Montreal row is publicly viewable, its canonical URL
 * would 404 although a working page exists. The site previously redirected
 * /directory/teams/montreal-victoire to montreal-victo (a static rule in next.config.js).
 * That static rule is removed because a canonical slug must never redirect once its
 * page is public (it would loop with the alias redirect). This keeps the same behaviour
 * with a TEMPORARY (307) redirect that applies only while the canonical page is not public.
 */
export const PWHL_TEMPORARY_FALLBACK: Readonly<Record<string, string>> = { 'montreal-victoire': 'montreal-victo' };

export async function pwhlTemporaryFallbackTarget(slug: string): Promise<string | null> {
  const fallback = PWHL_TEMPORARY_FALLBACK[slug];
  if (!fallback) return null;
  try {
    const { data } = await supabaseAdmin
      .from('team_workspaces')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .eq('visibility', 'public')
      .maybeSingle();
    return data ? null : fallback;
  } catch {
    return null;
  }
}

type RowLike = { id: string; name: string; slug?: string | null };

/**
 * Exactly one listing per franchise, linked by its canonical slug.
 * Prefers the row that already carries the canonical slug, then any alias row.
 * A franchise with no publicly readable row is still listed (from the registry),
 * because the league has 12 teams regardless of how many rows the table holds.
 */
export function normalizePwhlTeams<T extends RowLike>(rows: readonly T[]): Array<T | (RowLike & { city: string; country: string })> {
  const bySlug = new Map<string, T>();
  for (const r of rows) if (r.slug) bySlug.set(r.slug, r);
  return PWHL_FRANCHISES.map((f) => {
    const row = bySlug.get(f.slug) ?? f.aliases.map((a) => bySlug.get(a)).find(Boolean);
    if (row) return { ...row, slug: f.slug, name: f.name };
    return { id: 'pwhl:' + f.slug, name: f.name, slug: f.slug, city: f.city, country: f.country };
  });
}
