/**
 * src/lib/person-identity.ts
 *
 * THE shared person-identity loader.
 *
 * WHY THIS EXISTS (2026-11-12):
 *   RinkStop had five parallel person namespaces (`players`, `nhl_players`,
 *   `coach_profiles`, `team_members`, `nhl_coaching_staff`) and an account
 *   table (`profiles`) that was almost entirely disconnected from them.
 *   Only 1 of 6,352 player rows was linked to an account.
 *
 *   Phase 0/1 (authorized 2026-11-11) created the central identity tables:
 *     persons · person_sources · person_roles · person_claims · person_aliases
 *   and backfilled them so that every legacy source row has a person.
 *
 *   This module is the ONE place that reads them — the same rule that fixed
 *   the coach-page bug (see src/lib/staff-record.ts): a page and an API must
 *   share one loader, or they drift, and the copy that drifts is the one
 *   that breaks.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS MODULE IS INERT BY DEFAULT.
 *
 *   `isPersonIdentityEnabled()` returns false unless the env var
 *   `PERSON_IDENTITY_ENABLED` is exactly 'true'. No production route calls
 *   this module yet. Phase 0/1 changed no resolution behavior whatsoever —
 *   the existing directory pages still read `players` / `nhl_players` /
 *   `team_members` exactly as they did before.
 *
 *   Phase 3 is when directory routes start resolving through here, and that
 *   requires separate authorization.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IDENTITY RULES ENFORCED HERE
 *
 *   1. Identity is `persons.id` (a UUID). NEVER a slug. NEVER a name.
 *      `person_sources.source_id` holds the ORIGINAL primary key of the
 *      source row, cast to TEXT, so integer PKs (nhl_players.id) and uuid
 *      PKs (players.id) coexist in one namespace without collision.
 *
 *   2. A source row maps to exactly one person, and a person has exactly one
 *      originating source row. `persons.origin_key` (UNIQUE) records which
 *      row created the person; `person_sources (source, source_id)`
 *      (UNIQUE) records the same key. The mapping is derived from that key
 *      and never from a name join — nhl_players contains 314 duplicate-name
 *      groups, so a name join would fan out and misattach.
 *
 *   3. Merges are never automatic. `identity_state='merged'` is only ever
 *      set by an explicit, reviewed operation, and the merged row is
 *      RETAINED so the inverse mapping stays recoverable.
 *
 *   4. Account ownership, verification (Didit), Stripe/subscription state
 *      and organization relationships live on `profiles` and are NEVER read
 *      or written through this module. This module deals in PERSONS.
 */

import { supabaseAdmin } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Feature flag
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Master switch for the unified person-identity subsystem.
 *
 * Defaults OFF. Phase 0/1 shipped the schema and the backfill with this
 * flag off precisely so that no production behavior changes: the tables are
 * populated but nothing reads them.
 *
 * IMPORTANT — THIS IS READ FROM THE PROCESS ENV, NOT FROM THE CODE DEFAULT.
 *   The `PASSPORT_FLAGS` object in src/lib/passport/02-feature-flags.ts holds
 *   the code-level default, but every PASSPORT_* flag is ALSO set as an env
 *   var in Vercel production, and the env var WINS. That is a live trap:
 *   `PASSPORT_ENABLED=true` is set in Vercel right now, so flipping the
 *   code default alone would not turn it off.
 *
 *   `PERSON_IDENTITY_ENABLED` is deliberately NOT set in Vercel (verified
 *   2026-11-12), so it resolves to false there. This function reads the
 *   env var directly and defaults to false when it is absent, so the flag
 *   behaves identically whether it is absent, empty, or set to anything
 *   other than the exact string 'true'.
 *
 * Set to 'true' only when Phase 3 (alias resolution + central page) lands
 * and has been reviewed.
 */
export function isPersonIdentityEnabled(): boolean {
  return process.env.PERSON_IDENTITY_ENABLED === 'true';
}

/**
 * The closed set of source namespaces. Mirrors the CHECK constraint on
 * `person_sources.source`. Kept here so callers cannot invent a namespace.
 */
export const PERSON_SOURCE_NAMESPACES = [
  'rinkstop_players',
  'nhl_players',
  'nhl_coaching_staff',
  'team_members',
  'coach_profiles',
  'profiles_account',
] as const;

export type PersonSourceNamespace = (typeof PERSON_SOURCE_NAMESPACES)[number];

export const PERSON_ROLE_TYPES = [
  'player',
  'coach',
  'official',
  'scout',
  'staff',
  'executive',
  'referee',
] as const;

