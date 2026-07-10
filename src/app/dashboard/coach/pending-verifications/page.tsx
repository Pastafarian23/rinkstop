// src/app/dashboard/coach/pending-verifications/page.tsx
// Coach sees self-reported player team-history rows that they can verify.

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PendingVerificationsClient from './PendingVerificationsClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

export default async function PendingVerificationsPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login?redirect_url=/dashboard/coach/pending-verifications');

  // Resolve coach + their teams
  const { data: coach } = await supabaseAdmin
    .from('coach_profiles')
    .select('id, current_team_id')
    .eq('profile_id', userId)
    .maybeSingle();

  if (!coach) {
    return (
      <main className="min-h-screen bg-[#041E42] text-white">
        <div className="max-w-3xl mx-auto px-5 py-10">
          <h1 className="font-sport text-2xl mb-4">PENDING VERIFICATIONS</h1>
          <p className="text-white/70">
            Create your coach profile first.{' '}
            <a href="/dashboard/coach/profile" className="text-[#FFB81C] underline">
              Coach profile
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  // Get all team_ids this coach is on (current + history)
  const { data: cth } = await supabaseAdmin
    .from('coach_team_history')
    .select('team_id')
    .eq('coach_id', coach.id);

  const teamIds = Array.from(
    new Set(
      [
        coach.current_team_id,
        ...((cth ?? []).map((r) => r.team_id).filter(Boolean) as string[]),
      ].filter(Boolean) as string[]
    )
  );

  if (teamIds.length === 0) {
    return (
      <main className="min-h-screen bg-[#041E42] text-white">
        <div className="max-w-3xl mx-auto px-5 py-10">
          <h1 className="font-sport text-2xl mb-4" style={{ letterSpacing: '0.04em' }}>PENDING VERIFICATIONS</h1>
          <p className="text-white/70" style={{ fontSize: '0.875rem' }}>
            Add teams you coach to see player records that need verification.{' '}
            <a href="/dashboard/coach/teams" className="text-[#FFB81C] underline">
              Add team history
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  // Find self-reported rows on those teams
  const { data: rows } = await supabaseAdmin
    .from('hockey_player_team_history')
    .select(`
      id, team_id, jersey_number, position, role, start_date, end_date, created_at,
      player:players(id, first_name, last_name, slug, user_id),
      team:teams(name, slug),
      season:hockey_seasons(label)
    `)
    .eq('verification_source', 'self_reported')
    .in('team_id', teamIds)
    .order('created_at', { ascending: false })
    .limit(100);

  return <PendingVerificationsClient rows={rows ?? []} />;
}