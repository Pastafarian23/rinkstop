import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { enrichEntitiesWithClaimTier, compareByTier } from '@/lib/listingTier';

const API_SECRET = process.env.API_SECRET;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

function requireAuth(request: NextRequest) {
  const key = request.headers.get('x-api-secret');
  return key === API_SECRET || key === ADMIN_SECRET;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const country = searchParams.get('country');
  const level = searchParams.get('level');
  const search = searchParams.get('search');
  const activeOnly = searchParams.get('activeOnly') !== 'false';

  let query = supabase.from('leagues').select('*');

  if (id) {
    query = query.eq('id', id).limit(1);
  } else {
    if (country) query = query.eq('country', country);
    if (level) query = query.eq('level', level);
    if (activeOnly) query = query.eq('is_active', true);
    if (search) query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query.order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich list responses with claimer's tier (leagues use 'league' claim_type
  // — the enrich helper falls back to no-op if no rows match, so this is safe).
  let enrichedData = data;
  if (!id && data && data.length) {
    const tierMap = await enrichEntitiesWithClaimTier(supabaseAdmin, 'league', data.map((d: any) => d.id));
    enrichedData = data.map((d: any) => {
      const claim = tierMap.get(d.id);
      return {
        ...d,
        claimed_by_tier: claim?.tier || null,
        claimed_by_user_id: claim?.user_id || null,
      };
    });
    const sort = searchParams.get('sort');
    if (sort === 'tier') enrichedData.sort(compareByTier);
  }

  return NextResponse.json(enrichedData);
}

export async function POST(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const { data, error } = await supabaseAdmin.from('leagues').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, ...rest } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { data, error } = await supabaseAdmin.from('leagues').update(rest).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { error } = await supabaseAdmin.from('leagues').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}