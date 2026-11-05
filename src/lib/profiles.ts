// src/lib/profiles.ts
//
// Lightweight profile accessor used by notification fan-out code
// (rink-notifications.ts) that needs user_id → email lookups outside
// the request lifecycle. The service-role client is required because
// RLS gates most fields behind profile.user_id = auth.uid().
//
// Design note: returns null on miss, never throws. Caller code uses
// optional chaining + null-coalescing; do not add throw paths here.

import { supabaseAdmin } from '@/lib/supabase';

export interface ProfileSummary {
  user_id: string;
  email: string | null;
  // 2026-11-05: `full_name` does not exist on `profiles` — the column is
  // `display_name`. The old select asked for a column that was never there,
  // so every call returned PostgREST 42703 and this helper always returned
  // null. Renamed to match the live schema.
  display_name: string | null;
  username: string | null;
}

export async function getProfileByUserId(userId: string): Promise<ProfileSummary | null> {
  if (!userId) return null;
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, email, display_name, username')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[profiles] getProfileByUserId failed', { userId, error: error.message });
    return null;
  }
  return data ?? null;
}