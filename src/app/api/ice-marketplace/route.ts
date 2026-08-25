// src/app/api/ice-marketplace/route.ts
//
// WS17 PR4 - Public ice marketplace.
//
//   GET /api/ice-marketplace   — browse all public available ice listings
//      ?rink_id=...    — filter by rink
//      ?slot_type=...  — filter by slot type
//      ?age_group=...  — filter by age group
//      ?skill_level=.. — filter by skill level
//      ?status=...     — filter by status (default: available)
//      ?limit=...      — pagination limit (default 20, max 100)
//      ?offset=...     — pagination offset

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rinkId = searchParams.get('rink_id');
  const slotType = searchParams.get('slot_type');
  const ageGroup = searchParams.get('age_group');
  const skillLevel = searchParams.get('skill_level');
  const status = searchParams.get('status') || 'available';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabaseAdmin
    .from('ice_listings')
    .select(`
      id, rink_id, title, description, requested_price_cents, currency,
      start_time, end_time, timezone, age_group, skill_level, slot_type, visibility, status,
      created_at,
      rink:rinks(id, name, slug, city, state_province, country)
    `)
    .eq('visibility', 'public')
    .eq('status', status)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .range(offset, offset + limit - 1);

  if (rinkId) query = query.eq('rink_id', rinkId);
  if (slotType) query = query.eq('slot_type', slotType);
  if (ageGroup) query = query.eq('age_group', ageGroup);
  if (skillLevel) query = query.eq('skill_level', skillLevel);

  const { data, error, count } = await query;

  if (error) {
    console.error('[ice-marketplace] list failed', error);
    return NextResponse.json({ error: 'Failed to load ice listings.' }, { status: 500 });
  }

  return NextResponse.json({
    listings: data || [],
    total: count ?? 0,
    limit,
    offset,
  });
}
