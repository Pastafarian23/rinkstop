// src/app/passport/[passportId]/PublicPassportCareerStats.tsx
//
// Wrapper that renders HockeyCareerSection + HockeyStatsSection on the
// public /passport/[passportId] page. These sections already exist on
// the /profile/[slug] page (under src/app/profile/[slug]/passport/).
//
// Why a wrapper instead of just importing them directly:
//   1. The existing components take `playerId`; the public passport page
//      holds `internalUserId` (Clerk user_id) from the passports table.
//      We resolve the player record once and pass `playerId` down.
//   2. We force `isOwner={false}` on the public passport — the owner
//      manages career + stats from /dashboard/passport. Showing the
//      "+ Add" modal on a public view is a leak of admin affordance.
//   3. The wrapper renders nothing if the holder has no player record
//      (e.g. a coach or parent who has a Passport for someone else).
//
// Date: 2026-10-05.

import { createClient } from '@supabase/supabase-js';
import { HockeyCareerSection } from '@/app/profile/[slug]/passport/HockeyCareerSection';
import { HockeyStatsSection } from '@/app/profile/[slug]/passport/HockeyStatsSection';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function PublicPassportCareerStats({
  internalUserId,
}: {
  internalUserId: string;
}) {
  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id, primary_position_category, first_name, last_name')
    .eq('user_id', internalUserId)
    .maybeSingle();

  if (!player) return null;

  const playerId = player.id;
  const positionCategory = (player.primary_position_category as 'forward' | 'defense' | 'goalie' | null) ?? null;
  const playerName = [player.first_name, player.last_name].filter(Boolean).join(' ') || 'this player';

  return (
    <>
      <HockeyCareerSection playerId={playerId} playerName={playerName} isOwner={false} />
      <HockeyStatsSection playerId={playerId} playerName={playerName} positionCategory={positionCategory} isOwner={false} />
    </>
  );
}
