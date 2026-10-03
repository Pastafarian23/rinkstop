/**
 * /scoresheet/new/live — Step 1 of the live game creation wizard.
 *
 * 3-step flow:
 *   1. Game info (teams, venue, date)  ← this page
 *   2. Roster entry (jerseys, names, positions)
 *   3. Settings (period length, OT rules)
 *
 * State is held in URL search params so the wizard is stateless and
 * works without JS. Step 1 → Step 2 hands off via `?game=...` once
 * the game row is created in DB.
 *
 * For Phase A2 we keep step 1 simple: manual entry only. RinkStop
 * team search + favorites picker comes in a follow-up.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Header } from '@/components/Header';
import { getServerSupabase, getBrowserSupabase } from '@/lib/supabase';
import { NewLiveGameForm } from './NewLiveGameForm';
import type { Database } from '@/lib/database.types';

type Favorite = Database['public']['Tables']['user_favorite_teams']['Row'];

export default async function NewLiveGamePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const sb = getServerSupabase();
  if (!sb) {
    return (
      <>
        <Header title="New live game" showBack />
        <main style={{ padding: '2rem 1rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>Unable to load. Please try again.</p>
        </main>
      </>
    );
  }

  // Load user's favorite teams for the picker.
  const { data: favorites } = await sb
    .from('user_favorite_teams')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (
    <>
      <Header title="New live game" showBack />
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
        <StepIndicator current={1} />
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#fff',
            margin: '1rem 0 0.5rem',
          }}
        >
          Game info
        </h1>
        <p
          style={{
            fontSize: '0.9375rem',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.5,
            margin: '0 0 1.5rem',
          }}
        >
          Enter the teams, venue, and date. You can add rosters in the next step.
        </p>
        <NewLiveGameForm
          favorites={(favorites || []) as Favorite[]}
          userId={userId}
        />
        <p
          style={{
            fontSize: '0.8125rem',
            color: 'rgba(255,255,255,0.5)',
            marginTop: '1.5rem',
            textAlign: 'center',
          }}
        >
          Looking to just track a game you&apos;re watching?{' '}
          <Link href="/scoresheet/new/watch" style={{ color: '#FFB81C' }}>
            Use watch mode
          </Link>
          .
        </p>
      </main>
    </>
  );
}

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const labels = ['Game info', 'Roster', 'Settings'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {labels.map((label, i) => {
        const stepNum = (i + 1) as 1 | 2 | 3;
        const isActive = stepNum === current;
        const isComplete = stepNum < current;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: isActive ? '#FFB81C' : isComplete ? 'rgba(255,184,28,0.3)' : 'rgba(255,255,255,0.1)',
                color: isActive ? '#041E42' : 'rgba(255,255,255,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8125rem',
                flexShrink: 0,
              }}
            >
              {isComplete ? '✓' : stepNum}
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {label}
            </span>
            {stepNum < 3 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: isComplete ? 'rgba(255,184,28,0.3)' : 'rgba(255,255,255,0.1)',
                  marginLeft: '0.25rem',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
