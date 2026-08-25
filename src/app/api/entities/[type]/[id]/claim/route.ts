import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isIdentityVerified } from '@/lib/identity-verified';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RL = { maxRequests: 60, windowMs: 60 * 1000 };

// GET /api/entities/[type]/[id]/claim
// Returns the active claim for an entity (rink/team/league/player), with the claimer's
// public profile data (display_name, avatar, tier, founding status). Used by the
// ClaimedBy component on entity pages.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;

  const ip = getClientIP(request);
  const result = await checkRateLimit(`claim:${ip}`, RL);
  maybeCleanup();

  const validTypes = ['rink', 'team', 'league', 'player'];
  if (!type || !validTypes.includes(type)) {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  // Map entity type to claims.claim_type. The existing claims table uses 'player'/'team'/'rink'.
  // Leagues aren't a first-class claim type today, so we fall back to any team claim whose team is in the league
  // (or skip for now if we have no league_id link).
  const claimType = type === 'league' ? null : type;

  let claim: { id: string; user_id: string; created_at: string; verification_status: string; verified_at: string | null } | null = null;

  if (claimType) {
    const { data: claimRow } = await supabaseAdmin
      .from('claims')
      .select('id, user_id, created_at, entity_id, verification_status, verified_at')
      .eq('claim_type', claimType)
      .eq('entity_id', id)
      .eq('status', 'approved')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (claimRow) {
      claim = {
        id: claimRow.id,
        user_id: claimRow.user_id,
        created_at: claimRow.created_at,
        verification_status: claimRow.verification_status ?? 'unverified',
        verified_at: claimRow.verified_at ?? null,
      };
    }
  } else if (type === 'league') {
    // For leagues, find the first approved team-claim for any team in the league (best-effort)
    // Skip if no easy mapping — entity pages can fall back to no "Claimed by"
    claim = null;
  }

  if (!claim) {
    const res = NextResponse.json({ claim: null });
    return applyRateLimitHeaders(res, result);
  }

  // Look up the claimer's public profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('user_id, display_name, avatar_url, tier, is_founding_member, username, identity_verified_at, identity_expires_at')
    .eq('user_id', claim.user_id)
    .maybeSingle();

  if (!profile) {
    const res = NextResponse.json({ claim: null });
    return applyRateLimitHeaders(res, result);
  }

  // Piece C (2026-06-24): use the hardened helper. Returns true ONLY if
  // the claimant actually completed the Didit flow (matching approved
  // didit_sessions row exists). Bare flag is no longer trusted.
  const verified = await isIdentityVerified(claim.user_id);

  const res = NextResponse.json({
    claim: {
      claim_id: claim.id,
      user_id: claim.user_id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      tier: profile.tier,
      is_founding_member: profile.is_founding_member,
      username: profile.username,
      claimed_at: claim.created_at,
      // Piece C: return a single boolean instead of raw timestamps.
      // The raw timestamps are not exposed to the client anymore.
      verified,
      // WS25 (2026-08-23): surface verification_status from the new claim
      // column so public listings can render Listed / Pending / Verified
      // badges correctly. verified_at is null until the owner completes
      // Didit; the public listing uses verification_status as the
      // single source of truth for the badge state.
      verification_status: claim.verification_status,
      verified_at: claim.verified_at,
    },
  });
  return applyRateLimitHeaders(res, result);
}
