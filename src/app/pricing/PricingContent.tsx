'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import AccountTypePicker from '@/components/AccountTypePicker';
import Link from 'next/link';
import { formatTierPrice, TIERS, TierName, TierGroup, PRICING_DISPLAY_ORDER, getTierLabel } from '@/lib/pricing';

type Tier = {
  id: TierName;
  label: string;
  group: TierGroup;
  price: string;
  period: string;
  tagline: string;
  color: string;
  bgColor: string;
  borderColor: string;
  popular: boolean;
  cta: string;
  ctaStyle: 'primary' | 'contact' | 'free';
  stripePriceEnv: string | null;
  features: string[];
  footnote?: string;
};

// Build display tiers in the canonical order from PRICING_DISPLAY_ORDER.
const TIERS_DISPLAY: Tier[] = PRICING_DISPLAY_ORDER.map((id) => {
  const t = TIERS[id];
  const price = formatTierPrice(id);
  const isCustom = price === 'Custom';
  const isFree = price === '$0';
  return {
    id,
    label: t.label,
    group: t.group,
    price,
    period: isCustom ? '' : isFree ? 'always free' : '/ year',
    tagline: t.tagline,
    color:
      t.group === 'organization'
        ? '#C8102E'
        : t.group === 'business'
        ? '#14B8A6'
        : '#FFB81C',
    bgColor:
      t.group === 'organization'
        ? 'rgba(200,16,46,0.06)'
        : t.group === 'business'
        ? 'rgba(20,184,166,0.06)'
        : 'rgba(255,184,28,0.06)',
    borderColor:
      t.group === 'organization'
        ? 'rgba(200,16,46,0.4)'
        : t.group === 'business'
        ? 'rgba(20,184,166,0.4)'
        : 'rgba(255,184,28,0.4)',
    popular: t.popular ?? false,
    cta: t.cta,
    ctaStyle: isFree ? 'free' : isCustom ? 'contact' : 'primary',
    stripePriceEnv: t.stripePriceEnv || null,
    features: t.features,
    footnote: t.footnote,
  };
});

const GROUP_ORDER: { id: TierGroup; title: string; subtitle: string }[] = [
  {
    id: 'identity',
    title: 'Individuals',
    subtitle: 'One Verified Hockey Identity per person — holds every role you accumulate.',
  },
  {
    id: 'organization',
    title: 'Organizations',
    subtitle: 'Clubs, leagues, federations, teams and associations. Subscribed by the organization.',
  },
  {
    id: 'business',
    title: 'Businesses',
    subtitle: 'Commercial businesses — shops, sharpeners, clinics, trainers, equipment rental, travel, photography.',
  },
];

const FAQ = [
  {
    q: 'What is a Verified Hockey Identity?',
    a: 'A Verified Hockey Identity is a single, verified account that holds every role you accumulate over your lifetime — Player, Parent, Coach, Referee, Volunteer, Team Manager, Club Administrator, League Administrator, Federation Administrator, Business Owner. One identity, unlimited roles, never a separate subscription per role.',
  },
  {
    q: 'Why are roles not separate subscriptions?',
    a: 'Roles are not products. A coach who is also a parent and a referee should not pay three times. Your Verified Hockey Identity grows with you — you claim additional eligible roles as your involvement grows, all under the same identity.',
  },
  {
    q: 'Can I keep my Free account and just browse?',
    a: 'Yes. Free is permanent and free. You can browse the full directory, read reviews, save unlimited favorites, and follow unlimited teams or players — no card required, no upsell.',
  },
  {
    q: 'What does Verified Identity cost?',
    a: '$24.99 per year. Required for active participation — claiming your profile, joining teams, registering, messaging, payments, and identity-verified badges.',
  },
  {
    q: 'What does Identity Plus add?',
    a: 'Identity Plus ($59.99/year) adds Family Hub, unlimited children, career timeline, advanced player analytics, unlimited photos and videos, achievement tracking, advanced messaging, premium insights, and priority support.',
  },
  {
    q: 'How do organizations subscribe differently from individuals?',
    a: 'Individual identity subscriptions never include organization management. Organizations (clubs, leagues, federations, teams, associations) subscribe on their own plan — Club Starter, Club Pro, Club Elite, League, or Federation.',
  },
  {
    q: 'How do businesses subscribe?',
    a: 'Business Listing ($99/year) for a single business claim. Business Plus ($299/year) for multiple listings, featured placement, promotions, messaging, enhanced analytics, and booking support. Business subscriptions are separate from organization subscriptions — businesses never see roster management, and organizations never see lead generation.',
  },
  {
    q: 'Can I upgrade mid-year?',
    a: 'Yes. Upgrades take effect immediately and the unused portion of your current plan is credited to the new one. You can move between tiers in the same group at any time from your dashboard.',
  },
  {
    q: 'What if I want to change or cancel my subscription?',
    a: 'Email support@rinkstop.com. We respond within 24 hours. Your benefits stay active through the end of your paid period.',
  },
];

