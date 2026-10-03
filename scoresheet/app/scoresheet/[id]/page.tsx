/**
 * /scoresheet/[id] — game detail / scorekeeper view.
 *
 * Phase A2: This is a placeholder that shows the game state, the roster
 * (if any), and the next-action button. The full live scorekeeper view
 * (timer, event log, big-tap buttons) is Phase A3.
 */

import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { getServerSupabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Game = Database['public']['Tables']['games']['Row'];

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
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

  const homeRoster = (g.home_roster as any[]) || [];
  const awayRoster = (g.away_roster as any[]) || [];

  return (
    <>
      <Header title="Game" showBack />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
        {/* Score banner */}
        <section
          style={{
            background: 'linear-gradient(180deg, rgba(255,184,28,0.08) 0%, rgba(15,23,42,0.5) 100%)',
            border: '1px solid rgba(255,184,28,0.25)',
            borderRadius: 16,
            padding: '1.5rem 1.25rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '0.6875rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: g.status === 'in_progress' ? '#22C55E' : g.status === 'final' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.5)',
              fontWeight: 700,
              margin: '0 0 0.75rem',
            }}
          >
            {g.status === 'in_progress' ? `Period ${g.current_period} · ${formatClock(g.clock_seconds, g.clock_running)}` :
             g.status === 'final' ? 'Final' :
             g.status === 'scheduled' ? `Scheduled · ${formatTime(g.scheduled_at)}` : 'Draft'}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: g.home_team_color || '#FFB81C', fontWeight: 700, fontSize: '1.125rem', margin: 0, lineHeight: 1.2 }}>
                {g.home_team_name}
              </p>
              <p style={{ color: '#fff', fontSize: '3rem', fontWeight: 800, margin: '0.25rem 0 0', lineHeight: 1 }}>
                {g.home_score}
              </p>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.5rem' }}>vs</span>
            <div style={{ textAlign: 'left' }}>
              <p style={{ color: g.away_team_color || '#C8102E', fontWeight: 700, fontSize: '1.125rem', margin: 0, lineHeight: 1.2 }}>
                {g.away_team_name}
              </p>
              <p style={{ color: '#fff', fontSize: '3rem', fontWeight: 800, margin: '0.25rem 0 0', lineHeight: 1 }}>
                {g.away_score}
              </p>
            </div>
          </div>
          {g.venue_name && (
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', margin: '1rem 0 0' }}>
              {g.venue_name}
            </p>
          )}
        </section>

        {/* Placeholder: A3 will replace this with the real scorekeeper view */}
        <section
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px dashed rgba(255,184,28,0.4)',
            borderRadius: 12,
            padding: '2rem 1.5rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <p
            style={{
              fontSize: '0.6875rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#FFB81C',
              fontWeight: 700,
              margin: 0,
            }}
          >
            Phase A3 — Coming soon
          </p>
          <p
            style={{
              fontSize: '1.0625rem',
              color: '#fff',
              margin: '0.75rem 0 0.5rem',
              lineHeight: 1.4,
            }}
          >
            Live scorekeeper view
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Timer, period advancement, big-tap event buttons, play-by-play log,
            goalie change, penalty entry. Shipped in the next phase.
          </p>
        </section>

        {/* Roster summary (live mode only) */}
        {g.mode === 'live' && (
          <section
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <h2
              style={{
                fontSize: '0.6875rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 700,
                margin: '0 0 0.75rem',
              }}
            >
              Rosters
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <RosterSummary teamName={g.home_team_name} teamColor={g.home_team_color || '#FFB81C'} roster={homeRoster} />
              <RosterSummary teamName={g.away_team_name} teamColor={g.away_team_color || '#C8102E'} roster={awayRoster} />
            </div>
            {(homeRoster.length === 0 || awayRoster.length === 0) && (
              <Link
                href={`/scoresheet/${g.id}/roster`}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  marginTop: '0.75rem',
                  color: '#FFB81C',
                  fontSize: '0.875rem',
                }}
              >
                + Add rosters
              </Link>
            )}
          </section>
        )}

        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          QR sharing + RinkStop integration ship in Phase B.
        </p>
      </main>
    </>
  );
}

function formatClock(s: number, running: boolean): string {
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, '0')}${running ? ' ⏵' : ''}`;
}

function RosterSummary({ teamName, teamColor, roster }: { teamName: string; teamColor: string; roster: any[] }) {
  return (
    <div>
      <p style={{ fontSize: '0.8125rem', color: teamColor, fontWeight: 700, margin: '0 0 0.25rem' }}>
        {teamName}
      </p>
      {roster.length === 0 ? (
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>No roster</p>
      ) : (
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>
          {roster.map((p) => `#${p.jersey_number} ${p.name}`).join(', ')}
        </p>
      )}
    </div>
  );
}
