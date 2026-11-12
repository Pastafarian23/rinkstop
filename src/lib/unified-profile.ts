/**
 * src/lib/unified-profile.ts
 *
 * THE resolver for the unified public person profile.
 *
 * WHY THIS EXISTS (2026-11-12, Arnel-approved):
 *   RinkStop has one central identity table (`persons`) that unifies six
 *   legacy person namespaces (`players`, `nhl_players`, `nhl_coaching_staff`,
 *   `team_members`, `coach_profiles`, `profiles_account`) plus the 38 merged
 *   identities from Phase 2C. Until now NOTHING read it — every public page
 *   resolved a person directly out of its own legacy table.
 *
 *   This module is the ONE place that answers "who is this person, and what
 *   do they have on RinkStop". Per the rule that fixed the coach-page bug
 *   (src/lib/staff-record.ts): a page and an API rendering the same entity
 *   must share ONE loader, or they drift, and the copy that drifts is the one
 *   that breaks.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RESOLUTION ORDER (requirement 2 — account URLs are protected)
 *
 *   1. `profiles.username`  → ACCOUNT PROFILE
 *      The existing behavior, unchanged. Every current /profile/<username>
 *      URL keeps its exact rendering, metadata and canonical.
 *
 *   2. `person_aliases.path` → UNIFIED PERSON PROFILE
 *      Reached only when step 1 misses. An alias can therefore NEVER
 *      override an account URL — the account check runs first, and the
 *      Phase 3 backfill also refuses to generate an alias that collides
 *      with a `profiles.username`.
 *
 *   3. nothing → 404
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MERGED IDENTITIES (requirement 1)
 *
 *   A merged-away person (`identity_state='merged'`) holds NO canonical
 *   profile. It has a `canonical_person_id` pointer to the survivor, and the
 *   survivor holds BOTH of the pair's source rows and BOTH of the pair's
 *   role rows. So:
 *
 *     - One merged pair ⇒ ONE canonical profile with TWO source records.
 *     - The merged-away person's own name path is registered as a NON-
 *       canonical alias pointing at the SURVIVOR, so an old URL 301s to the
 *       surviving canonical URL instead of 404ing.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PAGINATION (mandatory)
 *
 *   PostgREST caps every response at 1,000 rows. `person_sources` is 11,443
 *   rows and `person_roles` is 11,424. An unpaginated read silently
 *   truncates, and a truncation looks like a plausible small number — that
 *   is how 445 "missing" teams and a 999-of-2,649 sitemap happened. Every
 *   read of these tables below paginates with `.range()`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PUBLIC DATA ONLY
 *
 *   Nothing in this module reads contact details. `persons` carries no
 *   email or phone, and the source tables are read through narrow column
 *   lists that exclude `email`, `phone`, `google_phone`, `contact_email`
 *   and friends. A public profile must never surface a private contact.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FEATURE FLAG
 *
 *   `isPersonIdentityEnabled()` gates the whole person branch. With the flag
 *   off, `resolveProfileSlug()` returns the account result or null, and the
 *   /profile/<slug> route behaves exactly as it did before this feature.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { isPersonIdentityEnabled } from '@/lib/person-identity';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type UnifiedRoleType = 'player' | 'coach' | 'official' | 'scout' | 'staff' | 'executive' | 'referee';

/** A source record the person owns, with its public row. */
export interface UnifiedSourceRecord {
  /** The source namespace, e.g. 'rinkstop_players'. */
  source: string;
  /** The original primary key of the source row, as TEXT. */
  sourceId: string;
  /** The source row's own slug, when it has one. */
  slug: string | null;
  /** The source row's display name. */
  name: string | null;
  /** The public path this record is reachable at, when one exists. */
  href: string | null;
  /** Whether the record is marked as merged into this person. */
  mergedAt: string | null;
  /** Public, non-contact attributes worth showing (position, jersey, team…). */
  facts: Array<{ label: string; value: string }>;
}

/** One role the person holds. */
export interface UnifiedRole {
  id: string;
  roleType: UnifiedRoleType;
  roleDetail: string | null;
  teamId: string | null;
  leagueId: string | null;
  season: string | null;
  jerseyNumber: string | null;
  position: string | null;
  /** The source namespace the role came from. */
  source: string;
  sourceId: string;
  /** The public path for this role's directory page, when one exists. */
  href: string | null;
  /** The role's display name (from the source record). */
  name: string | null;
  /** The team name, when the role carries one. */
  teamName: string | null;
  /** The league name, when the role carries one. */
  leagueName: string | null;
}

