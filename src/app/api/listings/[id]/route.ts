import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

const VALID_CATEGORIES = new Set(['pro_shop', 'sharpening', 'camp', 'training', 'equipment', 'other']);

// Owner check helper — fetches the listing and confirms the caller owns it.
// Returns the row on success, NextResponse on failure.
async function getOwnedListing(listingId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('id, owner_user_id')
    .eq('id', listingId)
    .maybeSingle();
  if (error) {
    return { err: NextResponse.json({ error: 'fetch_failed', message: error.message }, { status: 500 }) };
  }
  if (!data) {
    return { err: NextResponse.json({ error: 'not_found' }, { status: 404 }) };
  }
  if (data.owner_user_id !== userId) {
    return { err: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { row: data };
}

// GET /api/listings/[id]
// Returns a single listing. Owner only (a public /partners directory view
// will be a separate read endpoint that hits Supabase directly with RLS).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const owned = await getOwnedListing(id, userId);
  if ('err' in owned) return owned.err;

  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('id, owner_user_id, listing_type, business_name, category, description, location, latitude, longitude, service_radius_km, contact_email, contact_phone, website, logo_url, photos, hours, is_published, tier, created_at, updated_at')
    .eq('id', id)
    .single();
  if (error) {
    console.error('[listings GET id] failed', error);
    return NextResponse.json({ error: 'fetch_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ listing: data });
}

// PATCH /api/listings/[id]
// Body: any subset of editable fields. All edits are owner-only.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const owned = await getOwnedListing(id, userId);
  if ('err' in owned) return owned.err;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const update: Record<string, unknown> = {};

  if ('business_name' in body) {
    const v = typeof body.business_name === 'string' ? body.business_name.trim() : '';
    if (!v || v.length < 2 || v.length > 120) {
      return NextResponse.json({ error: 'business_name_length', min: 2, max: 120 }, { status: 400 });
    }
    update.business_name = v;
  }
  if ('category' in body) {
    const v = typeof body.category === 'string' ? body.category.trim() : '';
    if (!VALID_CATEGORIES.has(v)) {
      return NextResponse.json({ error: 'invalid_category', allowed: Array.from(VALID_CATEGORIES) }, { status: 400 });
    }
    update.category = v;
  }
  if ('description' in body) {
    const v = body.description;
    update.description = typeof v === 'string' ? v.slice(0, 2000) : null;
  }
  if ('location' in body) {
    const v = body.location;
    update.location = typeof v === 'string' ? v.slice(0, 200) : null;
  }
  if ('contact_email' in body) {
    const v = body.contact_email;
    update.contact_email = typeof v === 'string' && v.trim() ? v.trim().slice(0, 254) : null;
  }
  if ('contact_phone' in body) {
    const v = body.contact_phone;
    update.contact_phone = typeof v === 'string' ? v.slice(0, 50) : null;
  }
  if ('website' in body) {
    const v = body.website;
    update.website = typeof v === 'string' ? v.slice(0, 500) : null;
  }
  if ('is_published' in body) {
    update.is_published = body.is_published === true;
  }
  if ('hours' in body) {
    // hours is jsonb, expected shape: { mon: '9-17', tue: '9-17', ... } or null
    const v = body.hours;
    if (v === null) {
      update.hours = null;
    } else if (typeof v === 'object') {
      update.hours = v;
    } else {
      return NextResponse.json({ error: 'hours_must_be_object_or_null' }, { status: 400 });
    }
  }
  if ('photos' in body) {
    // photos is text[]. Caller passes the full ordered array (reorder + add + remove).
    const v = body.photos;
    if (!Array.isArray(v) || v.length > 12) {
      return NextResponse.json({ error: 'photos_must_be_array_max_12' }, { status: 400 });
    }
    if (!v.every((x) => typeof x === 'string')) {
      return NextResponse.json({ error: 'photos_must_be_string_array' }, { status: 400 });
    }
    update.photos = v;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('listings')
    .update(update)
    .eq('id', id)
    .select('id, owner_user_id, listing_type, business_name, category, description, location, latitude, longitude, service_radius_km, contact_email, contact_phone, website, logo_url, photos, hours, is_published, tier, created_at, updated_at')
    .single();

  if (error) {
    console.error('[listings PATCH id] failed', error);
    return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ listing: data });
}

// DELETE /api/listings/[id]
// Hard delete. Owner only. Cascades: leads.listing_id has no FK so any
// leads pointing at this listing become orphans (acceptable — Phase 2).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const owned = await getOwnedListing(id, userId);
  if ('err' in owned) return owned.err;

  // Best-effort: also delete photos from storage. Failures here are logged
  // but don't block the DB delete — orphan photos are cheaper than stuck deletes.
  const { data: photosRow } = await supabaseAdmin
    .from('listings')
    .select('photos')
    .eq('id', id)
    .single();
  if (photosRow?.photos && Array.isArray(photosRow.photos) && photosRow.photos.length > 0) {
    const paths = photosRow.photos
      .map((url: string) => {
        const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/listing-photos\/(.+?)(?:\?|$)/);
        return m ? m[1] : null;
      })
      .filter((p: string | null): p is string => !!p);
    if (paths.length > 0) {
      const { error: storageErr } = await supabaseAdmin.storage
        .from('listing-photos')
        .remove(paths);
      if (storageErr) {
        console.warn('[listings DELETE] storage cleanup failed (continuing):', storageErr);
      }
    }
  }

  const { error } = await supabaseAdmin
    .from('listings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[listings DELETE id] failed', error);
    return NextResponse.json({ error: 'delete_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
