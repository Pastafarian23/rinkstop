// src/app/dashboard/coach/page.tsx
// Coach hub: profile, team history, pending verifications, my endorsements.

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

export default async function CoachHubPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login?redirect_url=/dashboard/coach');

  // Resolve coach profile + counts
  const { data: coach } = await supabaseAdmin
    .from('coach_profiles')
    .select('id, verification_status, license_issuing_authority, current_team_id, current_team:teams(name, slug)')
    .eq('profile_id', userId)
    .maybeSingle();

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('display_name, username')
    .eq('user_id', userId)
    .maybeSingle();

  let teamHistoryCount = 0;
  let endorsementsIssuedCount = 0;
  let pendingVerificationsCount = 0;

  if (coach) {
    const [th, endorsements, pending] = await Promise.all([
      supabaseAdmin.from('coach_team_history').select('id', { count: 'exact', head: true }).eq('coach_id', coach.id),
      supabaseAdmin.from('coach_endorsements').select('id', { count: 'exact', head: true }).eq('coach_id', coach.id).eq('status', 'active'),
      // Count pending verifications: self-reported rows on teams the coach is on
      supabaseAdmin
        .from('coach_team_history')
        .select('team_id', { count: 'exact' })
        .eq('coach_id', coach.id),
    ]);

    teamHistoryCount = th.count ?? 0;
    endorsementsIssuedCount = endorsements.count ?? 0;

    // Count pending-verifiable rows from hockey_player_team_history
    const teamIds = (pending.data ?? []).map((r) => r.team_id).filter(Boolean);
    if (teamIds.length > 0 || coach.current_team_id) {
      const teamsToCheck = teamIds.length > 0 ? teamIds : coach.current_team_id ? [coach.current_team_id] : [];
      if (teamsToCheck.length > 0) {
        const { count } = await supabaseAdmin
          .from('hockey_player_team_history')
          .select('id', { count: 'exact', head: true })
          .eq('verification_source', 'self_reported')
          .in('team_id', teamsToCheck);
        pendingVerificationsCount = count ?? 0;
      }
    }
  }

  const cardStyle: React.CSSProperties = {
    display: 'block',
    padding: '1rem 1.25rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    textDecoration: 'none',
    color: '#fff',
  };

  return (
    <main className="min-h-screen bg-[#041E42] text-white">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Coach</span>
        </nav>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            letterSpacing: '0.04em',
            marginBottom: '0.5rem',
          }}
        >
          COACH HUB
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          Manage your coaching record, verify player stats, and issue endorsements.
        </p>

        {!coach && (
          <div
            style={{
              padding: '1rem 1.25rem',
              background: 'rgba(255,184,28,0.06)',
              border: '1px solid rgba(255,184,28,0.2)',
              borderRadius: 10,
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            You don&apos;t have a coach profile yet. Create one to verify players and issue endorsements.
          </div>
        )}

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <Link href="/dashboard/coach/profile" style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <p style={{ fontWeight: 700, fontSize: '1rem' }}>Coach profile</p>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                {coach ? `Verification: ${coach.verification_status === 'self_reported' ? 'self-reported' : coach.verification_status.replace(/_/g, ' ')}` : 'Not set up'}
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              License #, issuing authority, expires, years coaching, current team, bio.
            </p>
          </Link>

          {coach && (
            <Link href="/dashboard/coach/credentials" style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <p style={{ fontWeight: 700, fontSize: '1rem' }}>Federation credentials</p>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  Verified federation-issued IDs
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                Submit your coaching license numbers (USA Hockey, Hockey Canada, IIHF) for admin verification.
              </p>
            </Link>
          )}

          <Link href="/dashboard/coach/teams" style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <p style={{ fontWeight: 700, fontSize: '1rem' }}>Team history</p>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                {teamHistoryCount} team{teamHistoryCount === 1 ? '' : 's'}
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              Add teams you coach. You can only verify players on teams you&apos;re on.
            </p>
          </Link>

          <Link href="/dashboard/coach/pending-verifications" style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <p style={{ fontWeight: 700, fontSize: '1rem' }}>Pending verifications</p>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                {pendingVerificationsCount} row{pendingVerificationsCount === 1 ? '' : 's'}
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              Self-reported player team-affiliation rows on teams you coach. Verify or skip.
            </p>
          </Link>

          <Link href="/dashboard/coach/endorsements" style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <p style={{ fontWeight: 700, fontSize: '1rem' }}>My endorsements</p>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                {endorsementsIssuedCount} active
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              Endorsements you&apos;ve issued about players. Endorse a specific player from their profile page.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}