'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import AccountTypePicker from '@/components/AccountTypePicker';
import Link from 'next/link';
import { formatTierPrice } from '@/lib/pricing';

type Tier = {
  id: 'free' | 'starter' | 'pro' | 'premium' | 'enterprise';
  label: string;
  price: string;
  period: string;
  tagline: string;
  color: string;
  bgColor: string;
  borderColor: string;
  popular: boolean;
  cta: string;
  stripePriceEnv: string | null;
  features: string[];
  footnote?: string;
};

const TIERS: Tier[] = [
  {
    id: 'free',
    label: 'Free',
    price: '$0',
    period: 'always',
    tagline: 'I want to browse',
    color: 'rgba(255,255,255,0.85)',
    bgColor: '#0f0f0f',
    borderColor: 'rgba(255,255,255,0.1)',
    popular: false,
    cta: 'Get started',
    stripePriceEnv: null,
    features: [
      'Browse the full directory (every rink, team, player, league)',
      'Save up to 3 listings',
      'Follow up to 3 teams or players',
      'Read all reviews',
      'Basic profile',
    ],
    footnote: 'For people just checking the site out. No card, no upsell. Browse and leave.',
  },
  {
    id: 'starter',
    label: 'Starter',
    price: formatTierPrice('starter'),
    period: '/ year',
    tagline: 'I want a verified profile and 1 claim',
    color: '#FFB81C',
    bgColor: 'rgba(255,184,28,0.06)',
    borderColor: 'rgba(255,184,28,0.3)',
    popular: false,
    cta: 'Become a Member',
    stripePriceEnv: 'STRIPE_PRICE_TIER_STARTER',
    features: [
      'Unlimited follows and saves',
      'Founding Member badge on your profile',
      'Weekly digest — your favorite teams’ games, scores, and new signings',
      'Claim a single listing (rink, team, or league) for free — update hours, contacts, socials, and unlock the lead-capture form',
      'Priority email support',
    ],
    footnote:
      'Founding Member badge is exclusive to the first 500 paid members. After that, the tier stays, the badge doesn’t.',
  },
  {
    id: 'pro',
    label: 'Pro',
    price: formatTierPrice('pro'),
    period: '/ year',
    tagline: 'I run a rink, team, or league and want to be verified',
    color: '#14B8A6',
    bgColor: 'rgba(20,184,166,0.06)',
    borderColor: 'rgba(20,184,166,0.4)',
    popular: true,
    cta: 'Go Pro',
    stripePriceEnv: 'STRIPE_PRICE_TIER_PRO',
    features: [
      'Everything in Starter',
      'Verified checkmark on your profile and every listing you claim',
      'Up to 5 claimed listings (perfect for a personal scope: your home rink, your kid’s team, your beer-league squad)',
      'Lead capture form on every claimed listing — visitors can contact you without signing up',
      'Public profile page you can share (rinkstop.com/profile/you)',
      'Send and receive DMs with other Pro+ users',
      'Above search results in directory listings',
    ],
    footnote:
      `Pro is the identity play for orgs. It tells the people you DM that you are who you say you are — and gives you up to 5 claims, business profile, and DMs. If you need more than 5 claims (you run a rink chain, league, or multi-team org), upgrade to Premium.`,
  },
  {
    id: 'premium',
    label: 'Premium',
    price: formatTierPrice('premium'),
    period: '/ year',
    tagline: 'I run a regional chain or multi-team org and want featured placement',
    color: '#C8102E',
    bgColor: 'rgba(200,16,46,0.06)',
    borderColor: 'rgba(200,16,46,0.4)',
    popular: false,
    cta: 'Go Premium',
    stripePriceEnv: 'STRIPE_PRICE_TIER_PREMIUM',
    features: [
      'Everything in Pro',
      'Up to 25 claimed listings (org scope: rinks, teams, leagues — whatever you run)',
      'Featured Listing rotation in your city (top of directory, every page load)',
      'Bulk claim — claim every team, rink, or league in your organization at once',
      'Analytics dashboard — who’s viewing your profile, your listings, your team',
      'Custom branding on your public profile',
    ],
    footnote:
      `At ${formatTierPrice('premium')}/year, Premium pays for itself with a single signup. Featured Listing rotation, 25 claims, and analytics give you the lead pipeline that smaller plans can’t. Built for rinks, rink chains, leagues, and multi-team orgs up to 25 claims. Lead capture is included on every claimed listing regardless of tier.`,
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: 'Custom',
    period: '',
    tagline: 'For leagues, brands, federations, and organizations with more than 25 claims',
    color: '#111827',
    bgColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.22)',
    popular: false,
    cta: 'Contact Enterprise',
    stripePriceEnv: null,
    features: [
      'Everything in Premium',
      'More than 25 claimed listings',
      'Bulk claim and data onboarding support',
      'Priority support for leagues, brands, federations, and multi-team orgs',
      'Custom reporting, API access, or partnership packaging when needed',
    ],
    footnote:
      'Need more than 25 claims? Contact us and we’ll scope it with you before you pay.',
  },
];

