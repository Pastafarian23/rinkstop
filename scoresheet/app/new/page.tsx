/**
 * /new?fixture=<id> — Scoresheet deep-link landing page (Phase B2).
 *
 * Behavior:
 *   1. Reads the fixture via the prefill API.
 *   2. If signed in AND a scoresheet game is already linked to this
 *      fixture, redirects to the existing game (idempotent scan).
 *   3. If signed in AND no link yet, shows the game creation form
 *      pre-filled with home/away teams + venue + scheduled_at from
 *      the fixture. The mode defaults to 'live' (it's a real game).
 *   4. If not signed in, shows a "Sign in to track this game" CTA.
 *
 * This page lives at `/new` (not under `/scoresheet`) so the deep-link
 * stays short and so unauthenticated users land on a public page.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { getServerSupabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { NewGameFromFixtureForm } from './NewGameFromFixtureForm';
import { SignInCTA } from './SignInCTA';

interface PageProps {
  params: Promise<Record<string, never>>;
  searchParams: Promise<{ fixture?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function NewFromFixturePage({ searchParams }: PageProps) {
  const { fixture: fixtureId } = await searchParams;
  if (!fixtureId || !/^[0-9a-f-]{36}$/i.test(fixtureId)) {
    return <InvalidFixture />;
  }

  const sb = getServerSupabase();
  if (!sb) return <DatabaseError />;

  const { data: fixture, error } = await sb
    .from('fixtures')
    .select(`
      id, scheduled_at, status, home_team_id, away_team_id, league_id, venue_id,
      home_team:team_workspaces!fixtures_home_team_id_fkey(id, name, short_name, colors),
      away_team:team_workspaces!fixtures_away_team_id_fkey(id, name, short_name, colors),
      league:leagues(id, name, slug),
      rink:rinks!fixtures_venue_id_fkey(id, name, city, province_state, country)
    `)
    .eq('id', fixtureId)
    .maybeSingle();

  if (error || !fixture) return <InvalidFixture />;

  // If the fixture is already completed, don't allow tracking.
  const f = fixture as any;
  if (f.status === 'completed' || f.status === 'final') {
    return (
      <AlreadyFinished
        homeName={f.home_team?.name || 'Home'}
        awayName={f.away_team?.name || 'Away'}
        homeScore={f.home_score}
        awayScore={f.away_score}
      />
    );
  }

  // Auth check. If not signed in, show the sign-in CTA but still
  // expose the fixture data so the user knows what they're about to track.
  const { userId } = await auth();
  if (!userId) {
    return <SignInCTA fixtureId={fixtureId} homeName={f.home_team?.name} awayName={f.away_team?.name} leagueName={f.league?.name} scheduledAt={f.scheduled_at} />;
  }

  // Signed in — check for existing linked game.
  const { data: existing } = await sb
    .from('games')
    .select('id, status')
    .eq('rinkstop_fixture_id', fixtureId)
    .eq('owner_user_id', userId)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    redirect(`/scoresheet/${(existing as any).id}`);
  }

  // No existing game — show the pre-filled creation form.
  const prefill = {
    home_team_name: f.home_team?.name || '',
    home_team_rinkstop_id: f.home_team_id,
    home_team_color: extractColor(f.home_team?.colors),
    away_team_name: f.away_team?.name || '',
    away_team_rinkstop_id: f.away_team_id,
    away_team_color: extractColor(f.away_team?.colors),
    venue_name: f.rink ? `${f.rink.name}${f.rink.city ? `, ${f.rink.city}` : ''}` : null,
    rink_id: f.venue_id,
    scheduled_at: f.scheduled_at,
  };

  return (
    <>
      <Header title="Track with Scoresheet" />
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 0.5rem',
          }}
        >
          Pre-filled from rinkstop.com
        </h1>
        <p
          style={{
            fontSize: '0.9375rem',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.5,
            margin: '0 0 1.5rem',
          }}
        >
          We pulled the teams + venue from the rinkstop.com fixture.
          Confirm the game settings to start tracking.
        </p>
        <NewGameFromFixtureForm
          fixtureId={fixtureId}
          prefill={prefill}
        />
      </main>
    </>
  );
}

function extractColor(colors: any): string | null {
  if (!colors) return null;
  if (typeof colors === 'string') return colors;
  if (typeof colors === 'object') {
    if (Array.isArray(colors)) return colors[0] || null;
    return colors.primary || colors.main || colors.color || null;
  }
  return null;
}

function InvalidFixture() {
  return (
    <>
      <Header title="Track with Scoresheet" />
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '2.5rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '0 0 0.5rem' }}>
          Fixture not found
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
          The QR code you scanned doesn't link to a valid rinkstop.com fixture.
          It may have been deleted or the link is malformed.
        </p>
        <Link href="/scoresheet" className="rs-btn-primary" style={{ textDecoration: 'none' }}>
          Go to dashboard
        </Link>
      </main>
    </>
  );
}

function DatabaseError() {
  return (
    <>
      <Header title="Track with Scoresheet" />
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '2.5rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '0 0 0.5rem' }}>
          Service unavailable
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
          We can't reach the rinkstop.com database right now. Please try again in a moment.
        </p>
      </main>
    </>
  );
}

function AlreadyFinished({
  homeName,
  awayName,
  homeScore,
  awayScore,
}: {
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
}) {
  return (
    <>
      <Header title="Track with Scoresheet" />
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '2.5rem 1.5rem', textAlign: 'center' }}>
        <p
          style={{
            fontSize: '0.6875rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 700,
            margin: 0,
          }}
        >
          Game finished
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '0.75rem 0 0' }}>
          {awayName} {awayScore} @ {homeName} {homeScore}
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: '1rem 0 1.5rem' }}>
          This game is already final. Live tracking is no longer available.
        </p>
        <Link href="/scoresheet" className="rs-btn-primary" style={{ textDecoration: 'none' }}>
          Go to dashboard
        </Link>
      </main>
    </>
  );
}
