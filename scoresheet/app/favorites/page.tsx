/**
 * /favorites — manage favorite teams.
 * Simple CRUD list. Each team has a name + color + optional rinkstop link.
 */

import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Header } from '@/components/Header';
import { getServerSupabase } from '@/lib/supabase';
import { FavoritesForm } from './FavoritesForm';
import type { Database } from '@/lib/database.types';

type Favorite = Database['public']['Tables']['user_favorite_teams']['Row'];

export default async function FavoritesPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const sb = getServerSupabase();
  if (!sb) {
    return (
      <>
        <Header title="Favorites" showBack />
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
      <Header title="Favorites" showBack />
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 0.5rem',
          }}
        >
          Favorite teams
        </h1>
        <p
          style={{
            fontSize: '0.9375rem',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.5,
            margin: '0 0 1.5rem',
          }}
        >
          Quick-select your teams when creating a new game.
        </p>
        <FavoritesForm userId={userId} initial={(favorites || []) as Favorite[]} />
      </main>
    </>
  );
}
