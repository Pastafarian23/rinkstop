import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { TierBadge, FoundingMemberBadge } from '@/components/TierBadge';
import { formatTierPricePerYear } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

type TierId = 'free' | 'supporter' | 'verified' | 'pro';

// Lower number = lower tier; 0 is free, 3 is pro
const TIER_RANK: Record<TierId, number> = {
  free: 0,
  supporter: 1,
  verified: 2,
  pro: 3,
};

// What each tier just unlocked — kept short and concrete so the user knows
// exactly what to do with their new membership.
const NEXT_STEPS: Record<TierId, string[]> = {
  supporter: [
    'Claim 1 listing (your home rink, your kid’s team, your beer-league squad) — just click any rink/team/league and tap "Claim".',
    'Opt in to the weekly digest from your account settings to get your favorite teams’ games, scores, and new signings in one email.',
    'Your Founding Member badge is now live on your profile. (First 500 paying members only — it stays after that.)',
  ],
  verified: [
    'Your verified checkmark is now live on your profile and every listing you claim.',
    'Claim up to 5 listings — the next step is to claim your second, third, etc. Each one shows the checkmark.',
    'You can now send DMs to other Verified+ users. Try the Connections tab on a profile.',
    'Your profile page is public at rinkstop.com/profile/yourusername — share it anywhere.',
    'Above the search results in directory listings — your claimed rink/team now ranks higher in the city.',
  ],
  pro: [
    'Claim up to 25 listings — if you run a rink chain, league, or multi-team org, you can now bulk-claim everything.',
    'Your Featured Listing rotation is live in your city. Top of the directory on page load.',
    'A lead-capture form is now on your profile — visitors can contact you without signing up. Check the Leads tab in your dashboard.',
    'Open the Analytics dashboard to see who is viewing your profile, your listings, and your team.',
    'Custom branding on your public profile is available in /dashboard/profile.',
  ],
  free: [],
};

// What to upsell to (or "you’ve got everything" for pro/enterprise)
const NEXT_TIER: Record<TierId, { id: TierId | null; label: string; price: string; reason: string }> = {
  free: { id: 'supporter', label: 'Supporter', price: formatTierPricePerYear('supporter'), reason: 'Unlimited follows, claim 1 listing, weekly digest' },
  supporter: { id: 'verified', label: 'Verified', price: formatTierPricePerYear('verified'), reason: 'Verified checkmark, claim up to 5, public profile, DMs' },
  verified: { id: 'pro', label: 'Pro', price: formatTierPricePerYear('pro'), reason: 'Claim up to 25, featured rotation, lead capture, analytics' },
  pro: { id: null, label: '—', price: '—', reason: 'You’ve got every feature. Check Enterprise if you need more than 25 claims.' },
};

// Tier color (matches TierBadge)
const TIER_COLOR: Record<TierId, string> = {
  free: '#9CA3AF',
  supporter: '#FFB81C',
  verified: '#14B8A6',
  pro: '#C8102E',
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; session_id?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  // Pull both the URL param and the current profile tier — they should match
  // by the time the user lands here (the webhook fires on
  // checkout.session.completed), but we tolerate a slight race by preferring
  // the profile's actual current tier.
  const params = await searchParams;
  const urlTier = (params.tier || 'supporter') as TierId;
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
  const nextSteps = NEXT_STEPS[tier] || NEXT_STEPS.supporter;
  const nextTier = NEXT_TIER[tier] || NEXT_TIER.supporter;

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
          {tier === 'pro' && 'Pro is unlocked. Lead capture, featured rotation, analytics — it’s all live.'}
          {tier === 'verified' && 'You’re verified. Your checkmark is showing on your profile and every listing you claim.'}
          {tier === 'supporter' && 'You’re a Founding-tier Supporter. The badge is live, your one free claim is ready.'}
        </p>
        {!upgraded && (
          <div style={{ marginTop: 12, fontSize: '0.8125rem', color: '#FFB81C' }}>
            Finalizing your upgrade… (usually under 5 seconds — refresh if it doesn’t update)
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
        {tier !== 'pro' && nextTier.id && (
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
            <strong style={{ color: '#fff' }}>{nextTier.label}</strong> ({nextTier.price}/year) — {nextTier.reason}.
          </p>
          <Link
            href={`/pricing?tier=${nextTier.id}`}
            className="btn"
            style={{ background: '#FFB81C', color: '#041E42' }}
          >
            Upgrade to {nextTier.label} →
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
