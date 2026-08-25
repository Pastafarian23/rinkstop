import Link from 'next/link';
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

  // Tier gate — Hockey Passport requires Verified Identity or higher.
  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();
  if ((callerProfile?.tier ?? 'free') === 'free') {
    return (
      <main className="min-h-screen bg-[#041E42] text-white">
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/dashboard/passport" style={{ color: 'rgba(255,255,255,0.5)' }}>Passport</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Add season stats</span>
        </nav>
        <div className="max-w-3xl mx-auto px-5 py-10">
          <h1 className="font-sport text-2xl mb-4">ADD SEASON STATS</h1>
          <p className="text-white/80 mb-2">
            Hockey Passport is available on Verified Identity ($24.99/yr) and above.
          </p>
          <p className="text-white/60 text-sm mb-6">
            Stats are part of your Hockey Passport. Upgrade to add per-season numbers.
          </p>
          <a
            href="/pricing"
            className="inline-block bg-[#FFB81C] hover:bg-[#FFB81C]/90 text-[#041E42] font-semibold rounded-lg px-5 py-2.5"
          >
            Upgrade to Hockey Passport
          </a>
        </div>
      </main>
    );
  }

  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, primary_position_category')
    .eq('user_id', userId)
    .maybeSingle();

  if (!player) {
    return (
      <main className="min-h-screen bg-[#041E42] text-white">
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
        <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/dashboard/passport" style={{ color: 'rgba(255,255,255,0.5)' }}>Passport</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Add season stats</span>
      </nav>
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