type Role = 'player' | 'coach' | 'org';

/**
 * Role-based value props shown above the tier grid. Per SPEC 2026-06-17,
 * different users have different needs: a player cares about following
 * teams, a coach cares about messaging rinks, an org cares about being
 * found. Tabs let each user see the value prop that fits, without
 * changing the underlying tiers.
 */
const ROLES: { id: Role; label: string; icon: string; color: string }[] = [
  { id: 'player', label: 'Player / Parent', icon: '🏒', color: '#FFB81C' },
  { id: 'coach', label: 'Coach / Manager', icon: '🎯', color: '#14B8A6' },
  { id: 'org', label: 'Rink / League / Org', icon: '🏟️', color: '#C8102E' },
];

const ROLE_VALUE_PROPS: Record<Role, string> = {
  player: "Find rinks near you, follow your kid's team, claim your player profile. $19.99 covers most personal use.",
  coach: 'Manage your team, message rinks for ice time, claim multiple teams. $59.99 covers most coaches.',
  org: 'Get found by every team searching for ice in your city. Lead capture, featured placement, and analytics. $299 covers most rinks.',
};

const FAQ = [
  {
    q: 'Is this a subscription?',
    a: 'Yes. Starter, Pro, and Premium are annual subscriptions that renew automatically each year. Free is always free. Your benefits stay active for the full year you paid for, regardless of any future changes.',
  },
  {
    q: 'What’s a Founding Member badge?',
    a: 'The first 500 paying members (any paid tier) get a Founding Member badge on their profile. It’s a one-time, no-replacement scarcity lever — once they’re gone, the tier stays but the badge doesn’t come back.',
  },
  {
    q: 'Can I claim a listing without paying?',
    a: 'Starter includes 1 claim. Pro includes up to 5 claims — enough for a personal scope (your home rink, your kid’s team, your beer-league squad). Premium includes up to 25 claims and bulk claim for orgs that run multiple rinks, teams, or leagues. Enterprise is custom for organizations that need more than 25. Free accounts can browse but not claim.',
  },
  {
    q: 'I manage a rink, team, league, or organization. Which tier is for me?',
    a: 'Lead capture is included on every claimed listing regardless of tier, so a single-rink Starter ($19.99) gets the same lead pipeline as a 25-listing Premium ($299). The difference is scale: Starter covers 1 claim, Pro covers up to 5, Premium covers up to 25 with featured placement and analytics. Enterprise is for organizations that need more than 25.',
  },
  {
    q: 'I’m a parent of a youth player. Can I claim my kid?',
    a: 'Yes. The parent signs up (Pro+ to DM) and uses “I’m this player’s parent” on the kid’s profile to claim it. The kid’s profile shows “Managed by [Your Name]”. All DMs go through your account — one Clerk account, kid as a managed sub-profile.',
  },
  {
    q: 'Can I send DMs as my kid’s parent?',
    a: 'Yes. The parent’s account sends the DM, the kid’s profile is the context. Coaches and scouts see the kid’s name and stats in the thread, and the parent’s name in the from-line.',
  },
  {
    q: 'What if I want to change or cancel my membership?',
    a: 'Email support@rinkstop.com. We respond within 24 hours and can walk you through your options. Your benefits stay active through the end of your paid period. We don’t bury a cancel button in your account — we just ask you to talk to us first so we can understand what we could have done better.',
  },
  {
    q: 'Can I upgrade mid-year?',
    a: 'Yes. Upgrades take effect immediately and the unused portion of your current plan is credited to the new one. You can move from Starter to Pro, or Pro to Premium, at any time from your dashboard. Enterprise is scoped with us first so large organizations get the right claim volume.',
  },
  {
    q: 'Why no ad-free tier?',
    a: 'Ads fund the free tier and the low prices on the paid tiers. We don’t pretend otherwise.',
  },
];

