import Link from 'next/link';
// src/app/dashboard/passport/federation/page.tsx
// Server page for editing federation registration numbers + position category.

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import FederationFormClient from './FederationFormClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

export default async function FederationPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login?redirect_url=/dashboard/passport/federation');

  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, usa_hockey_number, hockey_canada_number, primary_position_category')
    .eq('user_id', userId)
    .maybeSingle();

  if (!player) {
    return (
      <main className="min-h-screen bg-[#041E42] text-white">
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
        <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/dashboard/passport" style={{ color: 'rgba(255,255,255,0.5)' }}>Passport</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Federation numbers</span>
      </nav>
      <div className="max-w-3xl mx-auto px-5 py-10">
          <h1 className="font-sport text-2xl mb-4">FEDERATION REGISTRATION</h1>
          <p className="text-white/70">
            You need to claim a player profile before setting federation numbers.{' '}
            <a href="/claim-your-listing" className="text-[#FFB81C] underline">
              Claim your profile
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  return (
    <FederationFormClient
      playerId={player.id}
      playerName={[player.first_name, player.last_name].filter(Boolean).join(' ') || 'this player'}
      initialUsaHockey={player.usa_hockey_number ?? ''}
      initialHockeyCanada={player.hockey_canada_number ?? ''}
      initialPositionCategory={player.primary_position_category ?? ''}
    />
  );
}