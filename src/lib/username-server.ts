/**
 * Server-side username helpers.
 * Talks to Supabase for reserved slugs, availability, and change tracking.
 *
 * Reference: docs/USERNAME_DESIGN.md
 */

import { createClient } from '@supabase/supabase-js';
import { generateSuggestions, COOLDOWN_DAYS } from './username';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export type UsernameAvailability =
  | { available: true }
  | { available: false; reason: 'reserved' | 'taken' | 'held'; suggestions?: string[] };

export function isUnavailable(
  a: UsernameAvailability
): a is { available: false; reason: 'reserved' | 'taken' | 'held'; suggestions?: string[] } {
  return !a.available;
}

/**
 * Check if a username is available for registration.
 * Returns availability + suggested alternatives if taken.
 */
export async function checkUsernameAvailability(
  slug: string
): Promise<UsernameAvailability> {
  const normalized = slug.toLowerCase();

  // 1. Check reserved list
  const { data: reserved } = await supabaseAdmin
    .from('reserved_slugs')
    .select('slug')
    .eq('slug', normalized)
    .maybeSingle();

  if (reserved) {
    return { available: false, reason: 'reserved' };
  }

  // 2. Check active holds (released but within 14-day hold)
  const { data: hold } = await supabaseAdmin
    .from('username_holds')
    .select('slug')
    .eq('slug', normalized)
    .gt('available_at', new Date().toISOString())
    .maybeSingle();

  if (hold) {
    return { available: false, reason: 'held' };
  }

  // 3. Check active profiles
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('user_id')
    .ilike('username', normalized)
    .maybeSingle();

  if (existing) {
    return {
      available: false,
      reason: 'taken',
      suggestions: generateSuggestions(normalized),
    };
  }

  return { available: true };
}

/**
 * Check if a user can change their username (cooldown check).
 * Returns whether the change is allowed and when the next change is possible.
 */
export async function canChangeUsername(
  userId: string
): Promise<{ canChange: boolean; nextChangeAt?: Date }> {
  const { data: lastChange } = await supabaseAdmin
    .from('username_changes')
    .select('changed_at')
    .eq('user_id', userId)
    .order('changed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastChange) {
    return { canChange: true };
  }

  const lastChangeAt = new Date(lastChange.changed_at);
  const cooldownEndsAt = new Date(lastChangeAt);
  cooldownEndsAt.setDate(cooldownEndsAt.getDate() + COOLDOWN_DAYS);

  if (cooldownEndsAt <= new Date()) {
    return { canChange: true };
  }

  return { canChange: false, nextChangeAt: cooldownEndsAt };
}

/**
 * Set or change a user's username.
 * Enforces cooldown, records the change in audit log,
 * and places a hold on the old username.
 */
export type SetUsernameResult =
  | { ok: true; username: string }
  | { ok: false; error: string; field?: string; suggestions?: string[] };

export async function setUsername(
  userId: string,
  newUsername: string
): Promise<SetUsernameResult> {
  const normalized = newUsername.toLowerCase();

  // 1. Cooldown check
  const cooldown = await canChangeUsername(userId);
  if (!cooldown.canChange) {
    return {
      ok: false,
      error: `You can change your username again on ${cooldown.nextChangeAt!.toLocaleDateString()}`,
    };
  }

  // 2. Availability check
  const availability = await checkUsernameAvailability(normalized);
  if (isUnavailable(availability)) {
    return {
      ok: false,
      error: availability.reason,
      suggestions: availability.suggestions,
    };
  }

  // 3. Get current username (if any) for the audit log
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('username')
    .eq('user_id', userId)
    .maybeSingle();

  const oldUsername = profile?.username ?? null;

  // 4. If changing (not setting for the first time), place a hold on the old slug
  if (oldUsername && oldUsername.toLowerCase() !== normalized) {
    const availableAt = new Date();
    availableAt.setDate(availableAt.getDate() + COOLDOWN_DAYS);

    await supabaseAdmin.from('username_holds').upsert({
      slug: oldUsername.toLowerCase(),
      previous_user_id: userId,
      released_at: new Date().toISOString(),
      available_at: availableAt.toISOString(),
    });
  }

  // 5. Update the profile
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ username: normalized })
    .eq('user_id', userId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  // 6. Audit log
  await supabaseAdmin.from('username_changes').insert({
    user_id: userId,
    old_username: oldUsername,
    new_username: normalized,
  });

  return { ok: true, username: normalized };
}

/**
 * Get username change history for a user.
 */
export type UsernameChange = {
  oldUsername: string | null;
  newUsername: string;
  changedAt: string;
};

export async function getUsernameChangeHistory(
  userId: string,
  limit = 10
): Promise<UsernameChange[]> {
  const { data } = await supabaseAdmin
    .from('username_changes')
    .select('old_username, new_username, changed_at')
    .eq('user_id', userId)
    .order('changed_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    oldUsername: row.old_username,
    newUsername: row.new_username,
    changedAt: row.changed_at,
  }));
}

/**
 * Cleanup expired username holds. Run as a daily cron.
 */
export async function cleanupExpiredHolds(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('username_holds')
    .delete()
    .lt('available_at', new Date().toISOString())
    .select('slug');

  if (error) {
    console.error('[username-server] cleanupExpiredHolds error:', error);
    return 0;
  }

  return data?.length ?? 0;
}
