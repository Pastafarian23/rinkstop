/**
 * /api/player-documents
 *
 * Phase 1b-1 (Player Documents) — prep doc §2.
 * Approved by Arnel 2026-07-06 07:33 CDT (Telegram msg #32742).
 *
 * POST: upload one-or-more documents for a single linked child.
 *   FormData fields (one batch = one child, per Q7 follow-up defaults):
 *     - player_id: uuid (required, must be linked to caller via managed_profiles)
 *     - files: one or more File entries (required, 1-5 per batch)
 *     - items[N][category]: one of 7 enum values
 *     - items[N][title]: string 1-100
 *     - items[N][description]: optional string <= 500
 *     - items[N][expires_at]: optional YYYY-MM-DD (only for waiver/medical/vaccination)
 *   All-or-nothing semantics: if any file in the batch fails validation
 *   or storage upload, the entire batch is rejected and any partial state
 *   is rolled back. This matches the Q7 follow-up default ("all-or-nothing Save,
 *   no partial-success state in v1, no server-side staging").
 *
 *   Per-batch consent re-assertion: if the caller is the parent of a minor
 *   whose managed_profiles.minor_consent_revoked_at is set, the route writes
 *   parent_consent_at = now() (and clears minor_consent_revoked_at) on
 *   submit. This is per Q12 read (a) — no RLS check on minor_consent_revoked_at,
 *   re-assert consent at upload time.
 *
 * Auth: caller must be signed in.
 * Tier gate: caller must be identity_plus+ OR business_listing+ (matches wizard gate).
 * Account-type gate: caller must have 'parent' in profile_account_types.
 * Permission gate: managed_profiles row where manager_user_id=current_user_id AND
 *   profile_id=player_id must exist (parental link).
 *
 * Response: { ok: true, uploaded: [{ id, file_name, title, status, ... }, ...] }
 *
 * GET: list documents for a player.
 *   Query params: player_id=uuid (required)
 *   Returns active + archived (separately), plus computes status='expired'
 *   on read if expires_at < current_date (v1: not a trigger).
 *
 * Why two endpoints (POST collection, GET collection) instead of [id]:
 *   - The list query is the hot path on /dashboard/family and /dashboard/profile.
 *   - PATCH /[id] is handled in a separate route for archive + signed-URL mint.
 *   - Mirrors listings/photos (POST collection, multi-file route shape).
 *
 * Storage: 'player-documents' bucket (private, signed URLs only). RLS already
 *   configured: see supabase/migrations/_HAND_APPLIED.md 2026-07-06 entry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId } from '@/lib/connections';
import { tierAtLeastSameTrack } from '@/lib/tier-gate';
import { isAccountType } from '@/components/dashboard/dashboardTypes';
import {
  checkRateLimit,
  getClientIP,
  applyRateLimitHeaders,
  maybeCleanup,
} from '@/lib/rateLimit';

const MAX_FILES_PER_BATCH = 5;
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB cap matches the database CHECK constraint
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
]);
const ALLOWED_CATEGORIES = new Set([
  'birth_certificate',
  'waiver',
  'medical_form',
  'vaccination_record',
  'proof_of_residence',
  'photo_id',
  'other',
]);
// Categories where an expiry date is meaningful.
const EXPIRY_ALLOWED = new Set(['waiver', 'medical_form', 'vaccination_record']);

// Tier gate — match the wizard gate. A user on a paid business tier
// (business_listing+) is also allowed. Free fans cannot upload player
// documents.
function tierOk(tier: string | null | undefined): boolean {
  return (
    tierAtLeastSameTrack(tier, 'identity_plus') ||
    tierAtLeastSameTrack(tier, 'business_listing')
  );
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface UploadedRow {
  id: string;
  file_name: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
}

function badRequest(error: string, extra: Record<string, unknown> = {}, status = 400) {
  return NextResponse.json({ error, ...extra }, { status });
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`player-documents-upload:${ip}`, { maxRequests: 30, windowMs: 60 * 1000 });
  maybeCleanup();

  // ---- Auth ----
  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    (await currentUser())?.emailAddresses?.[0]?.emailAddress || ''
  );
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  // ---- FormData parse ----
  const formData = await request.formData().catch((): null => null);
  if (!formData) {
    const res = badRequest('invalid_formdata');
    return applyRateLimitHeaders(res, rl);
  }

  const playerId = formData.get('player_id');
  if (typeof playerId !== 'string' || !playerId) {
    const res = badRequest('player_id_required');
    return applyRateLimitHeaders(res, rl);
  }

  // Collect files — accept both single 'files' field (1 entry per row, repeated)
  // and multi-file 'files' entries. Some browsers flatten repeated form keys;
  // getAll('files') is the safe path.
  const fileEntries = formData.getAll('files').filter((f): f is File => f instanceof File);
  if (fileEntries.length === 0) {
    const res = badRequest('files_required', { min: 1 });
    return applyRateLimitHeaders(res, rl);
  }
  if (fileEntries.length > MAX_FILES_PER_BATCH) {
    const res = badRequest('too_many_files', { max: MAX_FILES_PER_BATCH, got: fileEntries.length });
    return applyRateLimitHeaders(res, rl);
  }

  // Per-file metadata — items[N][...] indexed form keys. Accept either
  // 'items[N][field]' or 'items[field]' (the latter assumes order = files).
  // We only support the indexed form in v1 (the review panel builds that shape).
  const meta: Array<{
    category: string;
    title: string;
    description: string | null;
    expires_at: string | null;
  }> = [];

  for (let i = 0; i < fileEntries.length; i++) {
    const cat = formData.get(`items[${i}][category]`);
    const title = formData.get(`items[${i}][title]`);
    const description = formData.get(`items[${i}][description]`);
    const expiresAt = formData.get(`items[${i}][expires_at]`);

    if (typeof cat !== 'string' || !ALLOWED_CATEGORIES.has(cat)) {
      const res = badRequest('invalid_category', { index: i, value: cat });
      return applyRateLimitHeaders(res, rl);
    }
    if (typeof title !== 'string' || title.length < 1 || title.length > 100) {
      const res = badRequest('invalid_title', { index: i, length: typeof title === 'string' ? title.length : 0 });
      return applyRateLimitHeaders(res, rl);
    }
    if (description !== null && description !== undefined && typeof description !== 'string') {
      const res = badRequest('invalid_description', { index: i });
      return applyRateLimitHeaders(res, rl);
    }
    if (description && (description as string).length > 500) {
      const res = badRequest('description_too_long', { index: i, max: 500 });
      return applyRateLimitHeaders(res, rl);
    }
    if (expiresAt !== null && expiresAt !== undefined) {
      if (typeof expiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
        const res = badRequest('invalid_expires_at', { index: i });
        return applyRateLimitHeaders(res, rl);
      }
      if (!EXPIRY_ALLOWED.has(cat)) {
        const res = badRequest('expires_at_not_allowed_for_category', {
          index: i,
          category: cat,
          allowed_categories: Array.from(EXPIRY_ALLOWED),
        });
        return applyRateLimitHeaders(res, rl);
      }
    }

    meta.push({
      category: cat,
      title: title.trim(),
      description: typeof description === 'string' && description.trim() ? description.trim() : null,
      expires_at: typeof expiresAt === 'string' && expiresAt ? expiresAt : null,
    });
  }

  // ---- Gate: tier + account_type + parental link ----
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileErr) {
    console.error('[player-documents] profile read failed:', profileErr);
    const res = NextResponse.json({ error: 'Could not load profile.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }
  const tier = (profile?.tier as string) ?? 'free';
  if (!tierOk(tier)) {
    const res = NextResponse.json(
      { error: 'Uploading player documents requires Identity Plus or higher.' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  const { data: types, error: typesErr } = await supabaseAdmin
    .from('profile_account_types')
    .select('account_type')
    .eq('user_id', userId);
  if (typesErr) {
    console.error('[player-documents] account_types read failed:', typesErr);
    const res = NextResponse.json({ error: 'Could not load account types.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }
  const isParent = (types || []).some(
    (r: { account_type: string }) => isAccountType(r.account_type) && r.account_type === 'parent'
  );
  if (!isParent) {
    const res = NextResponse.json(
      { error: 'Only parents can upload player documents.' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  // Parental link — the link itself is the permission. We don't check
  // minor_consent_revoked_at here (Q12 read (a) — re-assert at upload time).
  const { data: link, error: linkErr } = await supabaseAdmin
    .from('managed_profiles')
    .select('id, parent_consent_at, minor_consent_revoked_at')
    .eq('manager_user_id', userId)
    .eq('profile_id', playerId)
    .eq('profile_type', 'player')
    .maybeSingle();

  if (linkErr) {
    console.error('[player-documents] managed_profiles read failed:', linkErr);
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

  // ---- Per-file size + mime validate (cheap; do before any storage work) ----
  for (let i = 0; i < fileEntries.length; i++) {
    const f = fileEntries[i];
    if (f.size <= 0 || f.size > MAX_BYTES) {
      const res = badRequest('file_too_large', {
        index: i,
        file_name: f.name,
        max_bytes: MAX_BYTES,
        size: f.size,
      }, 413);
      return applyRateLimitHeaders(res, rl);
    }
    if (!ALLOWED_MIME.has(f.type)) {
      const res = badRequest('unsupported_mime', {
        index: i,
        file_name: f.name,
        mime: f.type,
        allowed: Array.from(ALLOWED_MIME),
      }, 415);
      return applyRateLimitHeaders(res, rl);
    }
  }

  // ---- Upload + DB insert per file (collect failures for all-or-nothing rollback) ----
  const uploadedRows: UploadedRow[] = [];
  const storagePathsToCleanup: string[] = [];

  try {
    for (let i = 0; i < fileEntries.length; i++) {
      const f = fileEntries[i];
      const m = meta[i];
      const docId = crypto.randomUUID();
      // Path convention: {player_id}/{document_id}/{filename}
      // Sanitize the filename for storage — drop path traversal attempts and
      // weird characters. Bucket RLS already pins the path by player_id, but
      // we still don't want to embed a slash from a malicious filename.
      const safeName = (f.name || 'document').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 100);
      const path = `${playerId}/${docId}/${safeName}`;

      // 1. Storage upload (service role bypasses storage RLS; the policy is
      //    defense-in-depth for client-direct paths).
      const arrayBuffer = await f.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { error: upErr } = await supabaseAdmin.storage
        .from('player-documents')
        .upload(path, buffer, { contentType: f.type, upsert: false });
      if (upErr) {
        throw new Error(`upload_failed:index=${i}:${upErr.message}`);
      }
      storagePathsToCleanup.push(path);

      // 2. DB insert (service role bypasses database RLS; the row's
      //    uploaded_by is forced to userId and player_id to playerId so
      //    future per-row RLS hardening is correct).
      const { data: row, error: insErr } = await supabaseAdmin
        .from('player_documents')
        .insert({
          id: docId,
          player_id: playerId,
          uploaded_by: userId,
          category: m.category,
          title: m.title,
          description: m.description,
          storage_path: path,
          file_name: f.name,
          file_size_bytes: f.size,
          mime_type: f.type,
          expires_at: m.expires_at,
          status: 'active',
        })
        .select('id, file_name, title, category, status, created_at')
        .single();
      if (insErr || !row) {
        throw new Error(`db_insert_failed:index=${i}:${insErr?.message ?? 'no_row'}`);
      }
      uploadedRows.push(row as UploadedRow);

      // 3. Audit row (best-effort — if audit fails we still report the doc
      //    as uploaded; the user can re-trigger view-audit later).
      //    IP defensive cast: audit.ip_address is `inet`. 'unknown' would fail.
      const auditIP = ip && ip !== 'unknown' ? ip : null;
      await supabaseAdmin.from('player_document_audit').insert({
        document_id: docId,
        actor_user_id: userId,
        action: 'upload',
        ip_address: auditIP,
        user_agent: request.headers.get('user-agent') ?? null,
      });
    }

    // Per-batch consent re-assert (Q12 read (a)). If the link had
    // minor_consent_revoked_at set, clear it and write parent_consent_at.
    // We intentionally do NOT write parent_consent_method here — that
    // column may not exist on managed_profiles. If audit consumers need
    // to know the re-assertion source, read player_document_audit where
    // action='upload' lands right after this UPDATE. (Defensive write,
    // documented in MEMORY.md / memory/2026-07-06.md.)
    //
    // IP defensive cast: managed_profiles.parent_consent_ip is `inet`,
    // not text. If the upstream IP lookup returned 'unknown' or any other
    // non-inet string, this UPDATE would throw and roll back the whole
    // batch with a confusing Postgres error. Pass NULL on bad input so
    // the upload still succeeds; the audit table still has the IP.
    if (link.minor_consent_revoked_at) {
      const consentIP = ip && ip !== 'unknown' ? ip : null;
      await supabaseAdmin
        .from('managed_profiles')
        .update({
          parent_consent_at: new Date().toISOString(),
          parent_consent_ip: consentIP,
          minor_consent_revoked_at: null,
        })
        .eq('id', link.id);
    }

    const res = NextResponse.json({ ok: true, uploaded: uploadedRows }, { status: 201 });
    return applyRateLimitHeaders(res, rl);
  } catch (err) {
    // Rollback: delete anything we uploaded. The DB inserts may be partially
    // committed; clean them up too. Each cleanup is wrapped in its own
    // try/catch so a transient failure on the storage cleanup does NOT
    // block the DB cleanup (and vice versa). The worst case is orphaned
    // storage rows that a separate cron in v2 can garbage-collect, but
    // leaking DB rows is worse (would show up to the parent as ghosts).
    console.error('[player-documents] batch failed, rolling back:', err);

    try {
      if (storagePathsToCleanup.length > 0) {
        await supabaseAdmin.storage.from('player-documents').remove(storagePathsToCleanup);
      }
    } catch (cleanupErr) {
      console.error('[player-documents] storage rollback failed (non-fatal):', cleanupErr);
    }
    try {
      if (uploadedRows.length > 0) {
        await supabaseAdmin
          .from('player_documents')
          .delete()
          .in('id', uploadedRows.map((r) => r.id));
      }
    } catch (cleanupErr) {
      console.error('[player-documents] db rollback failed (non-fatal):', cleanupErr);
    }

    const res = NextResponse.json(
      {
        error: 'batch_failed',
        message: err instanceof Error ? err.message : String(err),
        uploaded_count: uploadedRows.length,
      },
      { status: 500 }
    );
    return applyRateLimitHeaders(res, rl);
  }
}

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`player-documents-list:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
  maybeCleanup();

  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  const url = new URL(request.url);
  const playerId = url.searchParams.get('player_id');
  if (!playerId) {
    const res = badRequest('player_id_required');
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

  // Parental link required for read (database RLS will filter, but we want
  // a clearer 403 for the common "not your kid" case).
  const { data: link, error: linkErr } = await supabaseAdmin
    .from('managed_profiles')
    .select('id')
    .eq('manager_user_id', userId)
    .eq('profile_id', playerId)
    .eq('profile_type', 'player')
    .maybeSingle();
  if (linkErr) {
    console.error('[player-documents] GET link read failed:', linkErr);
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

  // Read all (active + archived + expired) — status='expired' is computed
  // here on read by walking expires_at. v2 will replace with a trigger or
  // scheduled job.
  const { data: rows, error: readErr } = await supabaseAdmin
    .from('player_documents')
    .select('id, player_id, category, title, description, file_name, file_size_bytes, mime_type, expires_at, status, created_at, updated_at')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (readErr) {
    console.error('[player-documents] GET read failed:', readErr);
    const res = NextResponse.json({ error: 'Could not load documents.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const augmented = (rows || []).map((r) => {
    // Promote archived/active to 'expired' on read if expires_at < today.
    let status = r.status;
    if (status === 'active' && r.expires_at && r.expires_at < today) {
      status = 'expired';
    }
    return { ...r, status };
  });

  const res = NextResponse.json({ ok: true, documents: augmented });
  return applyRateLimitHeaders(res, rl);
}
