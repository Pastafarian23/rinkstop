// src/app/profile/[slug]/passport/PassportSections.tsx
// RSC. Resolves player_id from profile.user_id (if this user is also a player),
// then renders all 4 passport sections conditionally.

import { createClient } from '@supabase/supabase-js';
import { HockeyCareerSection } from './HockeyCareerSection';
import { HockeyStatsSection } from './HockeyStatsSection';
import { FederationSection } from './FederationSection';
import { EndorsementsSection } from './EndorsementsSection';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function PassportSections({
  profileUserId,
  isOwner,
}: {
  profileUserId: string;
  isOwner: boolean;
}) {
  // Resolve the player record for this profile (if any).
  // A profile can have a player record only if the user has claimed the player role.
  const { data: player, error } = await supabaseAdmin
    .from('players')
    .select('id, primary_position_category')
    .eq('user_id', profileUserId)
    .maybeSingle();

  if (error) {
    // Fail silently — passport sections are additive. The rest of the profile still renders.
    return null;
  }

  if (!player) {
    // This user doesn't have a player record. Passport sections don't apply.
    return null;
  }

  const playerId = player.id;
  const positionCategory = (player.primary_position_category as 'forward' | 'defense' | 'goalie' | null) ?? null;

  return (
    <>
      <HockeyCareerSection playerId={playerId} isOwner={isOwner} />
      <HockeyStatsSection playerId={playerId} positionCategory={positionCategory} isOwner={isOwner} />
      <FederationSection playerId={playerId} isOwner={isOwner} />
      <EndorsementsSection playerId={playerId} isOwner={isOwner} />
    </>
  );
}