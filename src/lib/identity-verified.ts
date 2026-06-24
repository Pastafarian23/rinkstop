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
