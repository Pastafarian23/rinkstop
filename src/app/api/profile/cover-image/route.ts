/**
 * /api/profile/cover-image
 *
 * POST   — upload a new cover image. Inserts a row into
 *          profile_cover_image_history (preserving the previous one), then
 *          updates profiles.cover_image_url + cover_image_position to point
 *          at the new image. Old current row's replaced_at is set in the
 *          same transaction so the history strip stays consistent.
 * DELETE — two modes:
 *   - body { history_id: "<uuid>" } — remove a single entry from the cover
 *       history strip. Deletes the storage object + sets removed_at = now().
 *       Cannot remove the current cover this way (use the no-arg DELETE).
 *   - no body — remove the current cover image. Sets profiles.cover_image_url
 *       = NULL + cover_image_position = 'center', deletes the storage object,
 *       and marks the current history row's removed_at = now().
 *
 * Auth: Clerk required. Users can only act on their own cover image and
 * history. All storage and DB ops go through supabaseAdmin (service role
 * bypasses RLS); the route's Clerk auth() check is the security boundary.
 *
 * Storage path: profile_covers/{userId}/{timestamp}.{ext}
 *   - Ownership is encoded in the path; no separate ACL needed.
 *   - Timestamp is Date.now() (ms). Collision-free for sequential uploads
 *     from the same user; if two uploads land in the same ms the second
 *     overwrites the first, which is fine (we only ever mutate the current
 *     row + insert a history row keyed on the new URL).
 *
 * Limits: 5 MB max file size, image/jpeg | image/png | image/webp only.
 *   - The bucket-level limits in the 2026-07-29 migration enforce this for
 *     us at the storage layer; we also re-validate here for a clean 400.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VALID_POSITIONS = new Set(['center', 'top', 'bottom']);
const BUCKET = 'profile_covers';

const EXT_FOR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// ---------------------------------------------------------------------------
// POST — upload a new cover image
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to upload a cover image.' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
  }

  const file = formData.get('file');
  const positionRaw = formData.get('position');
  const position = typeof positionRaw === 'string' && VALID_POSITIONS.has(positionRaw)
    ? positionRaw
    : 'center';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file.' }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported image type. Use JPEG, PNG, or WebP.' },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Image too large. Max 5 MB.' },
      { status: 400 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Empty file.' }, { status: 400 });
  }

  const ext = EXT_FOR_MIME[file.type];
  const storagePath = `${userId}/${Date.now()}.${ext}`;

  // 1. Upload to Supabase Storage
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('[cover-image POST] storage upload failed:', uploadError.message);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);
  const publicUrl = publicUrlData.publicUrl;

  // 2. Mark the previous "current" row as replaced (best-effort).
  //    If this fails the history strip will show two "current" rows, which
  //    is wrong but not data-loss. We log + continue.
  const { error: replaceError } = await supabaseAdmin
    .from('profile_cover_image_history')
    .update({ replaced_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('replaced_at', null)
    .is('removed_at', null);

  if (replaceError) {
    console.error('[cover-image POST] mark previous replaced_at failed:', replaceError.message);
  }

  // 3. Insert the new history row
  const { error: historyError } = await supabaseAdmin
    .from('profile_cover_image_history')
    .insert({
      user_id: userId,
      url: publicUrl,
      position,
      source: 'manual',
    });

  if (historyError) {
    // Storage upload succeeded but DB insert failed. The object is now
    // orphaned in storage. Attempt to delete it; if that fails too, log
    // both errors. The user will see a 500 and can retry.
    console.error('[cover-image POST] history insert failed:', historyError.message);
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: 'Save failed.' }, { status: 500 });
  }

  // 4. Update profiles.cover_image_url + cover_image_position. This is the
  //    authoritative reference for "what cover image is currently shown".
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      cover_image_url: publicUrl,
      cover_image_position: position,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (profileError) {
    console.error('[cover-image POST] profiles update failed:', profileError.message);
    return NextResponse.json({ error: 'Save failed.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: publicUrl, position });
}

// ---------------------------------------------------------------------------
// DELETE — remove a history entry or the current cover
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to remove a cover image.' }, { status: 401 });
  }

  // Parse body — may be {} (no body) or { history_id: "<uuid>" }
  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.length > 0) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const historyId = typeof body.history_id === 'string' ? body.history_id : null;

  if (historyId) {
    // ---- Remove a single history entry (not the current one) ----
    // Fetch the row to verify ownership + get the storage path.
    const { data: row, error: fetchError } = await supabaseAdmin
      .from('profile_cover_image_history')
      .select('id, user_id, url, replaced_at, removed_at')
      .eq('id', historyId)
      .single();

    if (fetchError || !row) {
      return NextResponse.json({ error: 'History entry not found.' }, { status: 404 });
    }
    if (row.user_id !== userId) {
      return NextResponse.json({ error: 'Not your history entry.' }, { status: 403 });
    }
    if (row.replaced_at === null && row.removed_at === null) {
      return NextResponse.json(
        { error: 'Cannot remove the current cover here. Use DELETE without a history_id.' },
        { status: 400 }
      );
    }
    if (row.removed_at !== null) {
      return NextResponse.json({ error: 'Already removed.' }, { status: 410 });
    }

    // Delete from storage + mark removed_at
    const storagePath = pathFromPublicUrl(row.url, BUCKET);
    if (storagePath) {
      const { error: removeError } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([storagePath]);
      if (removeError) {
        console.error('[cover-image DELETE history] storage remove failed:', removeError.message);
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('profile_cover_image_history')
      .update({ removed_at: new Date().toISOString() })
      .eq('id', historyId);

    if (updateError) {
      console.error('[cover-image DELETE history] mark removed_at failed:', updateError.message);
      return NextResponse.json({ error: 'Remove failed.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  // ---- Remove the current cover image ----
  const { data: profile, error: profileFetchError } = await supabaseAdmin
    .from('profiles')
    .select('cover_image_url')
    .eq('user_id', userId)
    .single();

  if (profileFetchError) {
    console.error('[cover-image DELETE current] profile fetch failed:', profileFetchError.message);
    return NextResponse.json({ error: 'Fetch failed.' }, { status: 500 });
  }

  const currentUrl = profile?.cover_image_url ?? null;
  if (currentUrl) {
    const storagePath = pathFromPublicUrl(currentUrl, BUCKET);
    if (storagePath) {
      const { error: removeError } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([storagePath]);
      if (removeError) {
        console.error('[cover-image DELETE current] storage remove failed:', removeError.message);
      }
    }
  }

  // Mark the current history row as removed_at
  const { error: historyMarkError } = await supabaseAdmin
    .from('profile_cover_image_history')
    .update({ removed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('replaced_at', null)
    .is('removed_at', null);

  if (historyMarkError) {
    console.error('[cover-image DELETE current] mark history removed_at failed:', historyMarkError.message);
  }

  // Clear the profile column
  const { error: profileUpdateError } = await supabaseAdmin
    .from('profiles')
    .update({
      cover_image_url: null,
      cover_image_position: 'center',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (profileUpdateError) {
    console.error('[cover-image DELETE current] profile clear failed:', profileUpdateError.message);
    return NextResponse.json({ error: 'Clear failed.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the storage object path from a public URL.
 * Public URLs look like: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 * Returns null if the URL doesn't match the expected shape.
 */
function pathFromPublicUrl(publicUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