export default function PricingContent({
  foundingClaimed = 0,
  foundingCap = 500,
  currentUserId = null,
  currentUserTier = null,
  cancelled = false,
}: {
  foundingClaimed?: number;
  foundingCap?: number;
  currentUserId?: string | null;
  currentUserTier?: string | null;
  cancelled?: boolean;
} = {}) {
  const { isSignedIn, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAccountType, setShowAccountType] = useState(false);
  const [highlightTier, setHighlightTier] = useState<string | null>(null);
  // WS9: when ?intent=claim is passed (from /claim-your-listing banner), show
  // a "Why upgrade?" prompt that explains the claim flow + which tiers are
  // claim-enabled. This is a soft conversion nudge; users on free tier can
  // still browse.
  const claimIntent = searchParams?.get('intent') === 'claim';
  const claimEntityType = searchParams?.get('type') ?? null;

  // Deep-link support: ?tier=club_starter scrolls to that card and highlights it.
  // Fires once on mount. Cleans up the highlight after 2.5s.
  useEffect(() => {
    const target = searchParams?.get('tier');
    if (!target) return;
    const validIds = TIERS_DISPLAY.map((t) => t.id);
    if (!validIds.includes(target as TierName)) return;

    // Wait one frame so the tier cards are rendered before scrolling.
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(`tier-card-${target}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightTier(target);
        window.setTimeout(() => setHighlightTier(null), 2500);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [searchParams]);

  // WS24 (2026-08-23) auto-trigger: when a guest returns from
  // /sign-up with ?tier=X&intent=upgrade, they're now signed-in.
  // Fire the checkout flow immediately so they don't have to click
  // the tier button a second time. One click to upgrade end-to-end.
  useEffect(() => {
    const intent = searchParams?.get('intent');
    const target = searchParams?.get('tier');
    if (intent !== 'upgrade' || !target || !isLoaded || !isSignedIn) return;
    const tier = TIERS_DISPLAY.find((t) => t.id === target);
    if (!tier || tier.ctaStyle === 'free' || tier.ctaStyle === 'contact') return;
    handleCheckout(tier);
    // Strip the intent param so a refresh doesn't re-fire.
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('intent');
    const next = `/pricing${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState(null, '', next);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, searchParams]);

  async function handleCheckout(tier: Tier) {
    if (!isLoaded) return;
    setError(null);

    if (tier.ctaStyle === 'free') {
      window.location.href = isSignedIn ? '/directory' : '/sign-up';
      return;
    }

    if (tier.ctaStyle === 'contact') {
      window.location.href = '/contact';
      return;
    }

    // WS24 (2026-08-23) conversion fix: route guest checkout through
    // sign-up FIRST, then back to /pricing?tier=X&intent=upgrade so the
    // post-sign-in redirect lands them on this same page and the
    // auto-trigger below fires the Stripe Checkout session with a real
    // Clerk user_id attached. This eliminates the previous flow's
    // post-payment magic-link email step (which 17 of 25 abandoned
    // checkout sessions of all-time hit and never completed).
    if (!isSignedIn) {
      const next = `/pricing?tier=${encodeURIComponent(tier.id)}&intent=upgrade`;
      window.location.href = `/sign-up?next=${encodeURIComponent(next)}`;
      return;
    }

    setBusy(tier.id);
    try {
      // Best-effort analytics beacon before checkout. Fire-and-forget so a
      // dropped network call can't block the checkout flow.
      try {
        navigator.sendBeacon?.(
          '/api/track',
          new Blob(
            [
              JSON.stringify({
                name: 'checkout_started',
                props: { tier: tier.id, group: tier.group, from: 'pricing_page' },
              }),
            ],
            { type: 'application/json' }
          )
        );
      } catch {
        // ignore
      }

      const res = await fetch('/api/tier/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tier.id,
          // Round-trip the user back to where they started after the magic-link
          // sign-in lands them in their dashboard (e.g. /dashboard/claims?entity=...).
          original_pathname: typeof window !== 'undefined' ? window.location.pathname + window.location.search : null,
          // Resume context: if the user came here from a "Claim this listing"
          // CTA, forward the entity so the success_url can drop them back on
          // /dashboard/claims with their draft and auto-submit.
          entity: searchParams?.get('entity') || null,
          entity_id: searchParams?.get('id') || null,
          entity_name: searchParams?.get('name') || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Checkout failed');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Checkout did not return a URL');
      }
    } catch {
      setError('Network error - please try again');
    } finally {
      setBusy(null);
    }
  }

  function renderTierCard(tier: Tier) {
    const isContact = tier.ctaStyle === 'contact';
    const isFree = tier.ctaStyle === 'free';
    const isCustom = tier.price === 'Custom';
    return (
      <div
        key={tier.id}
        id={`tier-card-${tier.id}`}
        data-testid={`tier-card-${tier.id}`}
        style={{
          position: 'relative',
          background: tier.bgColor,
          border: `2px solid ${tier.borderColor}`,
          borderRadius: 12,
          padding: '1.75rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          scrollMarginTop: '80px',
          transition: 'box-shadow 250ms ease, transform 250ms ease',
          boxShadow:
            highlightTier === tier.id
              ? `0 0 0 3px ${tier.color}, 0 8px 24px rgba(0,0,0,0.18)`
              : 'none',
          transform: highlightTier === tier.id ? 'translateY(-2px)' : 'none',
        }}
      >
        {tier.popular && (
          <div
            style={{
              position: 'absolute',
              top: -10,
              right: 16,
              background: tier.color,
              color: '#0a0a0a',
              fontSize: 11,
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: 999,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Most popular
          </div>
        )}

        <div style={{ marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: tier.color, fontWeight: 600 }}>{tier.label}</span>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff' }}>{tier.price}</span>
          {tier.period && (
            <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>{tier.period}</span>
          )}
          {isCustom && tier.id === 'league' && (
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              Starting at $1,999/year
            </div>
          )}
        </div>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', margin: '0 0 1.5rem', minHeight: 40 }}>{tier.tagline}</p>

        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', flex: 1 }}>
          {tier.features.map((f, i) => (
            <li
              key={i}
              style={{
                fontSize: '0.875rem',
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.5,
                marginBottom: '0.6rem',
                paddingLeft: '1.25rem',
                position: 'relative',
              }}
            >
              <span style={{ position: 'absolute', left: 0, color: tier.color }}>✓</span>
              {f}
            </li>
          ))}
        </ul>

        <button
          onClick={() => handleCheckout(tier)}
          disabled={busy === tier.id}
          data-testid={`tier-cta-${tier.id}`}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            background: isContact
              ? 'linear-gradient(135deg, #111827, #000)'
              : isFree
              ? 'transparent'
              : tier.color,
            color: isFree || isContact ? '#fff' : '#0a0a0a',
            border: isFree ? '1px solid rgba(255,255,255,0.2)' : 'none',
            borderRadius: 6,
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: busy === tier.id ? 'wait' : 'pointer',
            opacity: busy === tier.id ? 0.6 : 1,
            transition: 'transform 0.1s, opacity 0.15s',
          }}
        >
          {busy === tier.id ? 'Loading...' : tier.cta}
        </button>
        {tier.footnote && (
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0.75rem 0 0', lineHeight: 1.5 }}>
            {tier.footnote}
          </p>
        )}
      </div>
    );
  }

  // Group tiers by section
  const tiersByGroup: Record<TierGroup, Tier[]> = {
    identity: TIERS_DISPLAY.filter((t) => t.group === 'identity'),
    organization: TIERS_DISPLAY.filter((t) => t.group === 'organization'),
    business: TIERS_DISPLAY.filter((t) => t.group === 'business'),
  };

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      {cancelled && (
        <div
          data-testid="checkout-cancelled-banner"
          style={{
            background: 'rgba(255,184,28,0.08)',
            borderBottom: '1px solid rgba(255,184,28,0.3)',
            padding: '0.75rem 1.5rem',
            textAlign: 'center',
            color: '#FFB81C',
            fontSize: '0.875rem',
          }}
        >
          You bailed on checkout - no problem.{' '}
          <a href="#tiers" style={{ color: '#FFB81C', fontWeight: 700, textDecoration: 'underline', marginLeft: 4 }}>
            Jump back to plans
          </a>
        </div>
      )}

      <section style={{ padding: '5rem 1.5rem 2rem', textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            background: 'rgba(200,16,46,0.1)',
            border: '1px solid rgba(200,16,46,0.3)',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            color: '#C8102E',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '1.5rem',
          }}
        >
          RinkStop pricing
        </div>
        {foundingClaimed < foundingCap ? (
          <div
            data-testid="founding-urgency"
            style={{
              marginTop: 12,
              fontSize: 14,
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <span style={{ color: '#FFB81C', fontWeight: 700 }}>{foundingClaimed}</span> of {foundingCap} Founding Member badges already claimed
            {' · '}
            <span style={{ color: '#FFB81C', fontWeight: 700 }}>{Math.max(foundingCap - foundingClaimed, 0)}</span> remaining
          </div>
        ) : (
          <div style={{ marginTop: 12, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            All {foundingCap} Founding Member badges have been claimed.
          </div>
        )}
        {currentUserId && currentUserTier && currentUserTier !== 'free' ? (
          <div style={{ marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            You're on the <span style={{ color: '#FFB81C', fontWeight: 600 }}>{getTierLabel(currentUserTier)}</span> tier. Use the cards below to upgrade.
          </div>
        ) : null}
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, margin: '1.25rem 0' }}>
          One identity. <br />
          <span style={{ color: '#C8102E' }}>Unlimited roles.</span>
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>
          RinkStop is the global directory for hockey rinks, teams, players, and leagues. One Verified Hockey Identity per person — for life. Pick what fits below.
        </p>
        {claimIntent && (
          <div
            data-testid="claim-intent-banner"
            style={{
              marginTop: '1.5rem',
              background: 'rgba(20,184,166,0.08)',
              border: '1px solid rgba(20,184,166,0.4)',
              borderRadius: 10,
              padding: '1rem 1.25rem',
              textAlign: 'left',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '0.95rem',
              lineHeight: 1.5,
            }}
          >
            <div style={{ color: '#14B8A6', fontWeight: 700, marginBottom: 6 }}>
              Why do I need a paid plan to claim a listing?
            </div>
            <p style={{ margin: '0 0 0.5rem' }}>
              Claiming unlocks editable listings, lead capture, and a verified checkmark. To prevent
              squatting, RinkStop requires{' '}
              {claimEntityType === 'player'
                ? 'a Verified Hockey Identity (or higher) to claim a player page'
                : claimEntityType === 'team'
                  ? 'a Club Starter (or higher) to claim a team page'
                  : 'a RinkStop Pro business plan to claim a rink page'}
              . Operators claim once per listing, then own it for as long as the plan stays active.
            </p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
              Not ready yet?{' '}
              <a href="/claim-your-listing" style={{ color: '#14B8A6', textDecoration: 'underline' }}>
                Keep searching free
              </a>
              .
            </p>
          </div>
        )}
      </section>

      <section id="tiers" style={{ padding: '2rem 1.5rem 4rem', maxWidth: 1200, margin: '0 auto' }}>
        {GROUP_ORDER.map((group) => (
          <div key={group.id} data-testid={`tier-group-${group.id}`} style={{ marginBottom: '3rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{group.title}</h2>
              <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)', margin: 0, maxWidth: 720 }}>
                {group.subtitle}
              </p>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
              }}
            >
              {tiersByGroup[group.id].map(renderTierCard)}
            </div>
          </div>
        ))}

        {error && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1rem',
              background: 'rgba(200,16,46,0.1)',
              border: '1px solid rgba(200,16,46,0.3)',
              borderRadius: 6,
              color: '#C8102E',
              fontSize: '0.875rem',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}
      </section>

      <section style={{ padding: '2rem 1.5rem 4rem', maxWidth: 760, margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>No surprises</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {[
            { title: 'One price, all features', body: 'Your tier gets you every feature in that tier. No add-ons, no boost packs, no "verified on top of founding" upsells.' },
            { title: 'Your listing, your data', body: 'When you claim a listing, you can edit anything we show. When you leave, your edits stay unless you want them gone.' },
            { title: 'No daily upsell', body: "You won't get a 'save 20% if you upgrade today' banner on every page. One price, one ask." },
            { title: 'No ads dressed up as content', body: 'Sponsored rinks in search results are labeled "Sponsored". Always.' },
          ].map((b) => (
            <div key={b.title} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#fff' }}>{b.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '2rem 1.5rem 5rem', maxWidth: 760, margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>Questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {FAQ.map((f, i) => (
            <details
              key={i}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '0.875rem 1.25rem',
              }}
            >
              <summary
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer',
                  listStyle: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {f.q}
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.25rem', marginLeft: '1rem' }}>+</span>
              </summary>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', margin: '0.75rem 0 0', lineHeight: 1.6 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section style={{ padding: '2rem 1.5rem 4rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          Have a question we didn't answer? Email <a href="mailto:support@rinkstop.com" style={{ color: '#14B8A6', textDecoration: 'none' }}>support@rinkstop.com</a>.
        </p>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', margin: '0.5rem 0 0' }}>
          Already a member? <Link href="/dashboard/subscription" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline' }}>Manage your subscription</Link>.
        </p>
      </section>
    </main>
  );
}