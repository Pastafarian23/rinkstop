/**
 * GET /api/related-directory — lightweight search over rinks + teams + leagues.
 *
 * Query: ?tag=hockey&tag=junior&category=Youth+hockey&limit=6
 * Returns: { items: [{ id, slug, name, type, city, country }] }
 *
 * Uses ilike on name + city + country, OR-combined across tags.
 * Aggregate results from all 3 tables, dedup by id, sort by simplest
 * name match and cap at `limit`.
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
  const tags = request.nextUrl.searchParams.getAll('tag').filter(Boolean);
  const category = request.nextUrl.searchParams.get('category') || '';
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 6), 20);

  const terms = [category, ...tags].map(t => t.trim()).filter(Boolean);
  if (terms.length === 0) {
    return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Build OR clauses per-table because columns differ across tables.
  // 2026-09-22 audit fix: previously used one combined clause referencing
  // 'city' and 'country' for all 3 tables — but team_workspaces uses
  // home_city + country_code, so the OR clause 42703'd the whole query
  // and silently returned 0 teams. Now each table gets its own clause.
  const buildOrForColumns = (columns: string[]) => {
    const segs: string[] = [];
    for (const term of terms) {
      const escaped = term.replace(/'/g, "''");
      for (const col of columns) {
        segs.push(`${col}.ilike.%${escaped}%`);
      }
    }
    return segs.join(',');
  };
  const rinkOrClause = buildOrForColumns(['name', 'city', 'country']);
  const teamOrClause = buildOrForColumns(['name', 'home_city', 'country_code']);
  const leagueOrClause = buildOrForColumns(['name', 'city', 'country']);

  const [rinkRes, teamRes, leagueRes] = await Promise.all([
    supabaseAdmin.from('rinks').select('id, slug, name, city, country').or(rinkOrClause).eq('is_active', true).limit(limit),
    supabaseAdmin.from('team_workspaces').select('id, slug, name, home_city, country_code').or(teamOrClause).limit(limit),
    supabaseAdmin.from('leagues').select('id, slug, name, city, country').or(leagueOrClause).limit(limit),
  ]);

  const items: (EntityRow & { type: 'rink' | 'team' | 'league' })[] = [];
  const seen = new Set<string>();

  const accumulate = (rows: EntityRow[] | null | undefined, type: 'rink' | 'team' | 'league') => {
    for (const r of rows || []) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        items.push({ ...r, type });
      }
      if (items.length >= limit) break;
    }
  };

  accumulate(rinkRes.data, 'rink');
  accumulate(teamRes.data, 'team');
  accumulate(leagueRes.data, 'league');

  return new Response(JSON.stringify({ items: items.slice(0, limit) }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}