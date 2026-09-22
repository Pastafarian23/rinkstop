/**
 * GET /api/related-directory/by-id — fetch specific teams + leagues by FK.
 *
 * Used by TagChips to resolve canonical entities from posts.team_home_id /
 * posts.team_away_id / posts.league_id BEFORE falling back to substring
 * matching. This guarantees 'tag: flyers' in a Philadelphia-vs-Washington
 * article resolves to /directory/teams/philadelphia-flyers, not 'Nazareth
 * University Golden Flyers' (the substring-match winner for that tag).
 *
 * Query: ?ids=team:<uuid>,team:<uuid>,league:<uuid>
 * Returns: { items: [{ id, slug, name, type, city, country }] }
 *
 * 2026-09-22: split from /api/related-directory for clarity — the substring
 * endpoint takes a list of `tag` query params; this endpoint takes prefixed
 * ids. Both share the same output shape so consumers (TagChips) can merge
 * results with consistent logic.
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface EntityRow {
  id: string;
  slug: string;
  name: string;
  city?: string | null;
  country?: string | null;
  home_city?: string | null;
  country_code?: string | null;
}

export async function GET(request: NextRequest) {
  const idsRaw = request.nextUrl.searchParams.get('ids') || '';
  const entries = idsRaw.split(',').filter(Boolean);
  const teamIds: string[] = [];
  const leagueIds: string[] = [];
  for (const e of entries) {
    const colon = e.indexOf(':');
    if (colon === -1) continue;
    const kind = e.slice(0, colon);
    const id = e.slice(colon + 1);
    if (kind === 'team') teamIds.push(id);
    else if (kind === 'league') leagueIds.push(id);
  }

  const results: (EntityRow & { type: 'team' | 'league' })[] = [];
  if (teamIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('team_workspaces')
      .select('id, slug, name, home_city, country_code')
      .in('id', teamIds);
    for (const r of (data || []) as EntityRow[]) {
      results.push({ ...r, type: 'team' as const });
    }
  }
  if (leagueIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('leagues')
      .select('id, slug, name, city, country')
      .in('id', leagueIds);
    for (const r of (data || []) as EntityRow[]) {
      results.push({ ...r, type: 'league' as const });
    }
  }

  return new Response(JSON.stringify({ items: results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
