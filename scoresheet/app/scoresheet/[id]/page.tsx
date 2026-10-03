/**
 * /scoresheet/[id] — game detail / live scorekeeper view.
 *
 * Renders the ScorekeeperView client component with the game + events
 * loaded server-side. Live mode shows the full scorekeeper (timer,
 * big-tap event buttons, play-by-play log). Watch mode shows a
 * simplified tap-to-record-goal UI.
 *
 * Pre-game (scheduled) and post-game (final) states are handled inside
 * ScorekeeperView.
 */

import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Header } from '@/components/Header';
import { getServerSupabase } from '@/lib/supabase';
import { ScorekeeperView } from './ScorekeeperView';
import type { Database } from '@/lib/database.types';

type Game = Database['public']['Tables']['games']['Row'];
type Event = Database['public']['Tables']['game_events']['Row'];

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { id } = await params;
  const sb = getServerSupabase();
  if (!sb) notFound();

  const { data: game, error } = await sb.from('games').select('*').eq('id', id).maybeSingle();
  if (error || !game) notFound();
  const g = game as Game;
  if (g.owner_user_id !== userId) notFound();

  const { data: eventsData } = await sb
    .from('game_events')
    .select('*')
    .eq('game_id', id)
    .order('period', { ascending: true })
    .order('clock_seconds', { ascending: true })
    .order('sequence_number', { ascending: true });

  return (
    <>
      <Header title={g.status === 'final' ? 'Final' : g.status === 'in_progress' ? 'Live' : g.status === 'draft' ? 'Draft' : 'Game'} showBack />
      <ScorekeeperView
        game={{
          id: g.id,
          mode: g.mode,
          status: g.status,
          home_team_name: g.home_team_name,
          home_team_color: g.home_team_color,
          home_roster: (g.home_roster as any) || null,
          away_team_name: g.away_team_name,
          away_team_color: g.away_team_color,
          away_roster: (g.away_roster as any) || null,
          current_period: g.current_period,
          clock_seconds: g.clock_seconds,
          clock_running: g.clock_running,
          home_score: g.home_score,
          away_score: g.away_score,
          period_length_seconds: g.period_length_seconds,
          periods_total: g.periods_total,
          overtime_length_seconds: g.overtime_length_seconds,
          shootout_enabled: g.shootout_enabled,
        }}
        events={(eventsData || []) as Event[]}
      />
    </>
  );
}
