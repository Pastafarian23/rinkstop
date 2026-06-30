import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { TierBadge, FoundingMemberBadge } from '@/components/TierBadge';
import { formatTierPricePerYear } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

type TierId = 'free' | 'roster' | 'roster_plus' | 'pro' | 'business_starter' | 'business_pro' | 'business_premium' | 'enterprise';
// Tier rename 2026-06-17: was free/supporter/verified/pro → free/roster/roster_plus/pro/business tiers.

// Lower number = lower tier; 0 is free, 4 is enterprise
// Personal track ranks
const PERSONAL_TIER_RANK: Record<string, number> = {
  free: 0,
  roster: 1,
  roster_plus: 2,
  pro: 3,
};
// Business track ranks
const BUSINESS_TIER_RANK: Record<string, number> = {
  business_starter: 1,
  business_pro: 2,
  business_premium: 3,
  enterprise: 4,
};
const TIER_RANK: Record<string, number> = { ...PERSONAL_TIER_RANK, ...BUSINESS_TIER_RANK };

// What each tier just unlocked - kept short and concrete so the user knows
// exactly what to do with their new membership.
const NEXT_STEPS: Record<TierId, string[]> = {
  roster: [
    'Claim your player profile and link your kids.',
    'Opt in to the weekly digest from your account settings to get your favorite teams games, scores, and new signings in one email.',
    'Your Founding Member badge is now live on your profile. (First 500 paying members only - it stays after that.)',
  ],
  roster_plus: [
    'Photos and videos are now enabled on your profile.',
    'Open the Family Hub to start tracking your kids performance.',
    'Your Founding Member badge is now live on your profile.',
  ],
  pro: [
    'Your Pro tier is live - claim up to 5 listings and DM other Pro+ users.',
    'Verify your identity (optional, 60 seconds) to earn the only check on RinkStop. Visit /dashboard/identity.',
    'Claim your first listing - click any rink/team/league and tap "Claim".',
    'Above the search results in directory listings.',
  ],
  business_starter: [
    'Claim one business listing (rink, team, or league) - update hours, contacts, and unlock lead capture.',
    'Opt in to the weekly digest to get inquiries sent to your email.',
    'Your Founding Member badge is now live on your profile.',
  ],
  business_pro: [
    'Claim up to 5 listings and get a public business profile.',
    'Receive DMs from interested players and teams.',
    'Check your Leads tab in the dashboard.',
  ],
  business_premium: [
    'Claim up to 25 listings - bulk claim for your whole organization.',
    'Your Featured Listing rotation is live in your city.',
    'Open the Analytics dashboard to see who is viewing your listings.',
    'Custom branding is available in /dashboard/profile.',
  ],
  enterprise: [
    'Welcome to Enterprise. Your account has been configured for unlimited claims.',
    'Your dedicated success contact has been notified - they will reach out within 24 hours to scope data onboarding and API access.',
  ],
  free: [],
};

// What to upsell to (or "you've got everything" for premium/enterprise)
const NEXT_TIER: Record<TierId, { id: TierId | null; label: string; price: string; reason: string }> = {
  free: { id: 'roster', label: 'Roster Starter', price: formatTierPricePerYear('roster'), reason: 'Claim your profile and link unlimited kids' },
  roster: { id: 'roster_plus', label: 'Roster Pro', price: formatTierPricePerYear('roster_plus'), reason: 'Photos, videos, and Family Hub for your kids' },
  roster_plus: { id: 'pro', label: 'Roster Premium', price: formatTierPricePerYear('pro'), reason: 'Team management and advanced features' },
  pro: { id: 'business_starter', label: 'Business Starter', price: formatTierPricePerYear('business_starter'), reason: 'Switch to business track for lead capture and DMs' },
  business_starter: { id: 'business_pro', label: 'Business Pro', price: formatTierPricePerYear('business_pro'), reason: 'Claim up to 5, lead capture, DMs, analytics' },
  business_pro: { id: 'business_premium', label: 'Business Premium', price: formatTierPricePerYear('business_premium'), reason: 'Claim up to 25, featured rotation, analytics' },
  business_premium: { id: 'enterprise', label: 'Enterprise', price: 'Contact', reason: 'You\'ve got every self-serve feature. Enterprise is for national leagues, brands, and federations with custom needs.' },
  enterprise: { id: null, label: '—', price: '—', reason: 'You\'ve got every feature. Reach out to your success contact for anything else.' },
};

// Tier color (matches TierBadge)
const TIER_COLOR: Record<TierId, string> = {
  free: '#9CA3AF',
  roster: '#FFB81C',
  roster_plus: '#FFB81C',
  pro: '#14B8A6',
  business_starter: '#FFB81C',
  business_pro: '#14B8A6',
  business_premium: '#C8102E',
  enterprise: '#FFFFFF',
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; session_id?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  // Pull both the URL param and the current profile tier - they should match
  // by the time the user lands here (the webhook fires on
  // checkout.session.completed), but we tolerate a slight race by preferring
  // the profile's actual current tier.
  const params = await searchParams;
  const urlTier = (params.tier || 'roster') as TierId;
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
  const nextSteps = NEXT_STEPS[tier] || NEXT_STEPS.roster;
  const nextTier = NEXT_TIER[tier] || NEXT_TIER.roster;

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
          {tier === 'business_premium' && 'Business Premium is unlocked. Lead capture, featured rotation, analytics - it\'s all live.'}
          {tier === 'pro' && 'You\'re on Roster Premium. Team management and advanced features are now available.'}
          {tier === 'roster_plus' && 'You\'re on Roster Pro. Family Hub and photo features are now available.'}
          {tier === 'roster' && 'You\'re on Roster Starter. Your profile claim and kids linking is ready.'}
          {tier === 'business_starter' && 'You\'re on Business Starter. Your one free claim is ready - start with a rink or team you manage.'}
          {tier === 'business_pro' && 'You\'re on Business Pro. Lead capture, DMs, and analytics are now live.'}
          {tier === 'enterprise' && 'You\'re on Enterprise. Your success contact will reach out within 24 hours to scope onboarding.'}
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
            {nextTier.id === 'enterprise' ? `Contact ${nextTier.label} →` : `Upgrade to ${nextTier.label} →`}
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
