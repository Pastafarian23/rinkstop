// src/app/dashboard/passport/stats/new/page.tsx
// Server page for adding per-season stats.

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import StatsFormClient from './StatsFormClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

export default async function NewStatsPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login?redirect_url=/dashboard/passport/stats/new');

  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, primary_position_category')
    .eq('user_id', userId)
    .maybeSingle();

  if (!player) {
    return (
      <main className="min-h-screen bg-[#041E42] text-white">
        <div className="max-w-3xl mx-auto px-5 py-10">
          <h1 className="font-sport text-2xl mb-4">ADD SEASON STATS</h1>
          <p className="text-white/70">
            You need to claim a player profile before adding stats.{' '}
            <a href="/claim-your-listing" className="text-[#FFB81C] underline">
              Claim your profile
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  const [{ data: seasons }, { data: existingHistory }] = await Promise.all([
    supabaseAdmin
      .from('hockey_seasons')
      .select('id, label, start_date, end_date')
      .order('start_date', { ascending: false }),
    supabaseAdmin
      .from('hockey_player_team_history')
      .select('id, team_name_snapshot, season_id, level, position, jersey_number')
      .eq('player_id', player.id)
      .order('start_date', { ascending: false })
      .limit(50),
  ]);

  // Existing stats — show in form so user knows what's already entered
  const { data: existingStats } = await supabaseAdmin
    .from('hockey_player_stats_season')
    .select('season_id, team_history_id, level, games_played, goals, assists, plus_minus, penalty_minutes, save_percentage, gaa')
    .eq('player_id', player.id);

  return (
    <StatsFormClient
      playerId={player.id}
      playerName={[player.first_name, player.last_name].filter(Boolean).join(' ') || 'this player'}
      positionCategory={player.primary_position_category}
      seasons={seasons ?? []}
      teamHistory={existingHistory ?? []}
      existingStats={existingStats ?? []}
    />
  );
}