/**
 * /scoresheet — main dashboard
 *
 * Lists the user's games grouped by status (in_progress, scheduled, draft,
 * recent final). Plus a "+ New game" CTA that routes to the mode picker.
 *
 * Server component. Fetches via the per-request user Supabase client
 * so RLS scopes to the current Clerk user.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getServerSupabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import type { Database } from '@/lib/database.types';

type Game = Database['public']['Tables']['games']['Row'];

const STATUS_ORDER: Game['status'][] = ['in_progress', 'scheduled', 'draft', 'final'];
const STATUS_LABEL: Record<Game['status'], string> = {
  draft: 'Drafts',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  final: 'Recently completed',
};
const STATUS_COLOR: Record<Game['status'], string> = {
  draft: 'rgba(255,255,255,0.4)',
  scheduled: '#FFB81C',
  in_progress: '#22C55E',
  final: 'rgba(255,255,255,0.5)',
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default async function Dashboard() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const sb = getServerSupabase();
  if (!sb) {
    return (
      <>
        <Header title="Dashboard" />
        <main style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>
            Unable to load games. Please try again.
          </p>
        </main>
      </>
    );
  }

  // Fetch games owned by this user, most recent first.
  // Service role bypasses RLS, so we filter explicitly by owner_user_id.
  const { data: games, error } = await sb
    .from('games')
    .select('*')
    .eq('owner_user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[dashboard] games fetch error:', error);
  }

  const gamesByStatus: Record<Game['status'], Game[]> = {
    draft: [],
    scheduled: [],
    in_progress: [],
    final: [],
  };
  for (const g of (games || []) as Game[]) {
    gamesByStatus[g.status]?.push(g);
  }

  return (
    <>
      <Header title="Dashboard" />
      <main
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '1.25rem 1rem 4rem',
        }}
      >
        {/* Hero / CTA */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            marginBottom: '2rem',
          }}
        >
          <Link
            href="/scoresheet/new/live"
            className="rs-card"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
              borderColor: '#FFB81C',
              background: 'linear-gradient(180deg, rgba(255,184,28,0.10) 0%, rgba(255,184,28,0.04) 100%)',
            }}
          >
            <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#FFB81C', fontWeight: 700, margin: 0 }}>
              Scorekeeper
            </p>
            <p style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#fff', margin: '0.5rem 0 0' }}>
              Live game →
            </p>
          </Link>
          <Link
            href="/scoresheet/new/watch"
            className="rs-card"
            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
          >
            <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 700, margin: 0 }}>
              Fan
            </p>
            <p style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#fff', margin: '0.5rem 0 0' }}>
              Watch game →
            </p>
          </Link>
        </section>

        {/* Empty state */}
        {(!games || games.length === 0) && (
          <section
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: '2rem 1.5rem',
              textAlign: 'center',
              marginBottom: '2rem',
            }}
          >
            <p
              style={{
                fontSize: '0.6875rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.5)',
                margin: 0,
              }}
            >
              No games yet
            </p>
            <p
              style={{
                fontSize: '1.0625rem',
                color: '#fff',
                margin: '0.5rem 0 1rem',
                lineHeight: 1.4,
              }}
            >
              Start a live game or watch a game you&apos;re following.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/scoresheet/new/live" className="rs-btn-primary" style={{ minWidth: 140 }}>
                Live game
              </Link>
              <Link href="/scoresheet/new/watch" className="rs-btn-secondary" style={{ minWidth: 140 }}>
                Watch game
              </Link>
            </div>
          </section>
        )}

        {/* Games grouped by status */}
        {STATUS_ORDER.map((status) => {
          const list = gamesByStatus[status];
          if (!list || list.length === 0) return null;
          return (
            <section key={status} style={{ marginBottom: '2rem' }}>
              <h2
                style={{
                  fontSize: '0.6875rem',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: STATUS_COLOR[status],
                  fontWeight: 700,
                  margin: '0 0 0.75rem',
                }}
              >
                {STATUS_LABEL[status]} ({list.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {list.map((g) => (
                  <Link
                    key={g.id}
                    href={`/scoresheet/${g.id}`}
                    className="rs-card"
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '4px' }}>
                        <span style={{ color: g.home_team_color || '#FFB81C', fontWeight: 700, fontSize: '0.9375rem' }}>
                          {g.home_team_name}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>vs</span>
                        <span style={{ color: g.away_team_color || '#C8102E', fontWeight: 700, fontSize: '0.9375rem' }}>
                          {g.away_team_name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                        {g.venue_name && <span>{g.venue_name}</span>}
                        {g.scheduled_at && (
                          <span>
                            {formatDate(g.scheduled_at)} {formatTime(g.scheduled_at)}
                          </span>
                        )}
                        {g.status === 'in_progress' && (
                          <span style={{ color: '#22C55E', fontWeight: 700 }}>
                            P{g.current_period} · {g.home_score}-{g.away_score}
                          </span>
                        )}
                        {g.status === 'final' && (
                          <span style={{ fontWeight: 700, color: '#fff' }}>
                            Final {g.home_score}-{g.away_score}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.25rem' }}>›</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        {/* Favorites shortcut */}
        <section
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '1.5rem',
            marginTop: '1rem',
          }}
        >
          <Link
            href="/favorites"
            style={{
              color: 'rgba(255,255,255,0.7)',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            ⚙ Manage favorite teams →
          </Link>
        </section>
      </main>
    </>
  );
}
