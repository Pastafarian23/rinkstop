import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 30, windowMs: 60 * 1000 };

const VALID_TYPES = ['rink', 'team', 'player'] as const;
type FavoriteType = (typeof VALID_TYPES)[number];

function isValidType(s: unknown): s is FavoriteType {
  return typeof s === 'string' && (VALID_TYPES as readonly string[]).includes(s);
}

// POST /api/favorites — add a favorite
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`favorites:${ip}`, RATE_LIMIT);
  maybeCleanup();

  const { userId } = await auth();
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in to save items.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  let body: { favorite_type?: string; favorite_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!isValidType(body.favorite_type)) {
    return NextResponse.json(
      { error: `favorite_type must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    );
  }
  if (!body.favorite_id || typeof body.favorite_id !== 'string') {
    return NextResponse.json({ error: 'favorite_id is required.' }, { status: 400 });
  }

  // Verify the entity exists before saving (avoids orphan favorites)
  const table = body.favorite_type === 'rink' ? 'rinks'
              : body.favorite_type === 'team' ? 'teams'
              : 'players';
  const { data: entity, error: lookupErr } = await supabaseAdmin
    .from(table)
    .select('id')
    .eq('id', body.favorite_id)
    .maybeSingle();

  if (lookupErr) {
    console.error('favorites: entity lookup failed', lookupErr);
    return NextResponse.json({ error: 'Lookup failed.' }, { status: 500 });
  }
  if (!entity) {
    return NextResponse.json({ error: 'That listing does not exist.' }, { status: 404 });
  }

  // Upsert so re-saving is idempotent
  const { data, error } = await supabaseAdmin
    .from('favorites')
    .upsert(
      {
        user_id: userId,
        favorite_type: body.favorite_type,
        favorite_id: body.favorite_id,
      },
      { onConflict: 'user_id,favorite_type,favorite_id', ignoreDuplicates: true }
    )
    .select('id, favorite_type, favorite_id, created_at')
    .maybeSingle();

  if (error) {
    // Likely a duplicate unique-constraint race — treat as success
    if (error.code === '23505') {
      const res = NextResponse.json({ success: true, alreadySaved: true });
      return applyRateLimitHeaders(res, result);
    }
    console.error('favorites: insert failed', error);
    return NextResponse.json({ error: 'Failed to save.' }, { status: 500 });
  }

  const res = NextResponse.json({ success: true, favorite: data }, { status: 201 });
  return applyRateLimitHeaders(res, result);
}

// DELETE /api/favorites — remove a favorite
export async function DELETE(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`favorites:${ip}`, RATE_LIMIT);
  maybeCleanup();

  const { userId } = await auth();
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in to manage saved items.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  const url = new URL(request.url);
  const favorite_type = url.searchParams.get('favorite_type');
  const favorite_id = url.searchParams.get('favorite_id');

  if (!isValidType(favorite_type)) {
    return NextResponse.json({ error: 'favorite_type query param is required.' }, { status: 400 });
  }
  if (!favorite_id) {
    return NextResponse.json({ error: 'favorite_id query param is required.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('favorite_type', favorite_type)
    .eq('favorite_id', favorite_id);

  if (error) {
    console.error('favorites: delete failed', error);
    return NextResponse.json({ error: 'Failed to remove.' }, { status: 500 });
  }

  const res = NextResponse.json({ success: true });
  return applyRateLimitHeaders(res, result);
}

// GET /api/favorites?type=rink — check if a specific item is saved (lightweight; the dashboard page does the full list)
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`favorites:${ip}`, RATE_LIMIT);
  maybeCleanup();

  const { userId } = await auth();
  if (!userId) {
    const res = NextResponse.json({ favorites: [] });
    return applyRateLimitHeaders(res, result);
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');

  let query = supabaseAdmin.from('favorites').select('favorite_type, favorite_id').eq('user_id', userId);
  if (type && isValidType(type)) query = query.eq('favorite_type', type);
  if (id) query = query.eq('favorite_id', id);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'Lookup failed.' }, { status: 500 });
  }

  const res = NextResponse.json({ favorites: data || [] });
  return applyRateLimitHeaders(res, result);
}
