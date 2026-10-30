import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { TierBadge, FoundingMemberBadge } from '@/components/TierBadge';
import { formatTierPricePerYear, canonicalTier } from '@/lib/pricing';
import { tierRank } from '@/lib/tier';

export const dynamic = 'force-dynamic';

// Canonical tier ids (2026-10-22). Legacy names are canonicalized on read
// via canonicalTier() and resolved through tierRank(), so old links and
// in-flight webhook payloads still work.
type TierId =
  | 'free'
  | 'verified_identity'
  | 'identity_plus'
  | 'org_free'
  | 'org_plus'
  | 'org_pro'
  | 'org_elite'
  | 'org_enterprise';

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
    'Hockey Passport Plus is live - Family Hub, photos, videos, advanced analytics.',
    'Verify your identity (60 seconds) to earn the check on RinkStop. Visit /dashboard/identity.',
    'Set up your Family Hub to track unlimited children.',
  ],
  // Organization
  org_free: [
    'Organization Free is live - your team is listed on the RinkStop directory.',
    'Claim your team listing and update the details, photos, and session times.',
    'Upgrade to Organization Plus for roster, schedule, events, and attendance management.',
  ],
  org_plus: [
    'Organization Plus is live - up to 3 teams, registrations, payments, and practice plans.',
    'Set up your registration programs and dues collection.',
    'Your Founding Member badge is now live on your profile.',
  ],
  org_pro: [
    'Organization Pro is live - up to 10 teams, up to 150 players, financial reporting and API access.',
    'Open the Financial Reporting tab.',
    'Configure promotions and featured placement for your listings.',
  ],
  org_elite: [
    'Organization Elite is live - unlimited teams, advanced analytics, custom branding.',
    'Open the Analytics dashboard to see your reach.',
    'API access and bulk imports are available - see /dashboard/team.',
  ],
  org_enterprise: [
    'Welcome to Organization Enterprise. Your account has been configured for governance and compliance.',
    'Your dedicated success team has been notified - they will reach out within 24 hours.',
  ],
  free: [],
};

// What to upsell to (or "you've got everything" for the top of each group)
const NEXT_TIER: Record<TierId, { id: TierId | null; label: string; price: string; reason: string }> = {
  free: { id: 'verified_identity', label: 'Hockey Passport', price: formatTierPricePerYear('verified_identity'), reason: 'Verification is free; this unlocks the Hockey Passport, payments eligibility, and message-coaches. Claim is free on Free too.' },
  verified_identity: { id: 'identity_plus', label: 'Hockey Passport Plus', price: formatTierPricePerYear('identity_plus'), reason: 'Family Hub, photos, videos, advanced analytics, achievement tracking' },
  identity_plus: { id: null, label: '—', price: '—', reason: 'You have the top individual plan. Switch to an Organization plan to manage a club, league, or federation.' },
  // Organization progression
  org_free: { id: 'org_plus', label: 'Organization Plus', price: formatTierPricePerYear('org_plus'), reason: 'Up to 3 teams, registrations, payments, up to 30 players' },
  org_plus: { id: 'org_pro', label: 'Organization Pro', price: formatTierPricePerYear('org_pro'), reason: 'Up to 10 teams, up to 150 players, financial reporting, API access' },
  org_pro: { id: 'org_elite', label: 'Organization Elite', price: formatTierPricePerYear('org_elite'), reason: 'Unlimited teams, advanced analytics, custom branding' },
  org_elite: { id: 'org_enterprise', label: 'Organization Enterprise', price: 'Custom', reason: 'Organization Elite is the top self-serve plan. Enterprise is for federation governance and compliance.' },
  org_enterprise: { id: null, label: '—', price: '—', reason: 'You have the top organization plan. Reach out to your success team for anything else.' },
};

