/**
 * POST /api/team/[slug]/logo
 *
 * Uploads a team logo to Supabase storage under team-logos/{team_id}/{uuid}.{ext}
 * and updates team_workspaces.avatar_url.
 *
 * Auth: Clerk required. Must be an admin of the target team.
 *
 * Body: multipart/form-data { file: File }
 *
 * Returns: { ok: true, url: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminRole } from '@/lib/team';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = 'team-logos';

const EXT_FOR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to upload a team logo.' }, { status: 401 });
  }

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  if (!normalizedSlug) {
    return NextResponse.json({ error: 'missing_slug' }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
  }

  const file = formData.get('file');
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
    return NextResponse.json({ error: 'Image too large. Max 5 MB.' }, { status: 413 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Empty file.' }, { status: 400 });
  }

  // Load team + verify admin membership
  const { data: team, error: teamErr } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, avatar_url')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (teamErr) {
    return NextResponse.json({ error: 'team_lookup_failed', message: teamErr.message }, { status: 500 });
  }
  if (!team) {
    return NextResponse.json({ error: 'team_not_found' }, { status: 404 });
  }

  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'not_a_member' }, { status: 403 });
  }
  if (!isAdminRole(membership.role)) {
    return NextResponse.json({ error: 'not_admin' }, { status: 403 });
  }

  // Remove the old logo from storage (best-effort) so we don't leak orphans.
  const oldUrl = team.avatar_url ?? null;
  if (oldUrl) {
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = oldUrl.indexOf(marker);
    if (idx !== -1) {
      const oldPath = oldUrl.slice(idx + marker.length);
      try {
        await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
      } catch {
        // swallow — best-effort cleanup
      }
    }
  }

  // Upload the new logo
  const ext = EXT_FOR_MIME[file.type];
  const storagePath = `${team.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('[team/logo POST] storage upload failed:', uploadError.message);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);
  const publicUrl = publicUrlData.publicUrl;

  // Update team_workspaces.avatar_url
  const { error: updateError } = await supabaseAdmin
    .from('team_workspaces')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', team.id);

  if (updateError) {
    console.error('[team/logo POST] team update failed:', updateError.message);
    // Best-effort: try to roll back the storage upload
    try {
      await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
    } catch {
      // swallow
    }
    return NextResponse.json({ error: 'Save failed.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: publicUrl });
}