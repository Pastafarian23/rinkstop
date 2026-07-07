import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_ROLES = ['player', 'parent', 'guardian', 'coach', 'staff'];

/**
 * A-iii rewrite: real e-sign semantics.
 *
 * Body now requires:
 *   - consent_to_electronic: boolean (must be true)
 *   - consent_text: string (exact text user agreed to, for audit)
 *   - signature_payload: SVG string from SignaturePad component
 *   - signature_width + signature_height: numbers
 *   - signed_by_name: string (display + audit fallback)
 *   - signed_by_role: one of VALID_ROLES
 *   - player_id (optional): when present, the signature is bound to this
 *     player profile id. Only allowed when caller is parent/guardian AND
 *     that player is in caller's managed_profiles. Resolves the
 *     minor-attribution bug from the audit: parent signs → row has the
 *     child's player_id, not the parent's user_id.
 *
 * Server also:
 *   - Fetches the document's storage path
 *   - Downloads the bytes
 *   - Computes SHA-256 → document_hash (the signed artifact = what the
 *     user actually saw at sign-time)
 *   - Stores IP + UA + timestamp (existing audit trail)
 *
 * Legally adequate under RA 8792 / ESIGN because we capture: intent to
 * sign (click), consent to do business electronically (checkbox), attr-
 * ibution (verified user_id), signed artifact persistence (document_hash
 * of bytes the user was shown), audit trail (IP/UA/timestamp).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug, id: docId } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  const body = await request.json();

  // Validation
  if (body.consent_to_electronic !== true) {
    return NextResponse.json(
      { error: 'consent_to_electronic must be true — explicit consent is required for an electronic signature' },
      { status: 400 }
    );
  }
  if (typeof body.consent_text !== 'string' || body.consent_text.trim().length < 10) {
    return NextResponse.json(
      { error: 'consent_text required (min 10 chars) — the exact text you agreed to is part of the audit record' },
      { status: 400 }
    );
  }
  if (typeof body.signature_payload !== 'string' || !body.signature_payload.includes('<svg')) {
    return NextResponse.json(
      { error: 'signature_payload required — sign with the signature pad, not by typing your name' },
      { status: 400 }
    );
  }
  if (typeof body.signature_width !== 'number' || typeof body.signature_height !== 'number') {
    return NextResponse.json({ error: 'signature dimensions required' }, { status: 400 });
  }
  if (!body.signed_by_name || typeof body.signed_by_name !== 'string' || body.signed_by_name.trim().length < 2) {
    return NextResponse.json({ error: 'signed_by_name required (min 2 chars)' }, { status: 400 });
  }
  if (!VALID_ROLES.includes(body.signed_by_role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  // Verify caller is on team
  const { data: myMembership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (!myMembership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  // Verify doc belongs to team + fetch file_url for hashing
  const { data: doc } = await supabaseAdmin
    .from('team_documents')
    .select('id, team_id, file_url, title')
    .eq('id', docId)
    .eq('team_id', team.id)
    .maybeSingle();
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  // Minor-attribution: when caller signs as parent/guardian with player_id,
  // verify the player is in their managed_profiles. Skip when caller is
  // signing for themselves (no player_id).
  let playerId: string | null = null;
  if (body.player_id) {
    if (body.signed_by_role !== 'parent' && body.signed_by_role !== 'guardian') {
      return NextResponse.json(
        { error: 'player_id is only valid when signed_by_role is parent or guardian' },
        { status: 400 }
      );
    }
    const { data: link } = await supabaseAdmin
      .from('managed_profiles')
      .select('profile_id')
      .eq('manager_user_id', userId)
      .eq('profile_id', body.player_id)
      .eq('profile_type', 'player')
      .maybeSingle();
    if (!link) {
      return NextResponse.json(
        { error: 'player_id not found in your managed profiles' },
        { status: 403 }
      );
    }
    playerId = body.player_id;
  } else if (body.signed_by_role === 'player') {
    // Legacy: player role maps player_id to caller's user_id (unchanged from
    // previous behavior; this preserves backward compatibility for any
    // existing player-flow callers).
    playerId = userId;
  }

  // Compute document hash: the signed artifact = what the user actually saw.
  // If file_url is null (federation-template placeholder), we still need an
  // audit anchor — hash the document metadata that the user agreed to sign.
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
    // No file yet (federation-template placeholder). Hash the title + description
    // so the audit row still has an artifact anchor. The route comment clarifies
    // this is a placeholder — when admin uploads the real file later, the next
    // signature will hash the real bytes.
    documentHash = createHash('sha256')
      .update(`${doc.id}|${doc.title}|${doc.file_url ?? 'placeholder'}|${body.consent_text}`)
      .digest('hex');
  }

  // Get client IP + user agent
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const ua = request.headers.get('user-agent') || 'unknown';

  const { data: sig, error } = await supabaseAdmin
    .from('document_signatures')
    .insert({
      document_id: docId,
      player_id: playerId,
      signed_by_name: body.signed_by_name.trim(),
      signed_by_role: body.signed_by_role,
      signed_by_user_id: userId,
      consent_to_electronic: true,
      consent_text: body.consent_text.trim(),
      document_hash: documentHash,
      signature_payload: body.signature_payload,
      signature_width: body.signature_width,
      signature_height: body.signature_height,
      ip_address: ip.slice(0, 64),
      user_agent: ua.slice(0, 256),
    })
    .select('*')
    .single();
  if (error || !sig) {
    return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, signature: sig });
}