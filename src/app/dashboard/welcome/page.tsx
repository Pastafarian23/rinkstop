import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { TierBadge, FoundingMemberBadge } from '@/components/TierBadge';
import { formatTierPricePerYear } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

type TierId = 'free' | 'verified_identity' | 'identity_plus' | 'club_starter' | 'club_pro' | 'club_elite' | 'league' | 'federation' | 'business_listing' | 'business_plus';
// Tier rename 2026-06-17: was free/supporter/verified/pro → free/roster/roster_plus/pro/business tiers.

// Lower number = lower tier; 0 is free.
// Identity track
const PERSONAL_TIER_RANK: Record<string, number> = {
  free: 0,
  verified_identity: 1,
  identity_plus: 2,
};
// Organization track
const ORG_TIER_RANK: Record<string, number> = {
  club_starter: 1,
  club_pro: 2,
  club_elite: 3,
  league: 4,
  federation: 5,
};
// Business listings track
const BUSINESS_TIER_RANK: Record<string, number> = {
  business_listing: 1,
  business_plus: 2,
};
const TIER_RANK: Record<string, number> = { ...PERSONAL_TIER_RANK, ...ORG_TIER_RANK, ...BUSINESS_TIER_RANK };

// What each tier just unlocked - kept short and concrete so the user knows
// exactly what to do with their new membership.
const NEXT_STEPS: Record<TierId, string[]> = {
  // Identity
  verified_identity: [
    'Your Verified Hockey Identity is live - claim your player profile and link unlimited roles.',
    'Verify your identity (60 seconds) to earn the only check on RinkStop. Visit /dashboard/identity.',
    'Claim your first role - click any rink/team/league and tap "Claim".',
  ],
  identity_plus: [
    'Identity Plus is live - Family Hub, photos, videos, advanced analytics.',
    'Verify your identity (60 seconds) to earn the check on RinkStop. Visit /dashboard/identity.',
    'Set up your Family Hub to track unlimited children.',
  ],
  // Organization
  club_starter: [
    'Club Starter is live - manage one organization with up to 30 players.',
    'Set up your team management and registration workflows.',
    'Your Founding Member badge is now live on your profile.',
  ],
  club_pro: [
    'Club Pro is live - up to 150 players, multiple teams, coach and volunteer management.',
    'Open the Equipment and Financial Reporting tabs.',
    'Configure player transfers in /dashboard/team.',
  ],
  club_elite: [
    'Club Elite is live - unlimited teams, advanced analytics, custom branding.',
    'Open the Analytics dashboard to see your reach.',
    'API access and bulk imports are available - see /dashboard/team.',
  ],
  league: [
    'Welcome to League. Your account has been configured for league-wide management.',
    'Your dedicated success contact has been notified - they will reach out within 24 hours.',
  ],
  federation: [
    'Welcome to Federation. Your account has been configured for governance and compliance.',
    'Your dedicated success team has been notified - they will reach out within 24 hours.',
  ],
  // Business listings
  business_listing: [
    'Business Listing is live - update your contact, hours, photos, and unlock lead capture.',
    'Opt in to the weekly digest to get inquiries sent to your email.',
    'Your Founding Member badge is now live on your profile.',
  ],
  business_plus: [
    'Business Plus is live - claim multiple listings, get featured placement, messaging, and bookings.',
    'Open the Promotions and Bookings tabs to configure your offerings.',
    'Enhanced analytics available in the dashboard.',
  ],
  free: [],
};

