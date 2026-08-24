// Shared helpers for the connections + DMs system.
// All server-side, all use supabaseAdmin (RLS would block anon client reads on participant-only rows).

import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { TierName, TIER_TO_TRACK, AccountTrack } from '@/lib/pricing';
import { tierAtLeast, TIER_RANK, getTierMaxClaims } from '@/lib/tier-gate';

// Re-export tier utilities from tier-gate so callers can import from one place.
export { tierAtLeast, TIER_RANK };

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

/**
 * Get max claims for a tier. Delegates to pricing.ts via tier-gate.ts.
 * Max number of APPROVED claims a user can hold on each tier.
 * Kids are unlimited and don't count against this cap.
 */
export function getMaxClaimsForTier(tier: string): number {
  return getTierMaxClaims(tier);
}

/**
 * Resolve the track for a tier name.
 * All tier names are mapped in TIER_TO_TRACK (src/lib/pricing.ts). No legacy
 * aliases exist — old tier names were migrated to new names by
 * supabase/migrations/2026-07-02_remove_old_tier_names.sql.
 */
function resolveTrack(tier: string | null | undefined): AccountTrack {
  if (!tier) return 'personal';
  return TIER_TO_TRACK[tier as TierName] ?? 'personal';
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
 *
 * Wrapped with React's `cache()` so multiple callsites within a single render
 * (dashboard layout + dashboard page, claims page, family page, etc.) share
 * one Supabase round-trip instead of N. Cache is request-scoped by default
 * in Next.js 15, so cross-request isolation is preserved — a tier upgrade
 * becomes visible on the next request, not mid-request.
 *
 * 2026-07-22 perf pass: this is the single biggest dashboard render speedup
 * after the layout Promise.all, because the dashboard layout fetches tier
 * once and the dashboard page fetches it again with the same args.
 */
export const getUserTier = cache(async (userId: string): Promise<string> => {
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
});

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