export interface UnifiedPerson {
  /** The central person UUID. */
  id: string;
  /** The canonical profile slug (survivors only). */
  slug: string | null;
  /** The stable public handle. */
  publicId: string | null;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  nationality: string | null;
  identityState: string;
  /** The photo URL, taken from the person's source records. */
  photoUrl: string | null;
  /** Every source record the person owns. */
  sources: UnifiedSourceRecord[];
  /** Every role the person holds. */
  roles: UnifiedRole[];
  /** The canonical public path for this person. */
  canonicalPath: string;
  /** True when this person has an account (a `profiles` row). */
  hasAccount: boolean;
  /** The account username, when the person has one. */
  accountUsername: string | null;
}

/** An account profile, as the existing /profile/[slug] page already renders it. */
export interface UnifiedAccountProfile {
  kind: 'account';
  userId: string;
  username: string;
  displayName: string | null;
}

export type ProfileResolution =
  | { kind: 'account'; account: UnifiedAccountProfile }
  | { kind: 'person'; person: UnifiedPerson }
  | null;

// ─────────────────────────────────────────────────────────────────────────────
// Pagination helper
// ─────────────────────────────────────────────────────────────────────────────

const PAGE = 1000;

/**
 * Read every row of a PostgREST query, paginating with `.range()`.
 *
 * A single unpaginated `select()` returns AT MOST 1,000 rows — with no
 * error and no warning. A count of exactly 1000 is a truncation, never a
 * size.
 */
async function fetchAll<T = any>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) {
      console.error('[unified-profile] paginated read failed', error);
      break;
    }
    const batch = data ?? [];
    out.push(...batch);
    if (batch.length < PAGE) break;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public path helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The public path for a source record, per namespace.
 *
 * These are the SAME paths that already exist today. Nothing here creates a
 * new URL shape, and `/people/` does not exist.
 */
export function publicPathForSource(source: string, sourceId: string, slug: string | null): string | null {
  switch (source) {
    case 'rinkstop_players':
      return slug ? `/directory/players/${slug}` : `/directory/players/${sourceId}`;
    case 'nhl_players':
      // NHL rows have no slug column. Their public surface today is the
      // staff detail route, which is keyed by `nhl-<numeric id>`.
      return `/directory/coaches/nhl-${sourceId}`;
    case 'nhl_coaching_staff':
      return `/directory/coaches/nhl-${sourceId}`;
    case 'team_members':
      return `/directory/coaches/team-${sourceId}`;
    case 'coach_profiles':
      return null; // no public page for this namespace today
    case 'profiles_account':
      return null; // the account URL is resolved separately, and wins
    default:
      return null;
  }
}

