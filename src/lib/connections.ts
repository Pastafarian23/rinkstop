// Shared helpers for the connections + DMs system.
// All server-side, all use supabaseAdmin (RLS would block anon client reads on participant-only rows).

import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

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

export const TIER_RANK: Record<string, number> = {
  free: 0,
  supporter: 1,
  verified: 2,
  pro: 3,
};

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
 * Is the user's tier at least `minTier`?
 */
export function tierAtLeast(actualTier: string, minTier: string): boolean {
  return (TIER_RANK[actualTier] ?? 0) >= (TIER_RANK[minTier] ?? 0);
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
