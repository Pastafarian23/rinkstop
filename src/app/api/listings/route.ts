import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/listings
// Returns the current user's business listings. Always scoped to the caller.
export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('id, owner_user_id, listing_type, business_name, category, description, location, latitude, longitude, service_radius_km, contact_email, contact_phone, website, logo_url, photos, hours, is_published, tier, created_at, updated_at')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[listings GET] failed', error);
    return NextResponse.json({ error: 'fetch_failed', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ listings: data || [] });
}

// POST /api/listings
// Body: { business_name, category, description?, location?, contact_email?, contact_phone?, website? }
// Creates a new draft listing. Tier defaults to the user's tier; photos can be added
// after creation via PATCH (when the listing has an id).
const VALID_CATEGORIES = new Set(['pro_shop', 'sharpening', 'camp', 'training', 'equipment', 'other']);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const business_name = typeof body.business_name === 'string' ? body.business_name.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  if (!business_name) return NextResponse.json({ error: 'business_name_required' }, { status: 400 });
  if (business_name.length < 2 || business_name.length > 120) {
    return NextResponse.json({ error: 'business_name_length', min: 2, max: 120 }, { status: 400 });
  }
  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'invalid_category', allowed: Array.from(VALID_CATEGORIES) }, { status: 400 });
  }

  // Pull the user's tier so the listing mirrors it.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();

  const insert: Record<string, unknown> = {
    owner_user_id: userId,
    listing_type: 'business',
    business_name,
    category,
    description: typeof body.description === 'string' ? body.description.slice(0, 2000) : null,
    location: typeof body.location === 'string' ? body.location.slice(0, 200) : null,
    contact_email: typeof body.contact_email === 'string' ? body.contact_email.slice(0, 254) : null,
    contact_phone: typeof body.contact_phone === 'string' ? body.contact_phone.slice(0, 50) : null,
    website: typeof body.website === 'string' ? body.website.slice(0, 500) : null,
    tier: profile?.tier || 'free',
    is_published: false,  // start as draft
  };

  const { data, error } = await supabaseAdmin
    .from('listings')
    .insert(insert)
    .select('id, owner_user_id, listing_type, business_name, category, description, location, latitude, longitude, service_radius_km, contact_email, contact_phone, website, logo_url, photos, hours, is_published, tier, created_at, updated_at')
    .single();

  if (error) {
    console.error('[listings POST] insert failed', error);
    return NextResponse.json({ error: 'create_failed', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ listing: data }, { status: 201 });
}
