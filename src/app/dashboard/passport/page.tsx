// src/app/dashboard/passport/page.tsx
// Hub page for the passport editor. Shows current state + links to all forms.

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

export default async function PassportHubPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login?redirect_url=/dashboard/passport');

  // Resolve player
  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, primary_position_category, usa_hockey_number, hockey_canada_number')
    .eq('user_id', userId)
    .maybeSingle();

  if (!player) {
    return (
      <main className="min-h-screen bg-[#041E42] text-white">
        <div className="max-w-3xl mx-auto px-5 py-10">
          <h1 className="font-sport text-2xl mb-4" style={{ letterSpacing: '0.04em' }}>YOUR PASSPORT</h1>
          <p className="text-white/70">
            You need to claim a player profile before managing your passport.{' '}
            <a href="/claim-your-listing" className="text-[#FFB81C] underline">
              Claim your profile
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  // Stats for the dashboard
  const [historyCount, statsCount, endorsementCount] = await Promise.all([
    supabaseAdmin.from('hockey_player_team_history').select('id', { count: 'exact', head: true }).eq('player_id', player.id),
    supabaseAdmin.from('hockey_player_stats_season').select('id', { count: 'exact', head: true }).eq('player_id', player.id),
    supabaseAdmin.from('coach_endorsements').select('id', { count: 'exact', head: true }).eq('player_id', player.id),
  ]);

  const counts = {
    history: historyCount.count ?? 0,
    stats: statsCount.count ?? 0,
    endorsements: endorsementCount.count ?? 0,
  };

  const playerName = [player.first_name, player.last_name].filter(Boolean).join(' ') || 'this player';

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
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Passport</span>
        </nav>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            letterSpacing: '0.04em',
            marginBottom: '0.5rem',
          }}
        >
          YOUR HOCKEY PASSPORT
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          Manage {playerName}&apos;s verified record. Everything here shows on your public profile.
        </p>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <Link href="/dashboard/passport/team-history/new" style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <p style={{ fontWeight: 700, fontSize: '1rem' }}>Career history</p>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{counts.history} record{counts.history === 1 ? '' : 's'}</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              Add a team affiliation for a season. Self-reported until verified by a coach.
            </p>
          </Link>

          <Link href="/dashboard/passport/stats/new" style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <p style={{ fontWeight: 700, fontSize: '1rem' }}>Season stats</p>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{counts.stats} record{counts.stats === 1 ? '' : 's'}</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              Add per-season stats. Skater or goalie fields based on your primary position.
            </p>
          </Link>

          <Link href="/dashboard/passport/federation" style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <p style={{ fontWeight: 700, fontSize: '1rem' }}>Federation registration</p>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                {(player.usa_hockey_number || player.hockey_canada_number) ? 'Set' : 'Not set'}
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              USA Hockey # and Hockey Canada # registration numbers. Sets your primary position.
            </p>
          </Link>

          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: 'rgba(255,255,255,0.6)' }}>Coach endorsements</p>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{counts.endorsements}</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              Endorsements are written by coaches about you. You don&apos;t add them — ask a coach to endorse you.
              (Coach flow ships in Phase 4.)
            </p>
          </div>
        </div>

        <p style={{ marginTop: '2rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>
          Your public profile: <Link href="/profile/{/* profile slug not in player row */}" className="text-[#FFB81C] underline">view profile</Link>
          {' '}· The passport appears below your photo history on your public profile page.
        </p>
      </div>
    </main>
  );
}