import { supabaseAdmin } from '@/lib/supabase';

/**
 * ONE place that resolves a claim entity id/slug to the row a claim needs.
 *
 * WHY THIS EXISTS (2026-10-30, Arnel-flagged):
 *   The claim flow had FOUR different table mappings spread across three
 *   files, and three of them were wrong:
 *
 *   1. `src/app/api/claims/route.ts` mapped claim_type 'team' -> the legacy
 *      `teams` table. But the PUBLIC team directory (`/directory/teams/*`)
 *      reads `team_workspaces`. Slough Satans — the team a real customer
 *      tried to claim — exists ONLY in `team_workspaces`. So the claims API
 *      looked it up in `teams`, found nothing, and answered
 *      "Could not look up listing" (500). **The claim could never complete
 *      for a team listed through the public directory.**
 *
 *   2. `team_workspaces` has NO `claimable` column. The claimable gate
 *      selected `id, claimable` from it → PostgREST 42703 → the query
 *      errored instead of returning a row.
 *
 *   3. `players` has NO `name` column. The entity lookup selected
 *      `id, claimable, name` for every type → 42703 for players.
 *
 *   4. `league` is not an accepted claim_type at all, but
 *      `/directory/leagues/[id]` rendered a "Claim this league" CTA — a
 *      dead end that 400s on submit.
 *
 * THE RULES:
 *   - `team_workspaces` is the CANONICAL public team table. Always look
 *     there FIRST for teams. The legacy `teams` table is a fallback for rows
 *     that only exist there (296 shared ids out of ~3,250 each).
 *   - Never select a column that does not exist. Each table gets its own
 *     explicit field list.
 *   - `claimable` is a real column on `teams`, `rinks`, `players` and
 *     `leagues` — but NOT on `team_workspaces`. For teams, claimability is
 *     derived from the listing's visibility instead.
 */

export type ClaimEntityType = 'rink' | 'team' | 'player';

/**
 * The entity types the PUBLIC CLAIM UI can render.
 *
 * 'league' is in the UI type but is NOT claimable — POST /api/claims rejects
 * it. League pages route owners to /add-listing instead. See
 * src/components/LeagueOwnershipRequest.tsx.
 */
export type ClaimUiEntityType = ClaimEntityType | 'league';

export interface ResolvedClaimEntity {
  id: string;
  name: string;
  /** false only when the row explicitly says claimable = false. */
  claimable: boolean;
  /** Which table it was found in — useful for debugging. */
  source: string;
}

/** The canonical table for each claim type, searched FIRST. */
const PRIMARY_TABLE: Record<ClaimEntityType, string> = {
  rink: 'rinks',
  team: 'team_workspaces',
  player: 'players',
};

/**
 * Fallback tables searched when the primary table has no match.
 *
 * `teams` is searched for teams because the legacy table still holds ~700
 * rows that `team_workspaces` does not (the two tables only partially
 * overlap — 296 shared ids). Those rows must still be claimable, otherwise
 * a club that only exists in the legacy table cannot claim its listing.
 */
const FALLBACK_TABLE: Record<ClaimEntityType, string[]> = {
  rink: [],
  team: ['teams'],
  player: [],
};

const IS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fetch a row by id, then by slug, from one table.
 *
 * `select` MUST list only columns that exist on THAT table. Passing a
 * column from a different table is a 42703 and kills the whole query.
 */
async function findInTable(
  table: string,
  fields: string,
  entityId: string
): Promise<{ row: Record<string, unknown> | null; error: unknown }> {
  const looksUuid = IS_UUID.test(String(entityId));

  if (looksUuid) {
    const byId = await supabaseAdmin
      .from(table)
      .select(fields)
      .eq('id', entityId)
      .maybeSingle();
    if (byId.error) return { row: null, error: byId.error };
    if (byId.data) return { row: (byId.data as unknown as Record<string, unknown>) ?? null, error: null };
  }

  const bySlug = await supabaseAdmin
    .from(table)
    .select(fields)
    .eq('slug', entityId)
    .maybeSingle();
  if (bySlug.error) return { row: null, error: bySlug.error };
  if (bySlug.data) return { row: (bySlug.data as unknown as Record<string, unknown>) ?? null, error: null };

  return { row: null, error: null };
}

/**
 * Resolve a claim entity across the primary and fallback tables.
 *
 * Returns null when the entity cannot be found anywhere — which the caller
 * treats as "Could not look up listing" (500).
 */
export async function resolveClaimEntity(
  claimType: ClaimEntityType,
  entityId: string
): Promise<ResolvedClaimEntity | null> {
  if (!entityId) return null;

  // Each table gets its OWN field list. `name` does not exist on `players`,
  // and `claimable` does not exist on `team_workspaces`.
  const fieldsFor = (table: string): string =>
    table === 'players'
      ? 'id, first_name, last_name, slug, claimable'
      : table === 'team_workspaces'
        ? 'id, name, slug, visibility, is_active'
        : 'id, name, slug, claimable';

  const tables = [PRIMARY_TABLE[claimType], ...(FALLBACK_TABLE[claimType] || [])];

  for (const table of tables) {
    const { row, error } = await findInTable(table, fieldsFor(table), entityId);
    if (error) {
      console.error(`[claim-entity] lookup failed on ${table}:`, error);
      // A 42703 here means the field list is wrong for this table — that is
      // a BUG in this module, not a missing row. Do NOT swallow it into
      // "not found", or we get the same empty-result bug class again.
      throw error;
    }
    if (!row) continue;

    // Display name.
    let name: string;
    if (table === 'players') {
      const first = (row.first_name as string) || '';
      const last = (row.last_name as string) || '';
      name = `${first} ${last}`.trim() || (row.slug as string) || 'this player';
    } else {
      name = (row.name as string) || (row.slug as string) || 'this listing';
    }

    // Claimability.
    //
    // `team_workspaces` has no `claimable` column. For teams, a listing is
    // claimable when it is publicly visible and active. Private or archived
    // workspaces are internal records, not something a member of the public
    // should be able to claim.
    let claimable = true;
    if (table === 'team_workspaces') {
      claimable = row.visibility === 'public' && row.is_active !== false;
    } else if (row.claimable === false) {
      claimable = false;
    }

    return { id: (row.id as string), name, claimable, source: table };
  }

  return null;
}

/**
 * Resolve a display name only (no claimability check).
 * Used by the UI mount, which only needs a label.
 */
export async function resolveClaimEntityName(
  claimType: ClaimEntityType,
  entityId: string
): Promise<string | null> {
  try {
    const resolved = await resolveClaimEntity(claimType, entityId);
    return resolved?.name ?? null;
  } catch {
    return null;
  }
}