// Tier color (matches TierBadge)
const TIER_COLOR: Record<TierId, string> = {
  free: '#9CA3AF',
  verified_identity: '#FFB81C',
  identity_plus: '#FFB81C',
  org_free: '#C8102E',
  org_plus: '#C8102E',
  org_pro: '#C8102E',
  org_elite: '#C8102E',
  org_enterprise: '#818CF8',
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; session_id?: string; next?: string }>;
}) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = session.userId
    ? await resolveCanonicalUserId(session.userId, userEmail)
    : null;
  const params = await searchParams;
  const urlTier = (params.tier || 'verified_identity') as TierId;
  const sessionId = params.session_id || null;
  const nextPath = params.next || null;

  // ── Guest checkout path ──────────────────────────────────────────────────
  // Reached when: the user completed Stripe Checkout as a guest (no Clerk
  // session). They land here with tier + session_id in the URL.
  // Their payment email is stored in the profile keyed by stripe_session_id.
  // We prompt them to sign up with that exact email so the Clerk webhook
  // can link their new account to the existing paid profile.
  if (!userId && sessionId) {
    const { data: guestProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, tier, org_tier')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    if (guestProfile?.email) {
      // A guest org purchase lands in org_tier; a guest personal purchase
      // lands in tier. Resolve whichever is actually set.
      const guestTier = (
        canonicalTier((guestProfile.org_tier as string) || '') !== 'org_free'
          ? canonicalTier(guestProfile.org_tier as string)
          : canonicalTier(guestProfile.tier as string)
      ) || urlTier;
      const signUpUrl = `/sign-up?email=${encodeURIComponent(guestProfile.email)}&redirect_url=${encodeURIComponent(`/dashboard/welcome?tier=${guestTier}${nextPath ? `&next=${encodeURIComponent(nextPath)}` : ''}`)}`;

      return (
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: 'clamp(2rem, 6vw, 4rem) 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', color: '#fff', marginBottom: '0.75rem' }}>
            Payment received
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.0625rem', marginBottom: '0.5rem' }}>
            You purchased <strong style={{ color: '#fff' }}>{guestTier.replace(/_/g, ' ')}</strong>.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', marginBottom: '2rem' }}>
            Check your inbox at <strong style={{ color: '#FFB81C' }}>{guestProfile.email}</strong> — we sent a magic link to activate your account.
          </p>

          <a
            href={signUpUrl}
            style={{
              display: 'inline-block',
              padding: '0.875rem 2rem',
              background: '#FFB81C',
              color: '#041E42',
              fontWeight: 700,
              fontSize: '1rem',
              borderRadius: 8,
              textDecoration: 'none',
              marginBottom: '1rem',
            }}
          >
            Sign up with {guestProfile.email}
          </a>

          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8125rem' }}>
            Use the same email you entered at checkout.{' '}
            <Link href="/pricing" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline' }}>
              Change email
            </Link>
          </p>
        </div>
      );
    }
  }

  // ── Signed-in path ────────────────────────────────────────────────────────
  // Normal authenticated welcome page.
  if (!userId) redirect('/login');

  // Default to 'verified_identity' if no tier in URL (post-checkout redirect).
  // sessionId is already extracted in the shared params block above.

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier, is_founding_member, display_name, email')
    .eq('user_id', userId)
    .maybeSingle();

  // If the user hasn't actually been upgraded yet (webhook race), still show
  // the page but flag it. The webhook will catch up within a second or two.
  const actualTier = canonicalTier((profile?.tier as string | undefined) || 'free');
  const upgraded = actualTier !== 'free' && tierRank(actualTier) >= tierRank(urlTier);
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
          {upgraded ? '✓ Payment received' : 'Welcome'}
        </div>
        <h1
          className="font-sport"
          style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', color: '#fff', lineHeight: 0.95, margin: '0 0 0.625rem' }}
        >
          {upgraded ? 'THANKS FOR SUBSCRIBING' : 'WELCOME'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <TierBadge tier={tier} size="md" />
          {isFounding && <FoundingMemberBadge />}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.9375rem, 2vw, 1rem)', maxWidth: 480, margin: '0 auto' }}>
          {tier === 'verified_identity' && 'You\'re on Hockey Passport. Your profile claim and unlimited roles under one identity are ready.'}
          {tier === 'identity_plus' && 'You\'re on Hockey Passport Plus. Family Hub, photos, videos, and advanced analytics are now available.'}
          {tier === 'org_free' && 'You\'re on Organization Free. Your team is listed on the RinkStop directory — claim it and update the details.'}
          {tier === 'org_plus' && 'You\'re on Organization Plus. Up to 3 teams, registrations, payments, and up to 30 players are live.'}
          {tier === 'org_pro' && 'You\'re on Organization Pro. Up to 10 teams, up to 150 players, financial reporting, and API access are live.'}
          {tier === 'org_elite' && 'You\'re on Organization Elite. Unlimited teams, advanced analytics, and custom branding are unlocked.'}
          {tier === 'org_enterprise' && 'You\'re on Organization Enterprise. Your success team will reach out within 24 hours to scope governance and compliance.'}
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
            {nextTier.id === 'org_enterprise' ? `Contact Sales →` : `Upgrade to ${nextTier.label} →`}
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
