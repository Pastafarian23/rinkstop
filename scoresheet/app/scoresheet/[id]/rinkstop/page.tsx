/**
 * /scoresheet/[id]/rinkstop — Submit-to-RinkStop flow (Phase B1).
 *
 * Three steps the user walks through:
 *   1. Link both teams to rinkstop team_workspaces (skip if already linked)
 *   2. Find a matching fixture (smart match by team IDs + scheduled_at)
 *   3. Confirm the link
 *
 * After linking, the user sees the fixture status + a "Unlink" option.
 * Future phases (B3 live broadcast, B4 final sync) build on this state.
 */

import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { getServerSupabase } from '@/lib/supabase';
import { RinkstopLinkPanel } from './RinkstopLinkPanel';
import type { Database } from '@/lib/database.types';

type Game = Database['public']['Tables']['games']['Row'];

export default async function RinkstopPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const { id } = await params;
  const sb = getServerSupabase();
  if (!sb) notFound();

  const { data: game, error } = await sb.from('games').select('*').eq('id', id).maybeSingle();
  if (error || !game) notFound();
  const g = game as Game;
  if ((g as any).owner_user_id !== userId) notFound();

  // If linked, also fetch the linked fixture for display.
  let linkedFixture: any = null;
  if ((g as any).rinkstop_fixture_id) {
    const { data: fixture } = await sb
      .from('fixtures')
      .select('id, scheduled_at, home_team_id, away_team_id, home_score, away_score, status, league_id, venue_id')
      .eq('id', (g as any).rinkstop_fixture_id)
      .maybeSingle();
    linkedFixture = fixture;
  }

  // Hydrate team names for the linked fixture teams.
  const linkedTeamIds = linkedFixture
    ? Array.from(new Set([linkedFixture.home_team_id, linkedFixture.away_team_id]))
    : [];
  let linkedTeamMap = new Map<string, string>();
  if (linkedTeamIds.length > 0) {
    const { data: teams } = await sb
      .from('team_workspaces')
      .select('id, name')
      .in('id', linkedTeamIds);
    for (const t of teams || []) linkedTeamMap.set(t.id, t.name);
  }

  return (
    <>
      <Header title="Submit to RinkStop" showBack />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 0.5rem',
          }}
        >
          Submit to RinkStop
        </h1>
        <p
          style={{
            fontSize: '0.9375rem',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.5,
            margin: '0 0 1.5rem',
          }}
        >
          Link this game to its rinkstop.com fixture so the result shows up
          in the directory, in player stats, and in post-game coverage.
        </p>
        <RinkstopLinkPanel
          gameId={g.id}
          game={{
            home_team_name: g.home_team_name,
            home_team_rinkstop_id: g.home_team_rinkstop_id,
            away_team_name: g.away_team_name,
            away_team_rinkstop_id: g.away_team_rinkstop_id,
            scheduled_at: g.scheduled_at,
            started_at: g.started_at,
            rinkstop_integration: (g as any).rinkstop_integration,
            rinkstop_fixture_id: (g as any).rinkstop_fixture_id,
          }}
          linkedFixture={linkedFixture}
          linkedTeamMap={Object.fromEntries(linkedTeamMap)}
        />
        <p
          style={{
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.4)',
            textAlign: 'center',
            marginTop: '2rem',
          }}
        >
          Need to link teams first?{' '}
          <Link
            href={`/scoresheet/${g.id}/details`}
            style={{ color: '#FFB81C', textDecoration: 'underline' }}
          >
            Edit game details
          </Link>
          .
        </p>
      </main>
    </>
  );
}
