// src/app/dashboard/passport/page.tsx
// Hub page for the passport editor. Shows current state + links to all forms.
//
// Workstream 2 (Phase 2A — Passport Dashboard): the canonical Hockey
// Passport dashboard lives here. When PASSPORT_DASHBOARD is enabled AND
// the user has a Passport, a Passport Dashboard section renders above the
// existing Passport editor (which is now labeled "Passport Management").
//
// Per the spec rule "No existing Passport functionality may be removed
// until a superior Passport-native workflow exists": the existing editor
// section is preserved exactly as it was. The new dashboard is purely
// additive — the existing return paths, sub-route references, FAQ, public
// profile edit links, and OnboardingChecklist entries are unaffected.
//
// Per the architectural rule: the Identity Resolver is the sole identity
// lookup entry point. This page never queries Passport tables directly;
// all data flows through passportService.getDashboardState().

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { PassportCompletenessBadge } from '@/components/PassportCompletenessBadge';
import { PassportCard } from '@/components/passport/PassportCard';
import { PassportTimeline } from '@/components/passport/PassportTimeline';
import { PassportNextSteps } from '@/components/passport/PassportNextSteps';
import {
  isPassportFlagEnabled,
  passportService,
} from '@/lib/passport';

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

  // Workstream 2 (Phase 2A + 2B): fetch Passport Dashboard state via the
  // Identity Resolver / Passport Service. When PASSPORT_DASHBOARD is off
  // (the default), passportState is null and the existing editor renders
  // unchanged. When on, we also auto-activate a pending Passport on first
  // visit (per passport-service.ts line 88 — Q1 activation decision).
  const passportDashboardEnabled = isPassportFlagEnabled('PASSPORT_DASHBOARD');
  const passportState = passportDashboardEnabled
    ? await passportService.getDashboardState(userId).catch((err: unknown): null => {
        console.error('[dashboard/passport] getDashboardState failed:', err);
        return null;
      })
    : null;

  // Activation now happens inside passportService.getDashboardState().
  // No page-layer activation logic needed.

  // Resolve player
  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, primary_position_category, usa_hockey_number, hockey_canada_number')
    .eq('user_id', userId)
    .maybeSingle();

  if (!player) {
    return (
      <main className="min-h-screen bg-[#041E42] text-white">
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Passport</span>
        </nav>
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

  const completeSections = [
    counts.history > 0,
    counts.stats > 0,
    !!(player.usa_hockey_number || player.hockey_canada_number),
  ].filter(Boolean).length;
  const completenessPercent = Math.round((completeSections / 3) * 100);

  const playerName = [player.first_name, player.last_name].filter(Boolean).join(' ') || 'this player';

  // Workstream 2 (Phase 2A + 2C + 2D): build the new Passport Dashboard
  // section as an additive JSX fragment. Returns null when:
  //   - PASSPORT_DASHBOARD flag is off (default)
  //   - User has no Passport yet
  // The existing editor below is unchanged in either case.
  const passportDashboardSection: React.ReactNode = passportState?.passport ? (
    <section
      aria-label="Hockey Passport"
      style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        display: 'grid',
        gap: '1.25rem',
      }}
    >
      <header>
        <p style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          letterSpacing: '0.04em',
          margin: 0,
          lineHeight: 1.1,
        }}>
          Your Hockey Passport
        </p>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', margin: '0.5rem 0 0', maxWidth: 540 }}>
          One identity. Every team. Every rink. Every season.
        </p>
      </header>

      <PassportCard
        passport={passportState.passport}
        view={passportState.view}
        holderName={playerName}
        photoUrl={cu?.imageUrl ?? null}
        qrImageSrc={
          passportState.passport
            ? `/api/internal/passport/qr/${encodeURIComponent(passportState.passport.passportId)}`
            : undefined
        }
      />

      <PassportTimeline events={passportState.recentEvents} />

      <PassportNextSteps view={passportState.view} hasPlayerProfile={!!player} />

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
        <p style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '0.75rem',
          letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.5)',
          margin: '0 0 0.625rem',
        }}>
          MANAGE PASSPORT
        </p>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8125rem', margin: 0 }}>
          Add and update the records that make up your Passport below.
        </p>
      </div>
    </section>
  ) : null;

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

        {passportDashboardSection}

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

        <PassportCompletenessBadge completed={completeSections} total={3} size="md" />

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
          The passport appears below your photo history on your public profile page.
        </p>
      </div>
    </main>
  );
}