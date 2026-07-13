import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 }; // generous; debounced saves

/**
 * GET /api/claims/draft?entity_id=...
 * Returns the user's draft for a given (entity_type, entity_id) pair, or 404 if none.
 * Used by /dashboard/claims to resume an in-progress draft (e.g. after Stripe checkout).
 */
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`claims-draft:${ip}`, RATE_LIMIT);
  maybeCleanup();
  if (!result.allowed) {
    const response = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(response, result);
    return response;
  }

  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const entityId = request.nextUrl.searchParams.get('entity_id');
  if (!entityId) {
    return NextResponse.json({ error: 'entity_id is required.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('claim_drafts')
    .select('entity_type, entity_id, entity_name, reason, proof, updated_at')
    .eq('user_id', userId)
    .eq('entity_id', entityId)
    .maybeSingle();

  if (error) {
    console.error('claim_drafts GET error:', error);
    return NextResponse.json({ error: 'Failed to load draft.' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ draft: null }, { status: 200 });
  }

  return NextResponse.json({ draft: data });
}

/**
 * PUT /api/claims/draft
 * Upsert a claim draft. The (user_id, entity_id) pair is the primary key.
 * Called by the form on every field change (debounced 500ms) and on submit.
 *
 * Body: { entity_type, entity_id, entity_name, reason, proof }
 */
export async function PUT(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`claims-draft:${ip}`, RATE_LIMIT);
  maybeCleanup();
  if (!result.allowed) {
    const response = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(response, result);
    return response;
  }

  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { entity_type, entity_id, entity_name, reason, proof } = body;
  if (!entity_type || !entity_id) {
    return NextResponse.json({ error: 'entity_type and entity_id are required.' }, { status: 400 });
  }
  if (!['rink', 'team', 'player'].includes(entity_type)) {
    return NextResponse.json({ error: 'Invalid claim type.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('claim_drafts')
    .upsert(
      {
        user_id: userId,
        entity_type,
        entity_id,
        entity_name: entity_name || null,
        reason: reason || null,
        proof: proof || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,entity_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('claim_drafts PUT error:', error);
    return NextResponse.json({ error: 'Failed to save draft.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, draft: data }, { status: 200 });
}

/**
 * DELETE /api/claims/draft?entity_id=...
 * Delete a draft. Called by /api/claims POST after a successful claim submit.
 * Also called explicitly by the form when the user resets.
 */
export async function DELETE(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`claims-draft:${ip}`, RATE_LIMIT);
  maybeCleanup();
  if (!result.allowed) {
    const response = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(response, result);
    return response;
  }

  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const entityId = request.nextUrl.searchParams.get('entity_id');
  if (!entityId) {
    return NextResponse.json({ error: 'entity_id is required.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('claim_drafts')
    .delete()
    .eq('user_id', userId)
    .eq('entity_id', entityId);

  if (error) {
    console.error('claim_drafts DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete draft.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