export type PersonRoleType = (typeof PERSON_ROLE_TYPES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PersonRecord {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  nationality: string | null;
  identity_state: 'unverified' | 'claimed' | 'verified' | 'merged' | 'deprecated';
  canonical_person_id: string | null;
  name_source: string | null;
  origin_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonSourceRecord {
  id: string;
  person_id: string;
  source: PersonSourceNamespace;
  source_table: string;
  source_id: string;
  source_slug: string | null;
  source_name: string | null;
  merged_at: string | null;
  created_at: string;
}

export interface PersonRoleRecord {
  id: string;
  person_id: string;
  role_type: PersonRoleType;
  role_detail: string | null;
  team_id: string | null;
  league_id: string | null;
  season: string | null;
  jersey_number: string | null;
  position: string | null;
  source: PersonSourceNamespace;
  source_id: string;
  created_at: string;
  updated_at: string;
}

export interface PersonClaimRecord {
  id: string;
  person_id: string;
  user_id: string;
  relationship: 'self' | 'parent' | 'guardian' | 'authorized_agent' | 'owner';
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  verification_status: string | null;
  verified_at: string | null;
  minor_consent_at: string | null;
  minor_consent_method: string | null;
  minor_consent_revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonAliasRecord {
  id: string;
  person_id: string;
  path: string;
  alias_type: 'player' | 'coach' | 'scout' | 'official' | 'staff' | 'executive' | 'profile';
  is_canonical: boolean;
  source: PersonSourceNamespace;
  source_id: string;
  created_at: string;
}

/** A person together with its provenance and roles. */
export interface PersonIdentity {
  person: PersonRecord;
  sources: PersonSourceRecord[];
  roles: PersonRoleRecord[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Loaders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a source row to its person, via the stable (source, source_id) key.
 *
 * This is the canonical lookup. It never matches on name or slug.
 */
export async function getPersonBySource(
  source: PersonSourceNamespace,
  sourceId: string | number,
): Promise<PersonIdentity | null> {
  const { data, error } = await supabaseAdmin
    .from('person_sources')
    .select('*')
    .eq('source', source)
    .eq('source_id', String(sourceId))
    .maybeSingle();

  if (error) {
    console.error('[person-identity] getPersonBySource failed', error);
    return null;
  }
  if (!data) return null;

  return getPersonById((data as PersonSourceRecord).person_id);
}

/**
 * Load a person by its central UUID, with sources and roles.
 */
export async function getPersonById(personId: string): Promise<PersonIdentity | null> {
  const { data: person, error } = await supabaseAdmin
    .from('persons')
    .select('*')
    .eq('id', personId)
    .maybeSingle();

  if (error) {
    console.error('[person-identity] getPersonById failed', error);
    return null;
  }
  if (!person) return null;

  const [{ data: sources }, { data: roles }] = await Promise.all([
    supabaseAdmin
      .from('person_sources')
      .select('*')
      .eq('person_id', personId)
      .order('source'),
    supabaseAdmin
      .from('person_roles')
      .select('*')
      .eq('person_id', personId)
      .order('role_type'),
  ]);

  return {
    person: person as PersonRecord,
    sources: (sources ?? []) as PersonSourceRecord[],
    roles: (roles ?? []) as PersonRoleRecord[],
  };
}

/**
 * Resolve a public path to its person, via `person_aliases`.
 *
 * `person_aliases` is populated in Phase 3; in Phase 0/1 it is empty and
 * this returns null for every path. That is expected and correct — the
 * alias layer does not exist yet, and no route calls this.
 */
export async function getPersonByPath(path: string): Promise<PersonIdentity | null> {
  const { data: alias, error } = await supabaseAdmin
    .from('person_aliases')
    .select('*')
    .eq('path', path)
    .maybeSingle();

  if (error) {
    console.error('[person-identity] getPersonByPath failed', error);
    return null;
  }
  if (!alias) return null;

  return getPersonById((alias as PersonAliasRecord).person_id);
}

/**
 * The approved owner of a person, if any.
 *
 * NOTE: this reads `person_claims`, which is EMPTY until Phase 5. The
 * existing ownership resolution (`src/lib/ownership.ts`) still reads
 * players.user_id / managed_profiles / claims, and is unchanged.
 */
export async function getPersonOwner(
  personId: string,
): Promise<{ userId: string; relationship: string } | null> {
  const { data, error } = await supabaseAdmin
    .from('person_claims')
    .select('user_id, relationship')
    .eq('person_id', personId)
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[person-identity] getPersonOwner failed', error);
    return null;
  }
  if (!data) return null;

  const row = data as { user_id: string; relationship: string };
  return { userId: row.user_id, relationship: row.relationship };
}

/**
 * Every person that a given source row maps to — used by the audit gate to
 * prove the mapping is one-to-one. Should always return exactly 0 or 1.
 */
export async function countPersonsForSource(
  source: PersonSourceNamespace,
  sourceId: string | number,
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('person_sources')
    .select('id', { count: 'exact', head: true })
    .eq('source', source)
    .eq('source_id', String(sourceId));

  if (error) {
    console.error('[person-identity] countPersonsForSource failed', error);
    return -1;
  }
  return count ?? 0;
}
