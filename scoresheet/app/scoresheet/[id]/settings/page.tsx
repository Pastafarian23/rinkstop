/**
 * /scoresheet/[id]/settings — Step 3 of the live wizard.
 *
 * Hockey rules: period length, periods total, OT length, shootout on/off.
 * On save, the game moves from 'draft' to 'scheduled' and is ready
 * to be started from the dashboard.
 */

import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Header } from '@/components/Header';
import { getServerSupabase } from '@/lib/supabase';
import { SettingsForm } from './SettingsForm';
import type { Database } from '@/lib/database.types';

type Game = Database['public']['Tables']['games']['Row'];

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
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
    redirect(`/scoresheet/${g.id}`);
  }

  return (
    <>
      <Header title="Settings" showBack />
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 0.5rem',
          }}
        >
          Game settings
        </h1>
        <p
          style={{
            fontSize: '0.9375rem',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.5,
            margin: '0 0 1.5rem',
          }}
        >
          Defaults follow NHL rules. Override per-game if needed.
        </p>
        <SettingsForm
          gameId={g.id}
          initial={{
            period_length_seconds: g.period_length_seconds,
            periods_total: g.periods_total,
            overtime_length_seconds: g.overtime_length_seconds,
            shootout_enabled: g.shootout_enabled,
          }}
        />
      </main>
    </>
  );
}
