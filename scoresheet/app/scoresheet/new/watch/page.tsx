/**
 * /scoresheet/new/watch — Watch mode quickstart.
 *
 * 1-step flow: team names + venue + date. No roster, no settings.
 * The game is created in 'scheduled' status so it shows on the dashboard
 * ready to be tracked.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Header } from '@/components/Header';
import { getServerSupabase } from '@/lib/supabase';
import { NewWatchGameForm } from './NewWatchGameForm';
import type { Database } from '@/lib/database.types';

type Favorite = Database['public']['Tables']['user_favorite_teams']['Row'];

export default async function NewWatchGamePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const sb = getServerSupabase();
  if (!sb) {
    return (
      <>
        <Header title="New watch game" showBack />
        <main style={{ padding: '2rem 1rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>Unable to load. Please try again.</p>
        </main>
      </>
    );
  }

  const { data: favorites } = await sb
    .from('user_favorite_teams')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (
    <>
      <Header title="New watch game" showBack />
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 0.5rem',
          }}
        >
          Watch a game
        </h1>
        <p
          style={{
            fontSize: '0.9375rem',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.5,
            margin: '0 0 1.5rem',
          }}
        >
          Just the teams. Tap &quot;Home goal&quot; or &quot;Away goal&quot; as
          you watch.
        </p>
        <NewWatchGameForm favorites={(favorites || []) as Favorite[]} />
        <p
          style={{
            fontSize: '0.8125rem',
            color: 'rgba(255,255,255,0.5)',
            marginTop: '1.5rem',
            textAlign: 'center',
          }}
        >
          Scoring a real game?{' '}
          <Link href="/scoresheet/new/live" style={{ color: '#FFB81C' }}>
            Use live mode
          </Link>
          .
        </p>
      </main>
    </>
  );
}
