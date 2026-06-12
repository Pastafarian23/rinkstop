'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

type Tier = {
  id: 'free' | 'supporter' | 'verified' | 'pro';
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
    id: 'supporter',
    label: 'Supporter',
    price: '$9.99',
    period: '/ year',
    tagline: 'I support the site and want the good stuff',
    color: '#FFB81C',
    bgColor: 'rgba(255,184,28,0.06)',
    borderColor: 'rgba(255,184,28,0.3)',
    popular: false,
    cta: 'Become a Supporter',
    stripePriceEnv: 'STRIPE_PRICE_TIER_SUPPORTER',
    features: [
      'Unlimited follows and saves',
      'Founding Member badge on your profile',
      'Weekly digest — your favorite teams\u2019 games, scores, and new signings',
      'Claim a single listing (rink, team, or league) for free \u2014 update hours, contacts, socials',
      'Priority email support',
    ],
    footnote:
      'Founding Member badge is exclusive to the first 500 supporters. After that, the tier stays, the badge doesn\u2019t.',
  },
  {
    id: 'verified',
    label: 'Verified',
    price: '$19.99',
    period: '/ year',
    tagline: 'I want to be taken seriously',
    color: '#14B8A6',
    bgColor: 'rgba(20,184,166,0.06)',
    borderColor: 'rgba(20,184,166,0.4)',
    popular: true,
    cta: 'Get Verified',
    stripePriceEnv: 'STRIPE_PRICE_TIER_VERIFIED',
    features: [
      'Everything in Supporter',
      'Verified checkmark on your profile and every listing you claim',
      'Unlimited claimed listings',
      'Public profile page you can share (\u200Brinkstop.com/u/you)',
      'Send and receive DMs with other Verified+ users',
      'Above search results in directory listings',
    ],
    footnote:
      'Verified is the identity play. It tells the people you DM that you are who you say you are.',
  },
  {
    id: 'pro',
    label: 'Pro',
    price: '$99.99',
    period: '/ year',
    tagline: 'I run a rink, team, or league and want to be found',
    color: '#C8102E',
    bgColor: 'rgba(200,16,46,0.06)',
    borderColor: 'rgba(200,16,46,0.4)',
    popular: false,
    cta: 'Go Pro',
    stripePriceEnv: 'STRIPE_PRICE_TIER_PRO',
    features: [
      'Everything in Verified',
      'Featured Listing rotation in your city (top of directory, every page load)',
      'Lead capture form on your profile \u2014 visitors can contact you without signing up',
      'Bulk claim \u2014 claim every team, rink, or league in your organization at once',
      'Analytics dashboard \u2014 who\u2019s viewing your profile, your listings, your team',
      'Custom branding on your public profile',
    ],
    footnote:
      'Pro pays for itself when one parent finds your league through Featured Listing and signs up their kid.',
  },
];

const FAQ = [
  {
    q: 'Is this a subscription?',
    a: 'Yes. Supporter, Verified, and Pro are annual subscriptions that renew automatically each year. Free is always free. Your benefits stay active for the full year you paid for, regardless of any future changes.',
  },
  {
    q: 'What\u2019s a Founding Member badge?',
    a: 'The first 500 paying members (Supporter or higher) get a Founding Member badge on their profile. It\u2019s a one-time, no-replacement scarcity lever \u2014 once they\u2019re gone, the tier stays but the badge doesn\u2019t come back.',
  },
  {
    q: 'Can I claim a listing without paying?',
    a: 'Supporter, Verified, and Pro all include claims as part of the membership. One claim on Supporter, unlimited on Verified and Pro. Free accounts can browse but not claim.',
  },
  {
    q: 'I manage a rink. Which tier is for me?',
    a: 'Pro, if you want leads. Verified, if you just want to be the verified owner of your rink. Pro pays for itself in one signup.',
  },
  {
    q: 'I\u2019m a parent of a youth player. Can I claim my kid?',
    a: 'Yes. The parent signs up (Verified+ to DM) and uses \u201cI\u2019m this player\u2019s parent\u201d on the kid\u2019s profile to claim it. The kid\u2019s profile shows \u201cManaged by [Your Name]\u201d. All DMs go through your account \u2014 one Clerk account, kid as a managed sub-profile.',
  },
  {
    q: 'Can I send DMs as my kid\u2019s parent?',
    a: 'Yes. The parent\u2019s account sends the DM, the kid\u2019s profile is the context. Coaches and scouts see the kid\u2019s name and stats in the thread, and the parent\u2019s name in the from-line.',
  },
  {
    q: 'What if I want to change or cancel my membership?',
    a: 'Email support@rinkstop.com. We respond within 24 hours and can walk you through your options. Your benefits stay active through the end of your paid period. We don\u2019t bury a cancel button in your account \u2014 we just ask you to talk to us first so we can understand what we could have done better.',
  },
  {
    q: 'Can I upgrade mid-year?',
    a: 'Yes. Upgrades take effect immediately and the unused portion of your current plan is credited to the new one. You can move from Supporter to Verified, or Verified to Pro, at any time from your dashboard.',
  },
  {
    q: 'Why no ad-free tier?',
    a: 'Ads fund the free tier and the low prices on the paid tiers. We don\u2019t pretend otherwise.',
  },
];

