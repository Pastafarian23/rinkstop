import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
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
  const result = await checkRateLimit(ip, RL);
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

  let claim: { id: string; user_id: string; created_at: string } | null = null;

  if (claimType) {
    const { data: claimRow } = await supabaseAdmin
      .from('claims')
      .select('id, user_id, created_at, entity_id')
      .eq('claim_type', claimType)
      .eq('entity_id', id)
      .eq('status', 'approved')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (claimRow) {
      claim = { id: claimRow.id, user_id: claimRow.user_id, created_at: claimRow.created_at };
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
    .select('user_id, display_name, avatar_url, tier, is_founding_member')
    .eq('user_id', claim.user_id)
    .maybeSingle();

  if (!profile) {
    const res = NextResponse.json({ claim: null });
    return applyRateLimitHeaders(res, result);
  }

  const res = NextResponse.json({
    claim: {
      claim_id: claim.id,
      user_id: claim.user_id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      tier: profile.tier,
      is_founding_member: profile.is_founding_member,
      claimed_at: claim.created_at,
    },
  });
  return applyRateLimitHeaders(res, result);
}
