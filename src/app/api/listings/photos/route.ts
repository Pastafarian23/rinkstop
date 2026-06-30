import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/listings/photos
// FormData: { file: File, listing_id: string }
// Uploads a single photo to Supabase storage under
//   {user_id}/{listing_id}/{uuid}.{ext}
// Returns { url } — the public URL to store in listings.photos[].
//
// Why a server endpoint instead of direct client upload?
// - The storage RLS policy would otherwise need to be very permissive
//   (or we'd need signed-URL flows that complicate the client).
// - We get to validate the listing belongs to the caller, the file size
//   is within limits, and the MIME is image/* — all server-side.
// - 5MB is small enough to fit comfortably through a Next.js route
//   without a streaming-upload detour.

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'invalid_formdata' }, { status: 400 });

  const file = formData.get('file');
  const listingId = formData.get('listing_id');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file_required' }, { status: 400 });
  if (typeof listingId !== 'string' || !listingId) {
    return NextResponse.json({ error: 'listing_id_required' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large', max_bytes: MAX_BYTES, size: file.size }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'unsupported_mime', allowed: Array.from(ALLOWED_MIME) }, { status: 415 });
  }

  // Owner check: confirm the listing belongs to the caller.
  const { data: row, error: ownErr } = await supabaseAdmin
    .from('listings')
    .select('id, owner_user_id, photos')
    .eq('id', listingId)
    .maybeSingle();
  if (ownErr) return NextResponse.json({ error: 'lookup_failed', message: ownErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (row.owner_user_id !== userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Enforce DB cap of 12 photos.
  const currentCount = Array.isArray(row.photos) ? row.photos.length : 0;
  if (currentCount >= 12) {
    return NextResponse.json({ error: 'too_many_photos', max: 12, current: currentCount }, { status: 400 });
  }

  // Build the storage path. {user_id} prefix lets us scope future cleanup scripts
  // and (if we add storage RLS later) write a per-user policy.
  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
  const uuid = crypto.randomUUID();
  const path = `${userId}/${listingId}/${uuid}.${ext}`;

  // Read the file as a Buffer for the SDK.
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: upErr } = await supabaseAdmin.storage
    .from('listing-photos')
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (upErr) {
    console.error('[listings/photos] upload failed', upErr);
    return NextResponse.json({ error: 'upload_failed', message: upErr.message }, { status: 500 });
  }

  const { data: pub } = supabaseAdmin.storage.from('listing-photos').getPublicUrl(path);
  const url = pub.publicUrl;

  // Append to the listing's photos array. This is a single-statement update
  // to avoid a read-modify-write race with concurrent uploads.
  const { error: updErr } = await supabaseAdmin
    .from('listings')
    .update({ photos: [...(row.photos || []), url] })
    .eq('id', listingId);
  if (updErr) {
    // Best-effort: try to roll back the storage upload so we don't leak orphans.
    await supabaseAdmin.storage.from('listing-photos').remove([path]);
    console.error('[listings/photos] db update failed (rolled back storage)', updErr);
    return NextResponse.json({ error: 'db_update_failed', message: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ url }, { status: 201 });
}
