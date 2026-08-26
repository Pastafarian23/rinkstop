import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/rinks/[id]
 * Single rink with claims count and recent reviews.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;
  const { id } = await params;

  const { data: rink, error } = await supabaseAdmin
    .from('rinks')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!rink) {
    return NextResponse.json({ error: 'rink_not_found' }, { status: 404 });
  }

  const { count: claimsCount } = await supabaseAdmin
    .from('rink_claims')
    .select('*', { count: 'exact', head: true })
    .eq('rink_id', id)
    .eq('status', 'approved');

  const { data: reviews } = await supabaseAdmin
    .from('rink_reviews')
    .select('id, rating, review_text, reviewer_name, created_at, status')
    .eq('rink_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ rink, claimsCount: claimsCount || 0, reviews: reviews || [] });
}

/**
 * PATCH /api/admin/rinks/[id]
 * Update rink metadata.
 * Body: { name?, city?, state?, country?, latitude?, longitude? }
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminFromRequest(request, 'admin_rinks');
  if ('response' in auth) return auth.response;
  const { id } = await params;

  let body: { name?: string; city?: string; state?: string; country?: string; latitude?: number; longitude?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (typeof body.name === 'string') updates.name = body.name.trim();
  if (typeof body.city === 'string') updates.city = body.city.trim() || null;
  if (typeof body.state === 'string') updates.state = body.state.trim() || null;
  if (typeof body.country === 'string') updates.country = body.country.trim() || null;
  if (typeof body.latitude === 'number' && Number.isFinite(body.latitude)) updates.latitude = body.latitude;
  if (typeof body.longitude === 'number' && Number.isFinite(body.longitude)) updates.longitude = body.longitude;

  const { data, error } = await supabaseAdmin
    .from('rinks')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rink: data });
}
