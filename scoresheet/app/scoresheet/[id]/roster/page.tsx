/**
 * /scoresheet/[id]/roster — Step 2 of the live wizard.
 *
 * Roster entry: jersey + name + position per side. Required for live
 * mode. Skippable via "Use generic roster" if you just want to track
 * events without player attribution.
 *
 * On save, the game stays in 'draft' status (settings step is next).
 */

import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Header } from '@/components/Header';
import { getServerSupabase } from '@/lib/supabase';
import { RosterForm } from './RosterForm';
import type { Database } from '@/lib/database.types';

type Game = Database['public']['Tables']['games']['Row'];

export default async function RosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { id } = await params;
  const sb = getServerSupabase();
  if (!sb) notFound();

  const { data: game, error } = await sb
    .from('games')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !game) notFound();
  const g = game as Game;
  if (g.owner_user_id !== userId) notFound();

  if (g.mode !== 'live') {
    // Watch mode skips the roster step.
    redirect(`/scoresheet/${g.id}`);
  }

  return (
    <>
      <Header title="Roster" showBack />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 0.5rem',
          }}
        >
          Roster
        </h1>
        <p
          style={{
            fontSize: '0.9375rem',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.5,
            margin: '0 0 1.5rem',
          }}
        >
          Add the players for both teams. You can edit this later. Skip if you
          just want to track goals without player attribution.
        </p>
        <RosterForm
          gameId={g.id}
          homeTeamName={g.home_team_name}
          homeTeamColor={g.home_team_color || '#FFB81C'}
          awayTeamName={g.away_team_name}
          awayTeamColor={g.away_team_color || '#C8102E'}
          initialHomeRoster={(g.home_roster as any) || []}
          initialAwayRoster={(g.away_roster as any) || []}
        />
      </main>
    </>
  );
}
