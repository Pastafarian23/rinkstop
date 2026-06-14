import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// DELETE /api/listings/photos/delete
// Body: { listing_id: string, url: string }
// Removes a single photo from the listing's photos array AND from storage.
// Owner check enforced. Idempotent: missing storage object is not an error.

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { listing_id?: string; url?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const listingId = typeof body.listing_id === 'string' ? body.listing_id : '';
  const url = typeof body.url === 'string' ? body.url : '';
  if (!listingId || !url) return NextResponse.json({ error: 'listing_id_and_url_required' }, { status: 400 });

  const { data: row, error: ownErr } = await supabaseAdmin
    .from('listings')
    .select('id, owner_user_id, photos')
    .eq('id', listingId)
    .maybeSingle();
  if (ownErr) return NextResponse.json({ error: 'lookup_failed', message: ownErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (row.owner_user_id !== userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Extract the storage path from the URL.
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/listing-photos\/(.+?)(?:\?|$)/);
  if (m) {
    const path = m[1];
    const { error: storageErr } = await supabaseAdmin.storage
      .from('listing-photos')
      .remove([path]);
    if (storageErr) {
      console.warn('[listings/photos/delete] storage remove failed (continuing):', storageErr);
    }
  }

  const next = (row.photos || []).filter((p: string) => p !== url);
  if (next.length === (row.photos || []).length) {
    // URL not in the array — nothing to do.
    return NextResponse.json({ ok: true, photos: next });
  }

  const { error: updErr } = await supabaseAdmin
    .from('listings')
    .update({ photos: next })
    .eq('id', listingId);
  if (updErr) {
    console.error('[listings/photos/delete] db update failed', updErr);
    return NextResponse.json({ error: 'db_update_failed', message: updErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, photos: next });
}
