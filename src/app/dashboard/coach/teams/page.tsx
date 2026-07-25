import Link from 'next/link';
// src/app/dashboard/coach/teams/page.tsx
// Coach manages their team history.

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import CoachTeamsClient from './CoachTeamsClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

export default async function CoachTeamsPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login?redirect_url=/dashboard/coach/teams');

  // Resolve coach
  const { data: coach } = await supabaseAdmin
    .from('coach_profiles')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();

  if (!coach) {
    return (
      <main className="min-h-screen bg-[#041E42] text-white">
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
        <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/dashboard/coach" style={{ color: 'rgba(255,255,255,0.5)' }}>Coach</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>My teams</span>
      </nav>
      <div className="max-w-3xl mx-auto px-5 py-10">
          <h1 className="font-sport text-2xl mb-4">TEAM HISTORY</h1>
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

  const [{ data: history }, { data: seasons }, { data: teams }] = await Promise.all([
    supabaseAdmin
      .from('coach_team_history')
      .select('id, team_id, role, season_id, start_date, end_date, created_at, team:teams(name, slug, league_id, leagues(name)), season:hockey_seasons(label)')
      .eq('coach_id', coach.id)
      .order('start_date', { ascending: false }),
    supabaseAdmin
      .from('hockey_seasons')
      .select('id, label, start_date, end_date')
      .order('start_date', { ascending: false }),
    supabaseAdmin
      .from('team_workspaces')
      .select('id, name, slug, league_id, leagues(name)')
      .eq('is_active', true)
      .order('name')
      .limit(2000),
  ]);

  return (
    <CoachTeamsClient
      coachId={coach.id}
      history={history ?? []}
      seasons={seasons ?? []}
      teams={teams ?? []}
    />
  );
}