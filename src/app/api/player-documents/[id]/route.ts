/**
 * /api/player-documents/[id]
 *
 * Phase 1b-1 (Player Documents) — prep doc §2.
 * Approved by Arnel 2026-07-06 07:33 CDT (Telegram msg #32742).
 *
 * PATCH: archive a document (status: 'active' | 'expired' -> 'archived').
 *   v1: archive is the only way to "remove" a document. Hard DELETE is
 *   explicitly out of scope (per prep doc §5 Q5 and the 06:08 destructive
 *   action protocol in TOOLS.md).
 *   Body: {} (no body fields; archive is the only PATCH semantics in v1).
 *
 *   If the document belongs to a player whose managed_profiles
 *   .minor_consent_revoked_at is set, re-asserting consent on archive
 *   makes no semantic sense — archive is a separate action. We do NOT
 *   touch managed_profiles here. (Q12 read (a) applies to upload only.)
 *
 * GET: mint a 60-second signed URL for download.
 *   Read-only, but writes a 'view' and 'download' row to the audit table
 *   (per spec — "v1: written on upload, replace, archive, view, and download").
 *
 * Auth: caller must be signed in.
 * Permission gate: managed_profiles row linking caller to the player who
 *   owns the document (the parent check is what gives access — not the
 *   caller's role in any other table).
 *
 * Response: PATCH -> { ok: true, id, status }; GET -> { ok: true, url, expires_in }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId } from '@/lib/connections';
import {
  checkRateLimit,
  getClientIP,
  applyRateLimitHeaders,
  maybeCleanup,
} from '@/lib/rateLimit';

const SIGNED_URL_TTL_SECONDS = 60;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function badRequest(error: string, extra: Record<string, unknown> = {}, status = 400) {
  return NextResponse.json({ error, ...extra }, { status });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`player-documents-archive:${ip}`, { maxRequests: 30, windowMs: 60 * 1000 });
  maybeCleanup();

  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }
  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    (await currentUser())?.emailAddresses?.[0]?.emailAddress ?? ''
  );
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  const { id: docId } = await params;
  if (!docId) {
    const res = badRequest('id_required');
    return applyRateLimitHeaders(res, rl);
  }

  // Look up the document + the linked player in one query.
  const { data: doc, error: docErr } = await supabaseAdmin
    .from('player_documents')
    .select('id, player_id, status')
    .eq('id', docId)
    .maybeSingle();
  if (docErr) {
    console.error('[player-documents PATCH] doc read failed:', docErr);
    const res = NextResponse.json({ error: 'Could not load document.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }
  if (!doc) {
    const res = NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    return applyRateLimitHeaders(res, rl);
  }
  if (doc.status === 'archived') {
    // Idempotent — archive already applied. Don't pretend to mutate.
    const res = NextResponse.json(
      { ok: true, id: doc.id, status: 'archived', already_archived: true },
      { status: 200 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  // Parental link check.
  const { data: link, error: linkErr } = await supabaseAdmin
    .from('managed_profiles')
    .select('id')
    .eq('manager_user_id', userId)
    .eq('profile_id', doc.player_id)
    .eq('profile_type', 'player')
    .maybeSingle();
  if (linkErr) {
    console.error('[player-documents PATCH] managed_profiles read failed:', linkErr);
    const res = NextResponse.json({ error: 'Could not verify parental link.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }
  if (!link) {
    const res = NextResponse.json(
      { error: 'You do not manage this player.' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  // Archive.
  const { data: updated, error: updErr } = await supabaseAdmin
    .from('player_documents')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', docId)
    .select('id, status, updated_at')
    .single();
  if (updErr || !updated) {
    console.error('[player-documents PATCH] update failed:', updErr);
    const res = NextResponse.json({ error: 'Could not archive document.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  // Audit (best-effort, same as upload — failure here does not fail the
  // archive; cheap insurance for future org-side reads).
  // IP defensive cast: audit.ip_address is `inet`. 'unknown' would fail.
  const auditIP = ip && ip !== 'unknown' ? ip : null;
  await supabaseAdmin.from('player_document_audit').insert({
    document_id: docId,
    actor_user_id: userId,
    action: 'archive',
    ip_address: auditIP,
    user_agent: request.headers.get('user-agent') ?? null,
  });

  const res = NextResponse.json({ ok: true, id: updated.id, status: updated.status });
  return applyRateLimitHeaders(res, rl);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`player-documents-download:${ip}`, { maxRequests: 120, windowMs: 60 * 1000 });
  maybeCleanup();

  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }
  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    (await currentUser())?.emailAddresses?.[0]?.emailAddress ?? ''
  );
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  const { id: docId } = await params;
  if (!docId) {
    const res = badRequest('id_required');
    return applyRateLimitHeaders(res, rl);
  }

  // Look up the document + the player.
  const { data: doc, error: docErr } = await supabaseAdmin
    .from('player_documents')
    .select('id, player_id, storage_path, status')
    .eq('id', docId)
    .maybeSingle();
  if (docErr) {
    console.error('[player-documents GET] doc read failed:', docErr);
    const res = NextResponse.json({ error: 'Could not load document.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }
  if (!doc) {
    const res = NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    return applyRateLimitHeaders(res, rl);
  }
  if (doc.status === 'archived') {
    // Archived = "removed" for v1. Don't mint a URL.
    const res = NextResponse.json(
      { error: 'Document is archived.' },
      { status: 410 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  // Parental link check (same as PATCH).
  const { data: link, error: linkErr } = await supabaseAdmin
    .from('managed_profiles')
    .select('id')
    .eq('manager_user_id', userId)
    .eq('profile_id', doc.player_id)
    .eq('profile_type', 'player')
    .maybeSingle();
  if (linkErr) {
    console.error('[player-documents GET] managed_profiles read failed:', linkErr);
    const res = NextResponse.json({ error: 'Could not verify parental link.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }
  if (!link) {
    const res = NextResponse.json(
      { error: 'You do not manage this player.' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  // Mint a signed URL.
  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from('player-documents')
    .createSignedUrl(doc.storage_path, SIGNED_URL_TTL_SECONDS);
  if (signErr || !signed) {
    console.error('[player-documents GET] signed URL failed:', signErr);
    // Common case: storage object was deleted but DB row still exists
    // (v1 has no DELETE policy, but a Supabase Dashboard or migration
    // could orphan the file). Surface a useful message instead of a
    // raw storage error.
    const isMissing =
      signErr?.message?.toLowerCase().includes('not found') ||
      signErr?.message?.toLowerCase().includes('object not found');
    const res = NextResponse.json(
      {
        error: isMissing ? 'file_missing' : 'sign_failed',
        message: signErr?.message ?? 'Failed to sign URL.',
      },
      { status: isMissing ? 410 : 500 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  // Audit — write both 'view' and 'download' for a single signed URL mint
  // (the user is going to use it to download; we don't have a separate
  // "view" event because the UI just opens the URL).
  const auditIP = ip && ip !== 'unknown' ? ip : null;
  await supabaseAdmin.from('player_document_audit').insert([
    {
      document_id: docId,
      actor_user_id: userId,
      action: 'view',
      ip_address: auditIP,
      user_agent: request.headers.get('user-agent') ?? null,
    },
    {
      document_id: docId,
      actor_user_id: userId,
      action: 'download',
      ip_address: auditIP,
      user_agent: request.headers.get('user-agent') ?? null,
    },
  ]);

  const res = NextResponse.json({
    ok: true,
    url: signed.signedUrl,
    expires_in: SIGNED_URL_TTL_SECONDS,
  });
  return applyRateLimitHeaders(res, rl);
}
