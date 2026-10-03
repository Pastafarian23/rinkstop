/**
 * /scoresheet/[id]/details — edit game-level metadata.
 *
 * Captures: rink (autocomplete from rinkstop), sheet label, home/away
 * coach names (autocomplete from rinkstop profiles). Pre-populated from
 * the game row so edits are quick.
 *
 * Renders inline on the scorekeeper view as a settings panel, but also
 * accessible as a standalone page so the link can be deep-linked.
 */

import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Header } from '@/components/Header';
import { getServerSupabase } from '@/lib/supabase';
import { GameDetailsForm } from './GameDetailsForm';
import type { Database } from '@/lib/database.types';

type Game = Database['public']['Tables']['games']['Row'];

export default async function GameDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const { id } = await params;
  const sb = getServerSupabase();
  if (!sb) notFound();

  const { data: game, error } = await sb.from('games').select('*').eq('id', id).maybeSingle();
  if (error || !game) notFound();
  const g = game as Game;
  if (g.owner_user_id !== userId) notFound();

  // If a rink_id is set, fetch the rink name for display.
  let rinkName: string | null = null;
  if ((g as any).rink_id) {
    const { data: rink } = await sb
      .from('rinks')
      .select('name')
      .eq('id', (g as any).rink_id)
      .maybeSingle();
    rinkName = rink?.name || null;
  }

  return (
    <>
      <Header title="Game details" showBack />
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 0.5rem',
          }}
        >
          Rink, sheet &amp; coaches
        </h1>
        <p
          style={{
            fontSize: '0.9375rem',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.5,
            margin: '0 0 1.5rem',
          }}
        >
          These details appear on the official PDF scoresheet. You can
          fill them in before, during, or after the game.
        </p>
        <GameDetailsForm
          gameId={g.id}
          initial={{
            venue_name: (g as any).venue_name,
            rink_id: (g as any).rink_id,
            rink_name: rinkName,
            sheet_label: (g as any).sheet_label,
            home_coach_name: (g as any).home_coach_name,
            home_coach_rinkstop_id: (g as any).home_coach_rinkstop_id,
            away_coach_name: (g as any).away_coach_name,
            away_coach_rinkstop_id: (g as any).away_coach_rinkstop_id,
          }}
        />
      </main>
    </>
  );
}
