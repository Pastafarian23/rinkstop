// src/app/dashboard/coach/endorse/[playerId]/page.tsx
// Coach submits an endorsement for a specific player.

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import EndorsePlayerFormClient from './EndorsePlayerFormClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

export default async function EndorsePlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login?redirect_url=/dashboard/coach');

  const { playerId } = await params;

  const [{ data: coach }, { data: player }] = await Promise.all([
    supabaseAdmin
      .from('coach_profiles')
      // WS8 PR4: license_issuing_authority was dropped from coach_profiles.
      // Federation-level verification still flows through verification_status.
      .select('id, verification_status')
      .eq('profile_id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, slug')
      .eq('id', playerId)
      .maybeSingle(),
  ]);

  if (!player) notFound();

  if (!coach) {
    return (
      <main className="min-h-screen bg-[#041E42] text-white">
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
        <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/dashboard/coach" style={{ color: 'rgba(255,255,255,0.5)' }}>Coach</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Endorse player</span>
      </nav>
      <div className="max-w-3xl mx-auto px-5 py-10">
          <h1 className="font-sport text-2xl mb-4">ENDORSE A PLAYER</h1>
          <p className="text-white/70">
            Create your coach profile before endorsing players.{' '}
            <a href="/dashboard/coach/profile" className="text-[#FFB81C] underline">
              Coach profile
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  const playerName = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() || 'Player';
  const playerHref = player.slug ? `/directory/players/${player.slug}` : null;

  return (
    <EndorsePlayerFormClient
      playerId={player.id}
      playerName={playerName}
      playerHref={playerHref}
    />
  );
}