export default function FoundingMemberContent() {
  const { isSignedIn, isLoaded } = useUser();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(tier: Tier) {
    if (!isLoaded) return;
    setError(null);

    if (tier.id === 'free') {
      window.location.href = isSignedIn ? '/directory' : '/sign-up';
      return;
    }

    if (!isSignedIn) {
      window.location.href = `/sign-up?redirect_url=${encodeURIComponent('/founding-member')}`;
      return;
    }

    setBusy(tier.id);
    try {
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
      setError('Network error \u2014 please try again');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
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
          Founding Member pricing \u00b7 limited to 500
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 1.25rem' }}>
          Hockey\u2019s directory. <br />
          <span style={{ color: '#C8102E' }}>Actually useful</span> for everyone in it.
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>
          RinkStop is the global directory for hockey rinks, teams, players, and leagues.
          Free to browse. Built to be claimed, joined, and messaged.
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
                    <span style={{ position: 'absolute', left: 0, color: tier.color }}>\u2713</span>
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
                  background: tier.id === 'free' ? 'transparent' : tier.color,
                  color: tier.id === 'free' ? '#fff' : '#0a0a0a',
                  border: tier.id === 'free' ? '1px solid rgba(255,255,255,0.2)' : 'none',
                  borderRadius: 6,
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: busy === tier.id ? 'wait' : 'pointer',
                  opacity: busy === tier.id ? 0.6 : 1,
                  transition: 'transform 0.1s, opacity 0.15s',
                }}
              >
                {busy === tier.id ? 'Loading\u2026' : tier.cta}
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
                {TIERS.map((t) => <td key={t.id} style={{ textAlign: 'center', color: '#fff' }}>\u2713</td>)}
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Read reviews</td>
                {TIERS.map((t) => <td key={t.id} style={{ textAlign: 'center', color: '#fff' }}>\u2713</td>)}
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
                    {t.id === 'free' ? '\u2014' : '\u2713'}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Claim listings</td>
                {TIERS.map((t) => (
                  <td key={t.id} style={{ textAlign: 'center', color: '#fff' }}>
                    {t.id === 'free' ? '\u2014' : t.id === 'supporter' ? '1' : 'Unlimited'}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Verified checkmark</td>
                {TIERS.map((t) => (
                  <td key={t.id} style={{ textAlign: 'center', color: t.id === 'verified' || t.id === 'pro' ? '#14B8A6' : 'rgba(255,255,255,0.3)' }}>
                    {t.id === 'verified' || t.id === 'pro' ? '\u2713' : '\u2014'}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Send and receive DMs</td>
                {TIERS.map((t) => (
                  <td key={t.id} style={{ textAlign: 'center', color: t.id === 'verified' || t.id === 'pro' ? '#14B8A6' : 'rgba(255,255,255,0.3)' }}>
                    {t.id === 'verified' || t.id === 'pro' ? '\u2713' : '\u2014'}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Featured Listing rotation</td>
                {TIERS.map((t) => (
                  <td key={t.id} style={{ textAlign: 'center', color: t.id === 'pro' ? '#C8102E' : 'rgba(255,255,255,0.3)' }}>
                    {t.id === 'pro' ? '\u2713' : '\u2014'}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Lead capture form</td>
                {TIERS.map((t) => (
                  <td key={t.id} style={{ textAlign: 'center', color: t.id === 'pro' ? '#C8102E' : 'rgba(255,255,255,0.3)' }}>
                    {t.id === 'pro' ? '\u2713' : '\u2014'}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Analytics dashboard</td>
                {TIERS.map((t) => (
                  <td key={t.id} style={{ textAlign: 'center', color: t.id === 'pro' ? '#C8102E' : 'rgba(255,255,255,0.3)' }}>
                    {t.id === 'pro' ? '\u2713' : '\u2014'}
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
            { title: 'No daily upsell', body: 'You won\u2019t get a "save 20% if you upgrade today" banner on every page. One price, one ask.' },
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
          Have a question we didn\u2019t answer? Email <a href="mailto:support@rinkstop.com" style={{ color: '#14B8A6', textDecoration: 'none' }}>support@rinkstop.com</a>.
        </p>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', margin: '0.5rem 0 0' }}>
          Already a member? <Link href="/dashboard/subscription" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline' }}>Manage your subscription</Link>.
        </p>
      </section>
    </main>
  );
}
