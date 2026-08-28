/**
 * src/lib/identity-verified.ts
 *
 * The single source of truth for whether a user is identity-verified on RinkStop.
 *
 * Per Arnel (2026-06-24): profiles.identity_verified_at alone is NOT a trust
 * signal. It can be set by direct SQL UPDATE, which is the same power an
 * attacker would have if they got the service-role key. Requiring a matching
 * approved row in didit_sessions means the only way to be "verified" is to
 * actually complete the Didit flow.
 *
 * Returns true ONLY if all three conditions hold:
 *   1. profiles.identity_verified_at is set and not expired
 *      (identity_expires_at > now())
 *   2. profiles.didit_session_id is set (NOT NULL)
 *   3. A row exists in didit_sessions matching that id, with status='approved'
 *
 * Returns false (fail-closed) if any query fails or any condition fails.
 * Never throws; callers don't need try/catch.
 */

import { supabaseAdmin } from '@/lib/supabase';

export async function isIdentityVerified(userId: string): Promise<boolean> {
  if (!userId) return false;

  // Step 1+2: read profiles.identity_verified_at, identity_expires_at, didit_session_id
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('identity_verified_at, identity_expires_at, didit_session_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileErr || !profile) return false;
  if (!profile.identity_verified_at) return false;
  if (!profile.identity_expires_at) return false;
  if (new Date(profile.identity_expires_at) <= new Date()) return false;
  if (!profile.didit_session_id) return false;

  // Step 3: verify the didit_sessions row exists and is approved
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from('didit_sessions')
    .select('status')
    .eq('id', profile.didit_session_id)
    .maybeSingle();

  if (sessionErr || !session) return false;
  if (session.status !== 'approved') return false;

  return true;
}

/**
 * Fast-path identity verification using a profile row we already have.
 *
 * The full isIdentityVerified() re-fetches the profiles row. On pages that
 * already pulled profiles (via select '*'), this is a wasted round-trip.
 * This helper:
 *   - Checks identity_verified_at / identity_expires_at / didit_session_id
 *     against the in-memory profile object (no query)
 *   - If any of those fields fail, returns false immediately (no second query)
 *   - Otherwise does ONE query: didit_sessions lookup for the cached id
 *
 * Returns null if verification failed (callers can't distinguish "not
 * verified" from "verified" without the second query — that's fine for
 * profile pages that already show verification status to anyone).
 *
 * For the strict verified-yes/no signal, callers should still use
 * isIdentityVerified() when they don't already have the profile row.
 */
export async function isIdentityVerifiedFromProfile(profile: {
  identity_verified_at: string | null;
  identity_expires_at: string | null;
  didit_session_id: string | null;
}): Promise<{ verified: boolean; verifiedAt: string | null; expiresAt: string | null }> {
  if (!profile.identity_verified_at) {
    return { verified: false, verifiedAt: null, expiresAt: null };
  }
  if (!profile.identity_expires_at) {
    return { verified: false, verifiedAt: null, expiresAt: null };
  }
  if (new Date(profile.identity_expires_at) <= new Date()) {
    return { verified: false, verifiedAt: profile.identity_verified_at, expiresAt: profile.identity_expires_at };
  }
  if (!profile.didit_session_id) {
    return { verified: false, verifiedAt: profile.identity_verified_at, expiresAt: profile.identity_expires_at };
  }

  const { data: session, error: sessionErr } = await supabaseAdmin
    .from('didit_sessions')
    .select('status')
    .eq('id', profile.didit_session_id)
    .maybeSingle();

  if (sessionErr || !session || session.status !== 'approved') {
    return { verified: false, verifiedAt: profile.identity_verified_at, expiresAt: profile.identity_expires_at };
  }
  return { verified: true, verifiedAt: profile.identity_verified_at, expiresAt: profile.identity_expires_at };
}
