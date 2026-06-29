import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// Allowed entity types and their table names.
// 'business' goes through /api/listings/[id] (separate table, full schema).
// 'player' isn't editable by the user (Clerk profile data + a player claim
// would be a much bigger feature). For Phase 2.1-2.3 we ship rink/team/league.
const TABLES = {
  rink: 'rinks',
  team: 'teams',
  league: 'leagues',
} as const;

type EntityType = keyof typeof TABLES;

// Field allowlist per entity — we never blindly spread user input into PATCH.
// Anything not in this list is rejected, even if the column exists in the table.
const ALLOWED_FIELDS: Record<EntityType, Set<string>> = {
  rink: new Set([
    'name', 'address', 'city', 'province_state', 'country',
    'capacity', 'ice_size', 'surface_type', 'website_url',
    'phone', 'email', 'notes', 'opening_hours_json',
  ]),
  team: new Set([
    'name', 'city', 'country', 'division', 'website_url', 'colors',
  ]),
  league: new Set([
    'name', 'description', 'country', 'level', 'website_url',
  ]),
};

// Per-field validators. Returns null on success, or an error message on failure.
function validateField(type: EntityType, field: string, value: unknown): string | null {
  if (value === null) return null;  // nulls are always allowed (clearing a field)

  switch (type) {
    case 'rink':
      switch (field) {
        case 'name': return typeof value === 'string' && value.trim().length >= 1 && value.length <= 200 ? null : 'name must be 1-200 chars';
        case 'address': return typeof value === 'string' && value.length <= 500 ? null : 'address too long';
        case 'city': return typeof value === 'string' && value.length <= 120 ? null : 'city too long';
        case 'province_state': return typeof value === 'string' && value.length <= 120 ? null : 'province_state too long';
        case 'country': return typeof value === 'string' && value.length <= 80 ? null : 'country too long';
        case 'capacity': return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100000 ? null : 'capacity must be 0-100000';
        case 'ice_size': return typeof value === 'string' && value.length <= 40 ? null : 'ice_size too long';
        case 'surface_type': return typeof value === 'string' && value.length <= 40 ? null : 'surface_type too long';
        case 'website_url': return typeof value === 'string' && value.length <= 500 ? null : 'website_url too long';
        case 'phone': return typeof value === 'string' && value.length <= 50 ? null : 'phone too long';
        case 'email': return typeof value === 'string' && value.length <= 254 ? null : 'email too long';
        case 'notes': return typeof value === 'string' && value.length <= 2000 ? null : 'notes too long';
        case 'opening_hours_json': return typeof value === 'object' ? null : 'opening_hours_json must be an object';
      }
      break;
    case 'team':
      switch (field) {
        case 'name': return typeof value === 'string' && value.trim().length >= 1 && value.length <= 200 ? null : 'name must be 1-200 chars';
        case 'city': return typeof value === 'string' && value.length <= 120 ? null : 'city too long';
        case 'country': return typeof value === 'string' && value.length <= 80 ? null : 'country too long';
        case 'division': return typeof value === 'string' && value.length <= 80 ? null : 'division too long';
        case 'website_url': return typeof value === 'string' && value.length <= 500 ? null : 'website_url too long';
        case 'colors': return Array.isArray(value) && value.every((c) => typeof c === 'string' && c.length <= 40) && value.length <= 6 ? null : 'colors must be array of up to 6 strings';
      }
      break;
    case 'league':
      switch (field) {
        case 'name': return typeof value === 'string' && value.trim().length >= 1 && value.length <= 200 ? null : 'name must be 1-200 chars';
        case 'description': return typeof value === 'string' && value.length <= 2000 ? null : 'description too long';
        case 'country': return typeof value === 'string' && value.length <= 80 ? null : 'country too long';
        case 'level': return typeof value === 'string' && value.length <= 80 ? null : 'level too long';
        case 'website_url': return typeof value === 'string' && value.length <= 500 ? null : 'website_url too long';
      }
      break;
  }
  return `unknown field: ${field}`;
}

// Owner check. For rinks/teams/leagues, the ownership is via a `claims` row
// with `status='approved'` AND matching `entity_id` AND `claim_type` matching
// the entity. (league claims aren't a thing today, but we keep the code
// symmetric for the day they are.)
async function isOwner(userId: string, type: EntityType, entityId: string): Promise<boolean> {
  if (type === 'league') {
    // No claim_type='league' today. For now, gate by the user having the
    // `league_admin` account type AND having any approved claim of any type
    // that points at this league. The latter is a stretch — admins can
    // still edit if they hold the role.
    // NOTE: a `league_claims` table is a separate feature, not a cleanup.
    // Tracked in memory/2026-06-29-rinkstop-prep.md §4. Build when we add
    // league claiming as a product surface (probably Q3 2026).
    const { count } = await supabaseAdmin
      .from('profile_account_types')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('account_type', 'league_admin');
    if (!count) return false;
    // Also require the league actually exists so we don't leak existence info.
    const { data: league } = await supabaseAdmin
      .from('leagues')
      .select('id')
      .eq('id', entityId)
      .maybeSingle();
    return !!league;
  }

  const claimType = type;  // 'rink' | 'team' (matches `claims.claim_type` values)
  const { count } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('claim_type', claimType)
    .eq('entity_id', entityId)
    .eq('status', 'approved');
  return (count || 0) > 0;
}

// GET /api/manage/[type]/[id] — owner-only read
export async function GET(_req: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { type, id } = await params;
  if (!(type in TABLES)) return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  const t = type as EntityType;
  if (!(await isOwner(userId, t, id))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const table = TABLES[t];
  const { data, error } = await supabaseAdmin.from(table).select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: 'not_found', message: error.message }, { status: 404 });
  return NextResponse.json({ entity: data });
}

// PATCH /api/manage/[type]/[id] — owner-only update
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { type, id } = await params;
  if (!(type in TABLES)) return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  const t = type as EntityType;
  if (!(await isOwner(userId, t, id))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const allowed = ALLOWED_FIELDS[t];
  const update: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(body)) {
    if (!allowed.has(field)) {
      return NextResponse.json({ error: 'field_not_allowed', field }, { status: 400 });
    }
    const err = validateField(t, field, value);
    if (err) return NextResponse.json({ error: 'validation_failed', field, message: err }, { status: 400 });
    update[field] = value;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
  }
  // Always bump updated_at so consumers can see "last edit by manager".
  update.updated_at = new Date().toISOString();

  const table = TABLES[t];
  const { data, error } = await supabaseAdmin
    .from(table)
    .update(update)
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    console.error(`[manage ${t} PATCH] failed`, error);
    return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ entity: data });
}
