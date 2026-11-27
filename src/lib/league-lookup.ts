// Server-side league lookup for /directory/leagues/[id] (staging change, 2026-11-27).
//
// Replaces the page's self-fetch to /api/leagues, which shared the per-IP bulk rate limit.
// It reads the same rows the route returns by default:
//   - `is_active = true`, ordered by `name`;
//   - the page then matches one row by exact `id` or `slug`.
// It uses the same anon `supabase` client as the route, so Row Level Security still applies.
//
// Error contract (deliberate):
//   - genuine no match      -> null            (page calls notFound() -> 404)
//   - Supabase query error  -> logged, then throws LeagueLookupError (server error, NOT a 404)
//   - unexpected exception  -> propagates unchanged (a programming defect must not become a 404)
// The route's claim-tier enrichment (claimed_by_*) is not copied: the league detail page
// and its client do not read those fields.

import type { SupabaseClient } from '@supabase/supabase-js';

// Columns the league detail page reads, typed. Other columns pass through untyped.
export type LeagueRow = {
  id: string;
  slug: string | null;
  name: string;
  level: string | null;
  country: string | null;
  website_url: string | null;
  logo_url: string | null;
  description: string | null;
  alternate: string | null;
  updated_at: string | null;
  is_active: boolean;
  team_count?: number | null;
  [column: string]: unknown;
};

export class LeagueLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeagueLookupError';
  }
}

export function pickLeague(leagues: LeagueRow[], slugOrId: string): LeagueRow | null {
  return leagues.find((l) => l.id === slugOrId || l.slug === slugOrId) ?? null;
}

export async function findActiveLeague(
  client: SupabaseClient,
  slugOrId: string,
): Promise<LeagueRow | null> {
  const { data, error } = await client
    .from('leagues')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    // Log only the code and message. Do not log row data or the request.
    const code = (error as { code?: string }).code ?? 'unknown';
    console.error('[league-lookup] leagues query failed', { code, message: error.message });
    throw new LeagueLookupError(`leagues query failed (${code})`);
  }

  if (!Array.isArray(data)) {
    console.error('[league-lookup] leagues query returned a non-array payload');
    throw new LeagueLookupError('leagues query returned a non-array payload');
  }

  return pickLeague(data as LeagueRow[], slugOrId);
}