/** The public path for a role, per its type and source namespace. */
export function publicPathForRole(
  roleType: string,
  source: string,
  sourceId: string,
  slug: string | null,
): string | null {
  if (roleType === 'player') {
    if (source === 'rinkstop_players') {
      return slug ? `/directory/players/${slug}` : `/directory/players/${sourceId}`;
    }
    // An NHL player has no player page of their own; their staff-style
    // detail route is the closest public surface.
    if (source === 'nhl_players') return `/directory/coaches/nhl-${sourceId}`;
    return null;
  }
  if (roleType === 'coach') {
    if (source === 'nhl_players' || source === 'nhl_coaching_staff') {
      return `/directory/coaches/nhl-${sourceId}`;
    }
    if (source === 'team_members') return `/directory/coaches/team-${sourceId}`;
    if (source === 'coach_profiles') return null;
    return null;
  }
  if (roleType === 'scout') return `/directory/scouts/nhl-${sourceId}`;
  if (roleType === 'official') return `/directory/officials/nhl-${sourceId}`;
  if (roleType === 'staff' || roleType === 'executive') return `/directory/staff/nhl-${sourceId}`;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Name formatting for the source records
// ─────────────────────────────────────────────────────────────────────────────

function playerDisplayName(row: any): string | null {
  const name = [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim();
  return name || row?.display_name || row?.full_name || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// The resolver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a /profile/<slug> to either an ACCOUNT profile or a unified PERSON
 * profile.
 *
 * Account first — always. An alias can never override an account URL.
 */
export async function resolveProfileSlug(slug: string): Promise<ProfileResolution> {
  const clean = (slug ?? '').trim();
  if (!clean) return null;

  // ── 1. ACCOUNT — the existing behavior, unchanged ────────────────────────
  const { data: account, error: accountError } = await supabaseAdmin
    .from('profiles')
    .select('user_id, username, display_name')
    .ilike('username', clean)
    .maybeSingle();

  if (accountError) {
    console.error('[unified-profile] account lookup failed', accountError);
  }
  if (account) {
    return {
      kind: 'account',
      account: {
        kind: 'account' as const,
        userId: account.user_id as string,
        username: (account.username as string) ?? clean,
        displayName: (account.display_name as string) ?? null,
      },
    };
  }

  // ── 2. PERSON — only behind the feature flag ─────────────────────────────
  if (!isPersonIdentityEnabled()) return null;

  const path = `/profile/${clean}`;
  const { data: alias, error: aliasError } = await supabaseAdmin
    .from('person_aliases')
    .select('person_id, path, is_canonical, alias_type')
    .eq('path', path)
    .maybeSingle();

  if (aliasError) {
    console.error('[unified-profile] alias lookup failed', aliasError);
    return null;
  }
  if (!alias) return null;

  const person = await loadUnifiedPerson(alias.person_id as string);
  if (!person) return null;

  // An OBSOLETE alias (a merged-away person's old path) points at the
  // survivor. The caller should 301 to the survivor's canonical path.
  if (!alias.is_canonical && person.canonicalPath !== path) {
    return { kind: 'person', person: { ...person, canonicalPath: person.canonicalPath } };
  }

  return { kind: 'person', person };
}

/**
 * Load a person by its central UUID, with every source record and role.
 *
 * Returns null if the person does not exist, is merged away (a merged-away
 * person has no profile of its own — the survivor's is canonical), or the
 * load fails.
 */
export async function loadUnifiedPerson(personId: string): Promise<UnifiedPerson | null> {
  if (!personId) return null;

  const { data: person, error: personError } = await supabaseAdmin
    .from('persons')
    .select(
      'id, slug, public_id, display_name, first_name, last_name, birth_date, nationality, identity_state',
    )
    .eq('id', personId)
    .maybeSingle();

  if (personError) {
    console.error('[unified-profile] person load failed', personError);
    return null;
  }
  if (!person) return null;

  // A merged-away person is NOT a profile. Its canonical path is the
  // survivor's. This is the merged-identity rule: one person, one profile.
  if ((person as any).identity_state === 'merged') return null;

  const [sourceRows, roleRows] = await Promise.all([
    fetchAll<any>((from, to) =>
      supabaseAdmin
        .from('person_sources')
        .select('id, person_id, source, source_id, source_slug, source_name, merged_at')
        .eq('person_id', personId)
        .order('source', { ascending: true })
        .order('source_id', { ascending: true })
        .range(from, to),
    ),
    fetchAll<any>((from, to) =>
      supabaseAdmin
        .from('person_roles')
        .select(
          'id, person_id, role_type, role_detail, team_id, league_id, season, jersey_number, position, source, source_id',
        )
        .eq('person_id', personId)
        .order('role_type', { ascending: true })
        .order('source', { ascending: true })
        .range(from, to),
    ),
  ]);

  // ── Hydrate the source rows with their public, non-contact attributes ──
  const rsIds = sourceRows.filter((s) => s.source === 'rinkstop_players').map((s) => s.source_id);
  const nhlIds = sourceRows
    .filter((s) => s.source === 'nhl_players' || s.source === 'nhl_coaching_staff')
    .map((s) => s.source_id)
    .filter((v, i, a) => a.indexOf(v) === i);
  const tmIds = sourceRows.filter((s) => s.source === 'team_members').map((s) => s.source_id);

  const [rsRows, nhlRows, tmRows] = await Promise.all([
    rsIds.length
      ? fetchAll<any>((from, to) =>
          supabaseAdmin
            .from('players')
            // Narrow, public-only column list. No email, no phone.
            .select(
              'id, first_name, last_name, slug, position, jersey_number, nationality, birth_date, headshot_url, team_id',
            )
            .in('id', rsIds)
            .range(from, to),
        )
      : Promise.resolve([] as any[]),
    nhlIds.length
      ? fetchAll<any>((from, to) =>
          supabaseAdmin
            .from('nhl_players')
            // `logo` is the column — NOT `headshot_url`. Selecting a
            // non-existent column fails the WHOLE row with 42703.
            .select('id, full_name, first_name, last_name, logo, position, jersey_number, nationality, birth_date, current_team_name, league_name, role')
            .in('id', nhlIds)
            .range(from, to),
        )
      : Promise.resolve([] as any[]),
    tmIds.length
      ? fetchAll<any>((from, to) =>
          supabaseAdmin
            .from('team_members')
            .select('id, role, team_id, left_at')
            .in('id', tmIds)
            .range(from, to),
        )
      : Promise.resolve([] as any[]),
  ]);

  const rsMap = new Map(rsRows.map((r) => [String(r.id), r]));
  const nhlMap = new Map(nhlRows.map((r) => [String(r.id), r]));
  const tmMap = new Map(tmRows.map((r) => [String(r.id), r]));

  // ── Team and league names for the roles ──────────────────────────────────
  const teamIds = Array.from(new Set(roleRows.map((r) => r.team_id).filter(Boolean))) as string[];
  const leagueIds = Array.from(new Set(roleRows.map((r) => r.league_id).filter(Boolean))) as string[];

  const [teamRows, leagueRows] = await Promise.all([
    teamIds.length
      ? fetchAll<any>((from, to) =>
          supabaseAdmin
            .from('team_workspaces')
            .select('id, name, slug, avatar_url')
            .in('id', teamIds)
            .range(from, to),
        )
      : Promise.resolve([] as any[]),
    leagueIds.length
      ? fetchAll<any>((from, to) =>
          supabaseAdmin
            .from('leagues')
            .select('id, name, slug')
            .in('id', leagueIds)
            .range(from, to),
        )
      : Promise.resolve([] as any[]),
  ]);
  const teamMap = new Map(teamRows.map((t) => [String(t.id), t]));
  const leagueMap = new Map(leagueRows.map((l) => [String(l.id), l]));

  // ── Build the source records ─────────────────────────────────────────────
  const sources: UnifiedSourceRecord[] = sourceRows.map((s) => {
    const source = s.source as string;
    const sourceId = s.source_id as string;
    const slug = (s.source_slug as string) ?? null;
    const facts: UnifiedSourceRecord['facts'] = [];
    let name = (s.source_name as string) ?? null;
    let photoUrl: string | null = null;

    if (source === 'rinkstop_players') {
      const row = rsMap.get(sourceId);
      if (row) {
        name = playerDisplayName(row) ?? name;
        photoUrl = (row.headshot_url as string) ?? null;
        if (row.position) facts.push({ label: 'Position', value: String(row.position) });
        if (row.jersey_number != null) facts.push({ label: 'Jersey', value: `#${row.jersey_number}` });
        if (row.nationality) facts.push({ label: 'Nationality', value: String(row.nationality) });
        if (row.birth_date) facts.push({ label: 'Born', value: String(row.birth_date) });
      }
    } else if (source === 'nhl_players' || source === 'nhl_coaching_staff') {
      const row = nhlMap.get(sourceId);
      if (row) {
        name =
          row.full_name ||
          [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
          name;
        photoUrl = (row.logo as string) ?? null;
        if (row.position) facts.push({ label: 'Position', value: String(row.position) });
        if (row.jersey_number != null) facts.push({ label: 'Jersey', value: `#${row.jersey_number}` });
        if (row.current_team_name) facts.push({ label: 'Team', value: String(row.current_team_name) });
        if (row.league_name) facts.push({ label: 'League', value: String(row.league_name) });
        if (row.role) facts.push({ label: 'Role', value: String(row.role) });
      }
    } else if (source === 'team_members') {
      const row = tmMap.get(sourceId);
      if (row?.role) facts.push({ label: 'Role', value: String(row.role) });
      if (row?.left_at) facts.push({ label: 'Left', value: String(row.left_at) });
    }

    return {
      source,
      sourceId,
      slug,
      name,
      href: publicPathForSource(source, sourceId, slug),
      mergedAt: (s.merged_at as string) ?? null,
      facts,
      // The photo is a property of the record, not part of the public card
      // interface. It is carried here so the caller can pick the person's
      // best image from the first record that has one.
      ...(photoUrl ? { photoUrl } : {}),
    } as UnifiedSourceRecord & { photoUrl?: string | null };
  });

  // Pick the photo from the first source record that has one. Prefer a
  // RinkStop player record (it is the higher-quality image), then NHL.
  const photoUrl =
    (sources.find((s) => s.source === 'rinkstop_players' && (s as any).photoUrl) as any)?.photoUrl ??
    (sources.find((s) => (s as any).photoUrl) as any)?.photoUrl ??
    null;

  // ── Build the roles ──────────────────────────────────────────────────────
  const roles: UnifiedRole[] = roleRows.map((r) => {
    const source = r.source as string;
    const sourceId = r.source_id as string;
    const srcSlug =
      sourceRows.find((s) => s.source === source && s.source_id === sourceId)?.source_slug ?? null;
    let name: string | null = null;
    if (source === 'rinkstop_players') name = playerDisplayName(rsMap.get(sourceId));
    else if (source === 'nhl_players' || source === 'nhl_coaching_staff') {
      const row = nhlMap.get(sourceId);
      name =
        row?.full_name ||
        [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim() ||
        null;
    }

    return {
      id: r.id as string,
      roleType: r.role_type as UnifiedRoleType,
      roleDetail: (r.role_detail as string) ?? null,
      teamId: (r.team_id as string) ?? null,
      leagueId: (r.league_id as string) ?? null,
      season: (r.season as string) ?? null,
      jerseyNumber: (r.jersey_number as string) ?? null,
      position: (r.position as string) ?? null,
      source,
      sourceId,
      href: publicPathForRole(r.role_type as string, source, sourceId, srcSlug),
      name,
      teamName: r.team_id ? ((teamMap.get(String(r.team_id))?.name as string) ?? null) : null,
      leagueName: r.league_id ? ((leagueMap.get(String(r.league_id))?.name as string) ?? null) : null,
    };
  });

  // ── Account link: does this person have a `profiles_account` source row? ──
  const accountSource = sourceRows.find((s) => s.source === 'profiles_account');
  let accountUsername: string | null = null;
  if (accountSource) {
    const { data: acct } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('id', accountSource.source_id)
      .maybeSingle();
    accountUsername = (acct?.username as string) ?? null;
  }

  const slugValue = (person as any).slug as string | null;

  return {
    id: personId,
    slug: slugValue,
    publicId: (person as any).public_id as string | null,
    displayName: (person as any).display_name ?? 'RinkStop user',
    firstName: (person as any).first_name ?? null,
    lastName: (person as any).last_name ?? null,
    birthDate: (person as any).birth_date ?? null,
    nationality: (person as any).nationality ?? null,
    identityState: (person as any).identity_state ?? 'unverified',
    photoUrl,
    sources,
    roles,
    canonicalPath: slugValue ? `/profile/${slugValue}` : `/profile/${accountUsername ?? cleanFallback(personId)}`,
    hasAccount: !!accountUsername,
    accountUsername,
  };
}

function cleanFallback(personId: string): string {
  return `p-${personId.slice(0, 8)}`;
}

/**
 * The canonical path a merged-away person's old URL should redirect to.
 *
 * Returns null when the person is not merged away, or when the survivor
 * cannot be resolved.
 */
export async function getSurvivorCanonicalPath(mergedPersonId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('persons')
    .select('canonical_person_id, identity_state')
    .eq('id', mergedPersonId)
    .maybeSingle();

  if (error || !data) return null;
  if ((data as any).identity_state !== 'merged') return null;

  const survivorId = (data as any).canonical_person_id as string | null;
  if (!survivorId) return null;

  const { data: survivor } = await supabaseAdmin
    .from('persons')
    .select('slug')
    .eq('id', survivorId)
    .maybeSingle();

  const slug = (survivor?.slug as string) ?? null;
  return slug ? `/profile/${slug}` : null;
}
