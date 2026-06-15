// POST /api/admin/bulk/[entity]
// Bulk operations on a directory entity. Used by the bulk-select UI on
// /admin/teams, /admin/rinks, /admin/leagues, /admin/players, /admin/brands.
//
// Body:
//   {
//     ids: string[],
//     action: 'set_league' | 'set_country' | 'set_state' | 'delete',
//     params?: { league_id?: string, country?: string, state?: string }
//   }
//
// Per-entity action allowlist (no free-form PATCH — that opens a wide
// attack surface; every action has fixed columns and validated values).
//
//   teams:    set_league, delete
//   rinks:    set_country, set_state, delete
//   leagues:  delete
//   players:  delete
//   brands:   delete
//
// All write operations go through supabaseAdmin. The 1000-id cap keeps
// a single request small enough to fit in one HTTP round trip.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Entity = 'teams' | 'rinks' | 'leagues' | 'players' | 'brands';
type Action = 'set_league' | 'set_country' | 'set_state' | 'delete';

const ENTITY_ACTIONS: Record<Entity, Action[]> = {
  teams: ['set_league', 'delete'],
  rinks: ['set_country', 'set_state', 'delete'],
  leagues: ['delete'],
  players: ['delete'],
  brands: ['delete'],
};

const VALID_ENTITIES: Entity[] = ['teams', 'rinks', 'leagues', 'players', 'brands'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;

  const { entity } = await params;
  if (!VALID_ENTITIES.includes(entity as Entity)) {
    return NextResponse.json(
      { error: `entity must be one of ${VALID_ENTITIES.join(', ')}` },
      { status: 400 }
    );
  }
  const e = entity as Entity;

  let body: { ids?: string[]; action?: Action; params?: Record<string, any> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { ids, action, params: actionParams } = body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids[] required and non-empty' }, { status: 400 });
  }
  if (ids.length > 1000) {
    return NextResponse.json({ error: 'Bulk limit is 1000 ids per request' }, { status: 400 });
  }
  if (!action || !ENTITY_ACTIONS[e].includes(action)) {
    return NextResponse.json(
      { error: `action for ${e} must be one of ${ENTITY_ACTIONS[e].join(', ')}` },
      { status: 400 }
    );
  }

  // Action-specific validation + execution
  let update: Record<string, any> | null = null;

  if (action === 'set_league' && e === 'teams') {
    const leagueId = actionParams?.league_id;
    if (leagueId !== null && typeof leagueId !== 'string') {
      return NextResponse.json({ error: 'params.league_id must be a string or null' }, { status: 400 });
    }
    // Verify the league exists (empty string = unassign; null = unassign)
    if (leagueId && leagueId.length > 0) {
      const { data: league } = await supabaseAdmin
        .from('leagues')
        .select('id')
        .eq('id', leagueId)
        .maybeSingle();
      if (!league) {
        return NextResponse.json({ error: `League ${leagueId} not found` }, { status: 400 });
      }
    }
    update = { league_id: leagueId || null };
  } else if (action === 'set_country' && e === 'rinks') {
    const country = (actionParams?.country || '').toString().trim();
    if (country.length > 100) {
      return NextResponse.json({ error: 'country must be 100 chars or fewer' }, { status: 400 });
    }
    update = { country: country || null };
  } else if (action === 'set_state' && e === 'rinks') {
    const state = (actionParams?.state || '').toString().trim();
    if (state.length > 100) {
      return NextResponse.json({ error: 'state must be 100 chars or fewer' }, { status: 400 });
    }
    update = { state: state || null };
  } else if (action === 'delete') {
    // For leagues/players/brands, we may have FK references that block hard delete.
    // Wrap the delete in a service-side try and surface the FK error so the admin
    // can decide whether to cascade or pick fewer ids.
    const { error } = await supabaseAdmin.from(e).delete().in('id', ids);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, entity: e, action, count: ids.length });
  }

  if (!update) {
    return NextResponse.json({ error: 'Action produced no update' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from(e).update(update).in('id', ids);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, entity: e, action, count: ids.length, update });
}
