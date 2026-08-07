import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isClerkDefaultAvatarUrl } from '@/lib/avatar';

/**
 * POST /api/profiles/me/photo
 *
 * Called by ChangePhotoButton after a successful Clerk upload, and by
 * the Clerk webhook on user.updated events. Both paths write the new
 * avatar_url to profiles AND append a row to profile_photo_history.
 *
 * Body:
 *   { avatar_url: string | null, removed?: boolean, source: 'manual' | 'clerk_webhook' | 'reset' }
 *
 *   - avatar_url: the new URL Clerk is serving (null if removed)
 *   - removed: optional flag; if true, the previous current row gets
 *     removed_at = now() and no new row is inserted (so the user
 *     appears as initials)
 *   - source: 'manual' for the button, 'clerk_webhook' for the
 *     external sync path, 'reset' for the admin reset
 *
 * Returns: { ok: true, historyId?: string }
 *
 * Idempotency: if the new URL already matches the current row's URL,
 * this is a no-op. The button and webhook can both fire for the same
 * photo change without creating duplicate history rows.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  let body: { avatar_url?: string | null; removed?: boolean; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const avatarUrl = body.avatar_url ?? null;
  const removed = body.removed === true;
  const source = (body.source || 'manual') as 'manual' | 'clerk_webhook' | 'reset';
  if (!['manual', 'clerk_webhook', 'reset'].includes(source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
  }

  // If the incoming URL is Clerk's auto-generated initials placeholder
  // (purple silhouette), drop it — it's not a real photo choice. We still
  // sync profiles.avatar_url to null so the user sees the placeholder
  // rendered by Clerk, but we never write it to history.
  if (isClerkDefaultAvatarUrl(avatarUrl)) {
    await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    return NextResponse.json({ ok: true, noop: 'clerk_default' });
  }

  // Idempotency check: skip work if the new URL already matches the
  // current history row (webhook + button race-safe).
  const { data: current } = await supabaseAdmin
    .from('profile_photo_history')
    .select('id, url')
    .eq('user_id', userId)
    .is('replaced_at', null)
    .is('removed_at', null)
    .maybeSingle();
  const currentUrl = current?.url ?? null;
  if (currentUrl === avatarUrl) {
    // Also keep profiles.avatar_url in sync if it's drifted
    if (avatarUrl) {
      await supabaseAdmin
        .from('profiles')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }
    return NextResponse.json({ ok: true, noop: true });
  }

  if (removed) {
    // Removal: mark the current row removed_at = now(). No new row.
    if (current) {
      const { error: updErr } = await supabaseAdmin
        .from('profile_photo_history')
        .update({ removed_at: new Date().toISOString() })
        .eq('id', current.id);
      if (updErr) {
        console.error('[photo] remove failed', updErr);
        return NextResponse.json({ error: 'History update failed' }, { status: 500 });
      }
    }
  } else if (avatarUrl) {
    // New photo: mark current row replaced_at, then insert new row.
    const now = new Date().toISOString();
    if (current) {
      const { error: replErr } = await supabaseAdmin
        .from('profile_photo_history')
        .update({ replaced_at: now })
        .eq('id', current.id);
      if (replErr) {
        console.error('[photo] replace failed', replErr);
        return NextResponse.json({ error: 'History replace failed' }, { status: 500 });
      }
    }
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('profile_photo_history')
      .insert({
        user_id: userId,
        url: avatarUrl,
        source,
        set_at: now,
      })
      .select('id')
      .single();
    if (insErr) {
      console.error('[photo] insert failed', insErr);
      return NextResponse.json({ error: 'History insert failed' }, { status: 500 });
    }
    // Also update profiles.avatar_url so the public profile page
    // (which reads from profiles, not from history) shows the new image.
    const { error: profErr } = await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: avatarUrl, updated_at: now })
      .eq('user_id', userId);
    if (profErr) {
      console.error('[photo] profiles update failed', profErr);
      return NextResponse.json({ error: 'Profile update failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, historyId: inserted.id });
  } else {
    // avatar_url is null and removed is false — nothing to do.
    return NextResponse.json({ ok: true, noop: true });
  }

  // removed path: also clear profiles.avatar_url
  if (removed) {
    await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  return NextResponse.json({ ok: true });
}