export default function FoundingMemberContent({
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
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAccountType, setShowAccountType] = useState(false);
  const [role, setRole] = useState<Role>('player');

  async function handleCheckout(tier: Tier) {
    if (!isLoaded) return;
    setError(null);

    if (tier.id === 'free') {
      window.location.href = isSignedIn ? '/directory' : '/sign-up';
      return;
    }

    if (tier.id === 'enterprise') {
      window.location.href = '/partner?source=enterprise-pricing';
      return;
    }

    if (!isSignedIn) {
      window.location.href = `/sign-up?redirect_url=${encodeURIComponent('/pricing')}`;
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
                props: { tier: tier.id, from: 'pricing_page' },
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
        body: JSON.stringify({ tier: tier.id }),
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
    } catch (e) {
      setError('Network error — please try again');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      {/* Cancelled-checkout recovery banner — only renders if the user came
          back from a Stripe Checkout "back" click. Doesn't penalize them,
          doesn't nag. Just acknowledges and offers to make it easy. */}
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
          You bailed on checkout — no problem. Founding-member pricing is still live.{' '}
          <a href="#tiers" style={{ color: '#FFB81C', fontWeight: 700, textDecoration: 'underline', marginLeft: 4 }}>
            Jump back to plans
          </a>
        </div>
      )}
      <section style={{ padding: '5rem 1.5rem 3rem', textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
        <div style={{
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
        }}>
          RinkStop pricing · Founding Member badge for the first {foundingCap}
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
            All {foundingCap} Founding Member badges have been claimed. The paid tiers stay — only the badge is gone.
          </div>
        )}
        {currentUserId && currentUserTier && currentUserTier !== 'free' ? (
          <div style={{ marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            You’re on the <span style={{ color: '#FFB81C', fontWeight: 600 }}>{currentUserTier}</span> tier. Use the cards below to upgrade.
          </div>
        ) : null}
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 1.25rem' }}>
          Hockey’s directory. <br />
          <span style={{ color: '#C8102E' }}>Actually useful</span> for everyone in it.
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>
          RinkStop is the global directory for hockey rinks, teams, players, and leagues. Free to browse. Pick what fits below.
        </p>
      </section>

      {/* Role-based value prop tabs. Default to 'player' — the broadest
          audience. Switching roles changes the value-prop paragraph above the
          tier grid without changing the tiers themselves. Per SPEC 2026-06-17,
          tiers stay the same; the framing is what adapts. */}
      <section style={{ padding: '0 1.5rem 1rem', maxWidth: 760, margin: '0 auto' }}>
        <div
          role="tablist"
          aria-label="Choose what you're here for"
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
            marginBottom: '1.25rem',
          }}
        >
          {ROLES.map((r) => {
            const selected = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={selected}
                data-testid={`role-tab-${r.id}`}
                onClick={() => setRole(r.id)}
                style={{
                  padding: '0.55rem 1.1rem',
                  background: selected ? r.color : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selected ? r.color : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: 999,
                  color: selected ? '#0a0a0a' : 'rgba(255,255,255,0.85)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                }}
              >
                <span style={{ marginRight: 6 }}>{r.icon}</span>
                {r.label}
              </button>
            );
          })}
        </div>
        <p
          key={role}
          data-testid={`role-value-prop-${role}`}
          style={{
            fontSize: '1.05rem',
            color: 'rgba(255,255,255,0.78)',
            lineHeight: 1.55,
            margin: 0,
            textAlign: 'center',
            maxWidth: 620,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {ROLE_VALUE_PROPS[role]}
        </p>
      </section>

      <section style={{ padding: '2rem 1.5rem 4rem', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}>
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              style={{
                position: 'relative',
                background: tier.bgColor,
                border: `2px solid ${tier.borderColor}`,
                borderRadius: 12,
                padding: '1.75rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {tier.popular && (
                <div style={{
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
                }}>
                  Most popular
                </div>
              )}

              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: tier.color, fontWeight: 600 }}>{tier.label}</span>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff' }}>{tier.price}</span>
                <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>{tier.period}</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', margin: '0 0 1.5rem', minHeight: 40 }}>{tier.tagline}</p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', flex: 1 }}>
                {tier.features.map((f, i) => (
                  <li key={i} style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.5,
                    marginBottom: '0.6rem',
                    paddingLeft: '1.25rem',
                    position: 'relative',
                  }}>
                    <span style={{ position: 'absolute', left: 0, color: tier.color }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(tier)}
                disabled={busy === tier.id}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: tier.id === 'enterprise' ? 'linear-gradient(135deg, #111827, #000)' : tier.id === 'free' ? 'transparent' : tier.color,
                  color: tier.id === 'free' || tier.id === 'enterprise' ? '#fff' : '#0a0a0a',
                  border: tier.id === 'free' ? '1px solid rgba(255,255,255,0.2)' : 'none',
                  borderRadius: 6,
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: busy === tier.id ? 'wait' : 'pointer',
                  opacity: busy === tier.id ? 0.6 : 1,
                  transition: 'transform 0.1s, opacity 0.15s',
                }}
              >
                {busy === tier.id ? 'Loading…' : tier.cta}
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1rem',
            background: 'rgba(200,16,46,0.1)',
            border: '1px solid rgba(200,16,46,0.3)',
            borderRadius: 6,
            color: '#C8102E',
            fontSize: '0.875rem',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}
      </section>

      <section style={{ padding: '2rem 1.5rem 4rem', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>Compare tiers</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.1)' }}></th>
                {TIERS.map((t) => (
                  <th key={t.id} style={{ padding: '0.75rem', textAlign: 'center', color: t.color, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{t.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Browse directory</td>
                {TIERS.map((t) => <td key={t.id} style={{ textAlign: 'center', color: '#fff' }}>✓</td>)}
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Read reviews</td>
                {TIERS.map((t) => <td key={t.id} style={{ textAlign: 'center', color: '#fff' }}>✓</td>)}
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Saves</td>
                {TIERS.map((t) => (
                  <td key={t.id} style={{ textAlign: 'center', color: '#fff' }}>
                    {t.id === 'free' ? '3' : 'Unlimited'}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Founding Member badge</td>
                {TIERS.map((t) => (
                  <td key={t.id} style={{ textAlign: 'center', color: t.id === 'free' ? 'rgba(255,255,255,0.3)' : '#FFB81C' }}>
                    {t.id === 'free' ? '—' : '✓'}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Claim listings</td>
                {TIERS.map((t) => (
                  <td key={t.id} style={{ textAlign: 'center', color: '#fff' }}>
                    {t.id === 'free' ? '—' : t.id === 'starter' ? '1' : t.id === 'pro' ? 'Up to 5' : t.id === 'premium' ? 'Up to 25' : 'Custom'}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Verified checkmark</td>
                {TIERS.map((t) => (
                  <td key={t.id} style={{ textAlign: 'center', color: t.id === 'pro' || t.id === 'premium' || t.id === 'enterprise' ? '#14B8A6' : 'rgba(255,255,255,0.3)' }}>
                    {t.id === 'pro' || t.id === 'premium' || t.id === 'enterprise' ? '✓' : '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Send and receive DMs</td>
                {TIERS.map((t) => (
                  <td key={t.id} style={{ textAlign: 'center', color: t.id === 'pro' || t.id === 'premium' || t.id === 'enterprise' ? '#14B8A6' : 'rgba(255,255,255,0.3)' }}>
                    {t.id === 'pro' || t.id === 'premium' || t.id === 'enterprise' ? '✓' : '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Featured Listing rotation</td>
                {TIERS.map((t) => (
                  <td key={t.id} style={{ textAlign: 'center', color: t.id === 'pro' || t.id === 'enterprise' ? '#C8102E' : 'rgba(255,255,255,0.3)' }}>
                    {t.id === 'pro' || t.id === 'enterprise' ? '✓' : '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Lead capture form on each claim</td>
                {TIERS.map((t) => (
                  <td key={t.id} style={{ textAlign: 'center', color: t.id === 'free' ? 'rgba(255,255,255,0.3)' : '#FFB81C' }}>
                    {t.id === 'free' ? '—' : '✓'}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Analytics dashboard</td>
                {TIERS.map((t) => (
                  <td key={t.id} style={{ textAlign: 'center', color: t.id === 'pro' || t.id === 'enterprise' ? '#C8102E' : 'rgba(255,255,255,0.3)' }}>
                    {t.id === 'pro' || t.id === 'enterprise' ? '✓' : '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ padding: '2rem 1.5rem 4rem', maxWidth: 760, margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>No surprises</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {[
            { title: 'One price, all features', body: 'Your tier gets you every feature in that tier. No add-ons, no boost packs, no "verified on top of founding" upsells.' },
            { title: 'Your listing, your data', body: 'When you claim a listing, you can edit anything we show. When you leave, your edits stay unless you want them gone.' },
            { title: 'No daily upsell', body: 'You won’t get a "save 20% if you upgrade today" banner on every page. One price, one ask.' },
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
            <details key={i} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '0.875rem 1.25rem',
            }}>
              <summary style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          Have a question we didn’t answer? Email <a href="mailto:support@rinkstop.com" style={{ color: '#14B8A6', textDecoration: 'none' }}>support@rinkstop.com</a>.
        </p>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', margin: '0.5rem 0 0' }}>
          Already a member? <Link href="/dashboard/subscription" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline' }}>Manage your subscription</Link>.
        </p>
      </section>
    </main>
  );
}
