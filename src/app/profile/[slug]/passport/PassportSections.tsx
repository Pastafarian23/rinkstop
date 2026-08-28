// src/app/profile/[slug]/passport/PassportSections.tsx
// RSC. Resolves player_id from profile.user_id (if this user is also a player),
// then renders all 4 passport sections conditionally.

import { createClient } from '@supabase/supabase-js';
import { PassportCompletenessBadge } from '@/components/PassportCompletenessBadge';
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
    .select('id, primary_position_category, first_name, last_name')
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
  const playerName = [player.first_name, player.last_name].filter(Boolean).join(' ') || 'this player';

  const [historyCount, statsCount, federationCount] = await Promise.all([
    supabaseAdmin.from('hockey_player_team_history').select('id', { count: 'exact', head: true }).eq('player_id', playerId),
    supabaseAdmin.from('hockey_player_stats_season').select('id', { count: 'exact', head: true }).eq('player_id', playerId),
    supabaseAdmin
      .from('federation_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', playerId)
      .eq('submission_status', 'approved'),
  ]);

  const sections = [Boolean(historyCount.count ?? 0), Boolean(statsCount.count ?? 0), Boolean(federationCount.count ?? 0)];
  const completed = sections.filter(Boolean).length;

  return (
    <>
      <PassportCompletenessBadge completed={completed} total={3} passportHref={`/profile/${profileUserId}/passport`} size="sm" />
      <HockeyCareerSection playerId={playerId} playerName={playerName} isOwner={isOwner} />
      <HockeyStatsSection playerId={playerId} playerName={playerName} positionCategory={positionCategory} isOwner={isOwner} />
      <FederationSection playerId={playerId} isOwner={isOwner} />
      <EndorsementsSection playerId={playerId} isOwner={isOwner} />
    </>
  );
}