import { supabaseAdmin } from '@/lib/supabase';

// Ownership helper: returns the user_id of the approved owner of an entity,
// or null if no approved owner exists. The owner can be messaged.
//
// - player: claimed by the player themselves, or by a parent via managed_profiles,
//           or by an "owner" via the claims table (claim_type='player')
// - team / rink: claim_type matches; status='approved'
// - league: no claims today; returns null (league admin gate, not a person)
//
// This is intentionally simple — a single best-effort lookup. If multiple
// claims exist (shouldn't, but possible), the first one wins. The schema
// enforces uniqueness for most paths; for player, we try self → managed → claim.
export async function getEntityOwner(
  type: 'player' | 'team' | 'rink' | 'league',
  entityId: string
): Promise<{ userId: string; kind: 'self' | 'parent' | 'owner' | 'admin' } | null> {
  if (type === 'player') {
    // First, see if a player has a self-claim (managed_profiles with relationship='self')
    const { data: selfRow } = await supabaseAdmin
      .from('managed_profiles')
      .select('manager_user_id')
      .eq('profile_type', 'player')
      .eq('profile_id', entityId)
      .eq('relationship', 'self')
      .maybeSingle();
    if (selfRow?.manager_user_id) return { userId: selfRow.manager_user_id, kind: 'self' };

    // Otherwise, look for any managed_profiles (parent/guardian)
    const { data: managedRow } = await supabaseAdmin
      .from('managed_profiles')
      .select('manager_user_id')
      .eq('profile_type', 'player')
      .eq('profile_id', entityId)
      .maybeSingle();
    if (managedRow?.manager_user_id) return { userId: managedRow.manager_user_id, kind: 'parent' };

    // Otherwise, check claims (someone could claim a player profile)
    const { data: claimRow } = await supabaseAdmin
      .from('claims')
      .select('user_id')
      .eq('claim_type', 'player')
      .eq('entity_id', entityId)
      .eq('status', 'approved')
      .maybeSingle();
    if (claimRow?.user_id) return { userId: claimRow.user_id, kind: 'owner' };

    return null;
  }

  if (type === 'team' || type === 'rink') {
    const { data: claimRow } = await supabaseAdmin
      .from('claims')
      .select('user_id')
      .eq('claim_type', type)
      .eq('entity_id', entityId)
      .eq('status', 'approved')
      .maybeSingle();
    return claimRow?.user_id ? { userId: claimRow.user_id, kind: 'owner' } : null;
  }

  // league: no claims path. The "owner" is anyone with league_admin role; not
  // a single person. Return null so the UI doesn't show a message button.
  return null;
}

// Follower count for an entity, used on detail pages to render the initial
// count without waiting for the client to fetch it.
export async function getFollowersCount(
  type: 'player' | 'team' | 'rink' | 'league' | 'user',
  id: string
): Promise<number> {
  const { count } = await supabaseAdmin
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('followee_type', type)
    .eq('followee_id', id);
  return count ?? 0;
}