// What to upsell to (or "you've got everything" for the top of each group)
const NEXT_TIER: Record<TierId, { id: TierId | null; label: string; price: string; reason: string }> = {
  free: { id: 'verified_identity', label: 'Verified Identity', price: formatTierPricePerYear('verified_identity'), reason: 'Required for active participation - claim your profile, unlimited roles under one identity' },
  verified_identity: { id: 'identity_plus', label: 'Identity Plus', price: formatTierPricePerYear('identity_plus'), reason: 'Family Hub, photos, videos, advanced analytics, achievement tracking' },
  identity_plus: { id: null, label: '—', price: '—', reason: 'You have the top individual plan. Switch to an Organization plan to manage a club, league, or federation.' },
  // Organization progression
  club_starter: { id: 'club_pro', label: 'Club Pro', price: formatTierPricePerYear('club_pro'), reason: 'Up to 150 players, multiple teams, coach management' },
  club_pro: { id: 'club_elite', label: 'Club Elite', price: formatTierPricePerYear('club_elite'), reason: 'Unlimited teams, advanced analytics, custom branding, API access' },
  club_elite: { id: 'league', label: 'League', price: formatTierPricePerYear('league'), reason: 'You have the top club plan. League is for league-wide management.' },
  league: { id: 'federation', label: 'Federation', price: 'Custom', reason: 'League-wide management is the top of the org tier. Federation is for national governance.' },
  federation: { id: null, label: '—', price: '—', reason: 'You have the top organization plan. Reach out to your success team for anything else.' },
  // Business listings progression
  business_listing: { id: 'business_plus', label: 'Business Plus', price: formatTierPricePerYear('business_plus'), reason: 'Multiple listings, featured placement, messaging, bookings' },
  business_plus: { id: null, label: '—', price: '—', reason: 'You have the top business listing plan.' },
};

