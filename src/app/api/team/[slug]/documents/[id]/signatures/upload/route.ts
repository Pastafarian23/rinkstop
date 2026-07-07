import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_ROLES = ['player', 'parent', 'guardian', 'coach', 'staff'];

const VALID_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10MB — matches admin upload cap

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/**
 * A-v: wet-ink signature upload route.
 *
 * Parallel to POST .../sign (A-iii): same legal moment of agreement, same
 * audit trail (consent_to_electronic + consent_text + document_hash +
 * ip_address + user_agent), same UNIQUE (document_id, signed_by_user_id)
 * constraint from A-iv. The only differences are:
 *
 *   - signature_payload is the SIGNED URL of the uploaded image/PDF, not
 *     an SVG string. The sign route validates `payload.includes('<svg')`;
 *     this route validates `payload.startsWith('https://')`.
 *   - signature_width / signature_height are null (no canvas dimensions).
 *   - The signature_payload is stored in `signed-uploads/{document_id}/...`
 *     in the same bucket as the source docs.
 *
 * Authorization:
 *   - Caller must be a team member (any role).
 *   - For docs with a recipient list (team_document_recipients), the caller
 *     must be on it. For broadcast docs (no recipient rows), any team member
 *     can sign.
 *
 * Returns:
 *   - 201 { ok: true, signature }
 *   - 409 { error: 'Already signed', code: 'duplicate' } on UNIQUE conflict
 *   - 413 on file > MAX_BYTES
 *   - 415 on disallowed mime
 *   - 400 on validation
 *   - 401 / 403 / 404 on auth/team/doc checks
 *
 * No withdraw endpoint — same legal model as canvas (A-iv precedent).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug, id: docId } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  // Parse multipart form. Native FormData (NextRequest extends Request).
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const file = form.get('file');
  const consentToElectronic = form.get('consent_to_electronic');
  const consentText = form.get('consent_text');
  const signedByName = form.get('signed_by_name');
  const signedByRole = form.get('signed_by_role');
  const playerIdRaw = form.get('player_id');

  // Validation
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'file is empty' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `file too large (max ${MAX_BYTES / 1024 / 1024}MB)` },
      { status: 413 }
    );
  }
  if (!VALID_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `mime type ${file.type || 'unknown'} not allowed — use JPEG, PNG, WEBP, or PDF` },
      { status: 415 }
    );
  }

  if (consentToElectronic !== 'true') {
    return NextResponse.json(
      { error: 'consent_to_electronic must be true — explicit consent is required for an electronic signature' },
      { status: 400 }
    );
  }
  if (typeof consentText !== 'string' || consentText.trim().length < 10) {
    return NextResponse.json(
      { error: 'consent_text required (min 10 chars) — the exact text you agreed to is part of the audit record' },
      { status: 400 }
    );
  }
  if (typeof signedByName !== 'string' || signedByName.trim().length < 2) {
    return NextResponse.json({ error: 'signed_by_name required (min 2 chars)' }, { status: 400 });
  }
  if (typeof signedByRole !== 'string' || !VALID_ROLES.includes(signedByRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const playerIdInput = typeof playerIdRaw === 'string' && playerIdRaw.trim().length > 0
    ? playerIdRaw.trim()
    : null;

  // Resolve team
  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  // Caller must be on team
  const { data: myMembership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (!myMembership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  // Doc must belong to team
  const { data: doc } = await supabaseAdmin
    .from('team_documents')
    .select('id, team_id, file_url, title, required')
    .eq('id', docId)
    .eq('team_id', team.id)
    .maybeSingle();
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  // Recipient gating (A-i): if the doc has a recipient list, caller must be on it.
  // Broadcast docs (no recipients or all-team distribution) skip this gate.
  const { data: recipientRow } = await supabaseAdmin
    .from('team_document_recipients')
    .select('id')
    .eq('document_id', docId)
    .eq('recipient_user_id', userId)
    .maybeSingle();

  const { count: recipientCount } = await supabaseAdmin
    .from('team_document_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('document_id', docId);

  if ((recipientCount ?? 0) > 0 && !recipientRow) {
    return NextResponse.json(
      { error: 'You are not a recipient of this document' },
      { status: 403 }
    );
  }

  // Minor-attribution (A-ii): when caller signs as parent/guardian with player_id,
  // verify the player is in their managed_profiles.
  let playerId: string | null = null;
  if (playerIdInput) {
    if (signedByRole !== 'parent' && signedByRole !== 'guardian') {
      return NextResponse.json(
        { error: 'player_id is only valid when signed_by_role is parent or guardian' },
        { status: 400 }
      );
    }
    const { data: link } = await supabaseAdmin
      .from('managed_profiles')
      .select('profile_id')
      .eq('manager_user_id', userId)
      .eq('profile_id', playerIdInput)
      .eq('profile_type', 'player')
      .maybeSingle();
    if (!link) {
      return NextResponse.json(
        { error: 'player_id not found in your managed profiles' },
        { status: 403 }
      );
    }
    playerId = playerIdInput;
  } else if (signedByRole === 'player') {
    // Legacy parity with canvas route: player role maps player_id to caller's user_id.
    playerId = userId;
  }

  // Compute document hash — same as sign route: hash bytes the signer was shown.
  let documentHash: string;
  if (doc.file_url) {
    const { data: fileBlob, error: dlErr } = await supabaseAdmin.storage
      .from('team-documents')
      .download(doc.file_url);
    if (dlErr || !fileBlob) {
      return NextResponse.json(
        { error: 'Could not load document bytes for signing audit: ' + (dlErr?.message || 'unknown') },
        { status: 500 }
      );
    }
    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    documentHash = createHash('sha256').update(buffer).digest('hex');
  } else {
    documentHash = createHash('sha256')
      .update(`${doc.id}|${doc.title}|${doc.file_url ?? 'placeholder'}|${consentText}`)
      .digest('hex');
  }

  // Upload the signed image to storage BEFORE inserting the DB row.
  // If DB insert fails, we clean up the storage object (best-effort).
  const ext = EXT_BY_MIME[file.type];
  const ts = Date.now();
  const storagePath = `signed-uploads/${docId}/${userId}-${ts}.${ext}`;

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabaseAdmin.storage
    .from('team-documents')
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });
  if (upErr) {
    return NextResponse.json(
      { error: 'Upload failed: ' + upErr.message },
      { status: 500 }
    );
  }

  // Issue a signed URL the admin can use to view the wet-ink image later.
  // 60s expiry is fine for audit retrieval — we re-issue on each admin view.
  const { data: signedUrlData, error: signedUrlErr } = await supabaseAdmin.storage
    .from('team-documents')
    .createSignedUrl(storagePath, 60);
  if (signedUrlErr || !signedUrlData?.signedUrl) {
    // Roll back the upload if we can't issue a view URL.
    await supabaseAdmin.storage.from('team-documents').remove([storagePath]);
    return NextResponse.json(
      { error: 'Could not issue signed URL: ' + (signedUrlErr?.message || 'unknown') },
      { status: 500 }
    );
  }

  // Audit trail
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const ua = request.headers.get('user-agent') || 'unknown';

  const { data: sig, error } = await supabaseAdmin
    .from('document_signatures')
    .insert({
      document_id: docId,
      player_id: playerId,
      signed_by_name: signedByName.trim(),
      signed_by_role: signedByRole,
      signed_by_user_id: userId,
      consent_to_electronic: true,
      consent_text: consentText.trim(),
      document_hash: documentHash,
      signature_payload: signedUrlData.signedUrl,
      signature_width: null,
      signature_height: null,
      ip_address: ip.slice(0, 64),
      user_agent: ua.slice(0, 256),
    })
    .select('*')
    .single();

  if (error || !sig) {
    // Roll back the storage upload on DB insert failure.
    // Special-case: if the failure is a UNIQUE violation (23505), this is the
    // "already signed" path — return 409 instead of 500, but still clean up
    // the orphan upload so we don't leave clutter.
    const isUniqueViolation = (error as { code?: string } | null)?.code === '23505';
    await supabaseAdmin.storage.from('team-documents').remove([storagePath]);

    if (isUniqueViolation) {
      return NextResponse.json(
        { error: 'Already signed', code: 'duplicate' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, signature: sig });
}