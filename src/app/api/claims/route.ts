import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
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

  const { userId } = await auth();
  if (!userId) {
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

    // Tier-based claim cap enforcement.
    // Counts only APPROVED claims (pending claims can be in flight while the user submits more).
    //
    // Two-tier rule:
    // 1. Tier minimum (always enforced): Free tier CANNOT claim anything.
    //    Even parent_managed claims require Starter+.
    // 2. Claim cap (skipped for parent_managed): 'parent_managed' claims
    //    (parent claims kid's player profile) bypass the per-tier cap because
    //    they're a different use case — one parent can manage many kids.
    //
    // The claim_type must still be 'player' for parent_managed to count
    // (parents don't claim rinks/teams/leagues for free).
    const isParentManagedClaim =
      typeof reason === 'string' &&
      reason.startsWith('parent_managed:') &&
      claim_type === 'player';

    const tier = await getUserTier(userId);
    const maxClaims = getMaxClaimsForTier(tier);

    // Tier minimum check: free tier can never claim, even with parent_managed.
    if (maxClaims === 0) {
      return NextResponse.json(
        { error: `Claiming listings requires a paid membership. Upgrade to Starter (1 claim), Pro (up to 5), Premium (up to 25), or Enterprise for more. See /pricing.` },
        { status: 403 }
      );
    }

    // Claim cap check: skipped for parent_managed (parents managing kids' profiles).
    if (!isParentManagedClaim && maxClaims !== Infinity) {
      const currentCount = await getUserApprovedClaimCount(userId);
      if (currentCount >= maxClaims) {
        return NextResponse.json(
          { error: `You have reached the ${maxClaims}-claim limit on the ${tier} tier. Upgrade to Pro for up to 25 claims, or contact Enterprise for custom volume. See /pricing.` },
          { status: 403 }
        );
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

  const { userId } = await auth();
  if (!userId) {
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