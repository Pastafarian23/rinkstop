// Shared helpers for the connections + DMs system.
// All server-side, all use supabaseAdmin (RLS would block anon client reads on participant-only rows).

import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { TierName, MAX_CLAIMS_PER_TIER as NEW_MAX_CLAIMS, TIER_TO_TRACK, AccountTrack } from '@/lib/pricing';

export type ConnectionStatus = 'pending' | 'accepted' | 'blocked' | 'declined';

export interface Connection {
  id: string;
  user_low: string;
  user_high: string;
  initiated_by: string;
  status: ConnectionStatus;
  created_at: string;
  accepted_at: string | null;
}

// Tier rank within each track (separate rankings, no cross-track comparisons).
// Within each track: free < verified_identity < identity_plus (personal)
// Within business track: free < business_listing < business_plus
//                          free < club_starter < club_pro < club_elite < league < federation
// Legacy aliases (pre-2026-07-02) preserved so existing DB rows rank correctly.
export const TIER_RANK: Record<string, number> = {
  free: 0,
  // New canonical personal tiers
  verified_identity: 1,
  identity_plus: 2,
  // New canonical business tiers
  business_listing: 1,
  business_plus: 2,
  // New organization tiers
  club_starter: 1,
  club_pro: 2,
  club_elite: 3,
  league: 4,
  federation: 5,
  // Legacy aliases — preserve access for pre-2026-07-02 DB rows
  roster: 1,             // -> verified_identity
  roster_plus: 2,        // -> identity_plus
  pro: 2,                // -> identity_plus
  premium: 2,            // -> identity_plus (legacy alias for `pro`)
  business_starter: 1,   // -> business_listing
  business_pro: 2,       // -> business_plus
  business_premium: 2,   // -> business_plus
  enterprise: 5,         // -> federation
};

/**
 * Max number of APPROVED claims a user can hold on each tier.
 * Kids are unlimited and don't count against this cap.
 */
export const MAX_CLAIMS_PER_TIER: Record<string, number> = {
  ...NEW_MAX_CLAIMS,
};

export function getMaxClaimsForTier(tier: string): number {
  return MAX_CLAIMS_PER_TIER[tier] ?? 0;
}

/**
 * Resolve the track for a tier name, including legacy aliases that are not in
 * the modern TIER_TO_TRANK map. Mirrors the legacy-alias mapping in
 * src/lib/pricing.ts:431-442 (getTierLabel).
 */
function resolveTrack(tier: string | null | undefined): AccountTrack {
  if (!tier) return 'personal';
  if (tier in TIER_TO_TRACK) return TIER_TO_TRACK[tier as TierName];
  // Legacy aliases — pre-2026-07-02 DB values
  const legacyTrack: Record<string, AccountTrack> = {
    roster: 'personal',
    roster_plus: 'personal',
    pro: 'personal',
    premium: 'personal',
    business_starter: 'business',
    business_pro: 'business',
    business_premium: 'business',
    enterprise: 'business',
  };
  return legacyTrack[tier] ?? 'personal';
}

/**
 * Is the user's tier at least `minTier` within their track?
 * Returns false for cross-track comparisons (verified_identity vs club_starter, etc.).
 */
export function tierAtLeast(actualTier: string, minTier: string): boolean {
  const actualTrack = resolveTrack(actualTier);
  const minTrack = resolveTrack(minTier);
  // Cross-track comparison not allowed - must be within same track
  if (actualTrack !== minTrack) return false;
  const actualRank = TIER_RANK[actualTier] ?? 0;
  const minRank = TIER_RANK[minTier] ?? 0;
  return actualRank >= minRank;
}

/**
 * Get a user's tier track (personal or business).
 */
export function getTierTrack(tier: string): AccountTrack {
  return TIER_TO_TRACK[tier as TierName] ?? 'personal';
}

/**
 * Count a user's APPROVED claims. Pending/rejected claims don't count.
 */
export async function getUserApprovedClaimCount(userId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'approved');

  if (error) {
    console.error('getUserApprovedClaimCount error:', error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Get the caller's Clerk userId, or null if not signed in.
 */
export async function requireUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

/**
 * Get the caller's tier from profiles. Defaults to 'free' if no profile row exists yet
 * (Clerk webhook is eventually consistent — users can sign in before their profile row is created).
 */
export async function getUserTier(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('tier, tier_expires_at, subscription_status')
    .eq('user_id', userId)
    .single();

  if (!data) return 'free';

  // If the subscription has lapsed (cancelled, expired, or past_due with expired period),
  // treat as free.
  const now = new Date();
  if (data.tier_expires_at && new Date(data.tier_expires_at) < now) {
    return 'free';
  }
  if (data.subscription_status === 'cancelled') {
    return 'free';
  }

  return (data.tier as string) || 'free';
}

/**
 * Normalize two userIds into (low, high) so the (user_low, user_high) constraint is order-independent.
 */
export function normalizePair(a: string, b: string): { user_low: string; user_high: string } {
  return a < b ? { user_low: a, user_high: b } : { user_low: b, user_high: a };
}

/**
 * Fetch a connection row between two users (in either order), or null.
 */
export async function getConnectionBetween(userA: string, userB: string): Promise<Connection | null> {
  const { user_low, user_high } = normalizePair(userA, userB);
  const { data } = await supabaseAdmin
    .from('connections')
    .select('*')
    .eq('user_low', user_low)
    .eq('user_high', user_high)
    .maybeSingle();
  return (data as Connection | null) ?? null;
}

/**
 * Fetch a connection row by its UUID, and verify the caller is a participant.
 * Returns the row + whether the caller is the recipient (vs the initiator) of a pending request.
 */
export async function getConnectionForUser(
  connectionId: string,
  callerUserId: string
): Promise<{ connection: Connection; isRecipient: boolean } | null> {
  const { data } = await supabaseAdmin
    .from('connections')
    .select('*')
    .eq('id', connectionId)
    .maybeSingle();

  if (!data) return null;

  const conn = data as Connection;
  if (callerUserId !== conn.user_low && callerUserId !== conn.user_high) {
    return null; // not a participant
  }

  // The "recipient" is the user who did NOT initiate the pending request.
  const isRecipient = conn.initiated_by !== callerUserId && conn.status === 'pending';
  return { connection: conn, isRecipient };
}