// Tier color (matches TierBadge)
const TIER_COLOR: Record<TierId, string> = {
  free: '#9CA3AF',
  verified_identity: '#FFB81C',
  identity_plus: '#FFB81C',
  club_starter: '#C8102E',
  club_pro: '#C8102E',
  club_elite: '#C8102E',
  league: '#C8102E',
  federation: '#818CF8',
  business_listing: '#14B8A6',
  business_plus: '#14B8A6',
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; session_id?: string }>;
}) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  // Pull both the URL param and the current profile tier - they should match
  // by the time the user lands here (the webhook fires on
  // checkout.session.completed), but we tolerate a slight race by preferring
  // the profile's actual current tier.
  const params = await searchParams;
  // Default to 'verified_identity' if no tier in URL (post-checkout redirect).
  const urlTier = (params.tier || 'verified_identity') as TierId;
  const sessionId = params.session_id || null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier, is_founding_member, display_name, email')
    .eq('user_id', userId)
    .maybeSingle();

  // If the user hasn't actually been upgraded yet (webhook race), still show
  // the page but flag it. The webhook will catch up within a second or two.
  const actualTier = ((profile?.tier as TierId | undefined) || 'free') as TierId;
  const upgraded = actualTier !== 'free' && TIER_RANK[actualTier] >= TIER_RANK[urlTier];
  const tier = upgraded ? actualTier : urlTier;
  const color = TIER_COLOR[tier] || '#FFB81C';
  const isFounding = profile?.is_founding_member || false;
  const nextSteps = NEXT_STEPS[tier] || NEXT_STEPS.free;
  const nextTier = NEXT_TIER[tier] || NEXT_TIER.free;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* ---- Hero ------------------------------------------------------------- */}
      <div
        style={{
          background: `linear-gradient(135deg, ${color}33 0%, ${color}0A 100%)`,
          border: `1px solid ${color}55`,
          borderRadius: 16,
          padding: 'clamp(1.5rem, 4vw, 2.5rem)',
          textAlign: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color, marginBottom: '0.5rem' }}>
          Welcome
        </div>
        <h1
          className="font-sport"
          style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', color: '#fff', lineHeight: 0.95, margin: '0 0 0.625rem' }}
        >
          YOU&apos;RE IN
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <TierBadge tier={tier} size="md" />
          {isFounding && <FoundingMemberBadge />}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.9375rem, 2vw, 1rem)', maxWidth: 480, margin: '0 auto' }}>
          {tier === 'business_plus' && 'Business Plus is unlocked. Multiple listings, featured placement, messaging, bookings - it\'s all live.'}
          {tier === 'verified_identity' && 'You\'re on Verified Identity. Your profile claim and unlimited roles under one identity are ready.'}
          {tier === 'identity_plus' && 'You\'re on Identity Plus. Family Hub, photos, videos, and advanced analytics are now available.'}
          {tier === 'club_starter' && 'You\'re on Club Starter. Your organization and up to 30 players are ready to manage.'}
          {tier === 'club_pro' && 'You\'re on Club Pro. Up to 150 players, multiple teams, and advanced organization tools are live.'}
          {tier === 'club_elite' && 'You\'re on Club Elite. Unlimited teams, advanced analytics, and custom branding are unlocked.'}
          {tier === 'league' && 'You\'re on League. League-wide management features are live. Your success contact will reach out within 24 hours.'}
          {tier === 'federation' && 'You\'re on Federation. Your success team will reach out within 24 hours to scope governance and compliance.'}
          {tier === 'business_listing' && 'You\'re on Business Listing. Your verified business claim with contact and lead form is ready.'}
        </p>
        {!upgraded && (
          <div style={{ marginTop: 12, fontSize: '0.8125rem', color: '#FFB81C' }}>
            Finalizing your upgrade... (usually under 5 seconds - refresh if it doesn't update)
          </div>
        )}
      </div>

      {/* ---- What you can do now --------------------------------------------- */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: 'clamp(1.25rem, 3vw, 1.75rem)',
          marginBottom: '1.5rem',
        }}
      >
        <h2
          className="font-sport"
          style={{ fontSize: 'clamp(1.25rem, 3.5vw, 1.5rem)', color: '#fff', margin: '0 0 1rem' }}
        >
          WHAT YOU CAN DO NOW
        </h2>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', color: 'rgba(255,255,255,0.78)', fontSize: '0.9375rem', lineHeight: 1.7 }}>
          {nextSteps.map((step, i) => (
            <li key={i} style={{ marginBottom: '0.625rem' }}>{step}</li>
          ))}
        </ol>
      </div>

      {/* ---- Quick actions ---------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem', marginBottom: '1.5rem' }}>
        <Link
          href="/directory/rinks"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', gap: 6,
            background: 'rgba(255,184,28,0.06)', border: '1px solid rgba(255,184,28,0.3)', borderRadius: 8,
            color: '#fff', textDecoration: 'none', textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>🏒</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Browse Rinks</span>
        </Link>
        <Link
          href="/dashboard/claims"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', gap: 6,
            background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.3)', borderRadius: 8,
            color: '#fff', textDecoration: 'none', textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>✋</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>My Claims</span>
        </Link>
        <Link
          href="/dashboard/profile"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', gap: 6,
            background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.3)', borderRadius: 8,
            color: '#fff', textDecoration: 'none', textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>👤</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>My Profile</span>
        </Link>
        {nextTier.id && (
          <Link
            href={`/pricing?tier=${nextTier.id}`}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '1rem', gap: 6,
              background: 'linear-gradient(135deg, #C8102E 0%, #9B0D23 100%)', border: 'none', borderRadius: 8,
              color: '#fff', textDecoration: 'none', textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>⬆️</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Upgrade to {nextTier.label}</span>
          </Link>
        )}
      </div>

      {/* ---- Upsell (or "you've got everything") ------------------------------ */}
      {nextTier.id ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.15)',
            borderRadius: 12,
            padding: 'clamp(1rem, 3vw, 1.5rem)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
            Want more?
          </div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
            <strong style={{ color: '#fff' }}>{nextTier.label}</strong> ({nextTier.price}) - {nextTier.reason}.
          </p>
          <Link
            href={`/pricing?tier=${nextTier.id}`}
            className="btn"
            style={{ background: '#FFB81C', color: '#041E42' }}
          >
            {nextTier.id === 'federation' || nextTier.id === 'league' ? `Contact Sales →` : `Upgrade to ${nextTier.label} →`}
          </Link>
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(20,184,166,0.04)',
            border: '1px solid rgba(20,184,166,0.3)',
            borderRadius: 12,
            padding: 'clamp(1rem, 3vw, 1.5rem)',
            textAlign: 'center',
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.9375rem', margin: 0 }}>
            {nextTier.reason}
          </p>
        </div>
      )}

      {/* ---- Session metadata (hidden, for debugging) ------------------------- */}
      {sessionId && (
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.25)' }}>
          Reference: {sessionId}
        </div>
      )}
    </div>
  );
}
