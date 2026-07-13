import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { getUserTier, getMaxClaimsForTier, getUserApprovedClaimCount } from '@/lib/connections';

const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

// POST /api/claims — submit a new claim
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`claims:${ip}`, RATE_LIMIT);
  maybeCleanup();

  if (!result.allowed) {
    const response = new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please slow down.' }),
      { status: 429 }
    );
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

  try {
    const body = await request.json();
    const { claim_type, entity_name, entity_id, reason, proof } = body;

    if (!claim_type || !entity_name || !reason) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (!['rink', 'team', 'player'].includes(claim_type)) {
      return NextResponse.json({ error: 'Invalid claim type.' }, { status: 400 });
    }

    // === Save the draft first ===
    // The user may have typed a long reason/proof. We want to preserve it even
    // if a 403 (tier cap) blocks the actual submission. The draft is keyed on
    // (user_id, entity_id) so subsequent edits overwrite in place.
    // entity_id is the deep-link param (player/rink/team UUID); if the user
    // didn't deep-link, fall back to a synthetic key derived from entity_name
    // so we still capture their work. parent_managed claims use the player id.
    const draftEntityId = (entity_id && String(entity_id).trim()) || `name:${entity_name}`;
    {
      const { error: draftErr } = await supabaseAdmin
        .from('claim_drafts')
        .upsert(
          {
            user_id: userId,
            entity_type: claim_type,
            entity_id: draftEntityId,
            entity_name: entity_name || null,
            reason: reason || null,
            proof: proof || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,entity_id' }
        );
      if (draftErr) {
        // Don't block the claim on a draft save failure, but log it.
        console.error('claim_drafts upsert error (non-fatal):', draftErr);
      }
    }

    // Tier-based claim cap enforcement.
    // Counts only APPROVED claims (pending claims can be in flight while the user submits more).
    // Special case: 'parent_managed' claims (parent claims kid's player profile) bypass the cap
    // because they're a different use case — one parent can manage many kids.
    const isParentManagedClaim = typeof reason === 'string' && reason.startsWith('parent_managed:');
    if (!isParentManagedClaim) {
      const tier = await getUserTier(userId);
      const maxClaims = getMaxClaimsForTier(tier);
      if (maxClaims === 0) {
        return NextResponse.json(
          { error: `Claiming listings requires a paid membership. Upgrade to Verified Identity (1 claim), Identity Plus (up to 5), Business Plus (up to 25), or Federation for more. See /pricing.` },
          { status: 403 }
        );
      }
      if (maxClaims !== Infinity) {
        const currentCount = await getUserApprovedClaimCount(userId);
        if (currentCount >= maxClaims) {
          return NextResponse.json(
            { error: `You have reached the ${maxClaims}-claim limit on the ${tier} tier. Upgrade to Identity Plus for up to 5 claims or Business Plus for up to 25, or contact sales for Federation custom volume. See /pricing.` },
            { status: 403 }
          );
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('claims')
      .insert({
        user_id: userId,
        claim_type,
        entity_name,
        entity_id: entity_id || null,
        reason,
        proof: proof || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Claims insert error:', error);
      return NextResponse.json({ error: 'Failed to submit claim.' }, { status: 500 });
    }

    // === Clear the draft on successful submission ===
    // Don't leave a stale draft lying around. The user submitted, no need
    // to remind them of in-progress work.
    {
      const { error: clearErr } = await supabaseAdmin
        .from('claim_drafts')
        .delete()
        .eq('user_id', userId)
        .eq('entity_id', draftEntityId);
      if (clearErr) {
        console.error('claim_drafts clear on submit (non-fatal):', clearErr);
      }
    }

    // Track claim_submitted server-side. Best-effort, never throws.
    try {
      const { trackEvent } = await import('@/lib/analytics');
      await trackEvent({
        name: 'claim_submitted',
        userId,
        pathname: '/dashboard/claims',
        props: {
          claim_type: body.claim_type,
          entity_id: body.entity_id || null,
          entity_name: body.entity_name,
        },
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, claim: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
}

// GET /api/claims — get user's claims
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`claims:${ip}`, RATE_LIMIT);
  maybeCleanup();

  if (!result.allowed) {
    const response = new NextResponse(
      JSON.stringify({ error: 'Too many requests.' }),
      { status: 429 }
    );
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

  const { data, error } = await supabaseAdmin
    .from('claims')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch claims.' }, { status: 500 });
  }

  return NextResponse.json({ claims: data });
}