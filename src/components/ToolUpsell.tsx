'use client';

/**
 * ToolUpsell — inline conversion surface rendered at the end of every free tool.
 *
 * Per Arnel Phase 7 directive (memory/2026-10-01-conversion-monetization-overhaul.md):
 * "Free tools as acquisition funnel — provide useful free result; include a
 * clear but non-intrusive account CTA; connect user to relevant directory
 * listings; offer account creation only after delivering value."
 *
 * Two-button layout:
 *  - PRIMARY (paid upgrade, passport / club)
 *  - SECONDARY (free account creation, no card needed)
 *
 * Both fire analytics events so we can measure: tool → free_account_created
 * vs tool → tool_upsell_clicked → checkout_started conversion paths.
 *
 * Client component for sendBeacon. Server-side would lose the beacon.
 *
 * Variant 'passport' (default): paid points at $24.99/yr Verified Identity
 * Variant 'club': paid points at $149/yr Club Starter
 */

import Link from 'next/link';

export type ToolUpsellVariant = 'passport' | 'club';

export interface ToolUpsellProps {
  variant?: ToolUpsellVariant;
  toolSlug: string;
}

const PASSPORT_BULLETS = [
  'Save your results across every tool',
  'Save your kid\'s Hockey Passport — every team, every season',
  'Claim 1 rink, team, or player profile (home rink, kid\'s team, beer-league squad)',
  'Verified badge visible on every directory page you touch',
];

const CLUB_BULLETS = [
  'Showcase every team in your club in one place',
  'Free for the first 30 players',
  'Roster management + standings + scheduling',
  'Visible to every coach, scout, and family in your area',
];

export default function ToolUpsell({ variant = 'passport', toolSlug }: ToolUpsellProps) {
  const isClub = variant === 'club';
  const plan = isClub ? 'club_starter' : 'verified_identity';
  const heading = isClub ? 'Run a club?' : 'Save your results.';
  const subhead = isClub
    ? 'Claim your club page and put every team, player, and schedule in one place families can find.'
    : 'Verified Hockey Passport — every team, every milestone, every season, in one place anyone can find.';
  const price = isClub ? '$149/year' : '$24.99/year';
  const cta = isClub ? 'Start your club' : 'Get my Hockey Passport';
  const bullets = isClub ? CLUB_BULLETS : PASSPORT_BULLETS;

  function trackPaid() {
    try {
      const payload = JSON.stringify({
        name: 'tool_upsell_clicked',
        pathname: `/tools/${toolSlug}`,
        props: { plan, source: toolSlug, variant },
      });
      navigator.sendBeacon?.('/api/track', new Blob([payload], { type: 'application/json' }));
    } catch {
      /* swallow */
    }
  }

  function trackFreeAccount() {
    try {
      const payload = JSON.stringify({
        name: 'tool_free_account_clicked',
        pathname: `/tools/${toolSlug}`,
        props: { source: toolSlug, variant, kind: 'free_signup' },
      });
      navigator.sendBeacon?.('/api/track', new Blob([payload], { type: 'application/json' }));
    } catch {
      /* swallow */
    }
  }

  return (
    <div
      data-tool-upsell="true"
      data-tool-slug={toolSlug}
      data-plan={plan}
      style={{
        marginTop: '2rem',
        background: 'linear-gradient(135deg, rgba(4,30,66,0.95) 0%, rgba(10,46,92,0.95) 100%)',
        border: '1px solid rgba(255,184,28,0.4)',
        borderRadius: 12,
        padding: '1.75rem 1.5rem',
        color: '#fff',
        position: 'relative',
      }}
    >
      <div
        style={{
          fontSize: '0.6875rem',
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#FFB81C',
          marginBottom: '0.5rem',
        }}
      >
        Optional · {price}
      </div>
      <h3
        style={{
          fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          margin: '0 0 0.5rem',
          letterSpacing: '0.02em',
          lineHeight: 1.1,
        }}
      >
        {heading}
      </h3>
      <p
        style={{
          color: 'rgba(255,255,255,0.75)',
          fontSize: '0.95rem',
          lineHeight: 1.5,
          margin: '0 0 1rem',
          maxWidth: 560,
        }}
      >
        {subhead}
      </p>
      <ul
        style={{
          margin: '0 0 1.25rem',
          padding: 0,
          listStyle: 'none',
          color: 'rgba(255,255,255,0.85)',
          fontSize: '0.875rem',
          lineHeight: 1.6,
        }}
      >
        {bullets.map((b, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ color: '#FFB81C', flexShrink: 0, marginTop: 2 }}>✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <Link
          href={`/pricing?tier=${plan}&from=tool&tool=${toolSlug}`}
          data-upsell-cta="true"
          data-upsell-plan={plan}
          data-upsell-source={toolSlug}
          onClick={trackPaid}
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: '#C8102E',
            color: '#fff',
            borderRadius: 6,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.9375rem',
            fontFamily: 'inherit',
          }}
        >
          {cta} →
        </Link>
        <Link
          href={`/sign-up?from=tool&tool=${toolSlug}&intent=${isClub ? 'club' : 'passport'}`}
          data-upsell-cta="free"
          data-upsell-source={toolSlug}
          onClick={trackFreeAccount}
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            color: '#FFB81C',
            border: '1px solid #FFB81C',
            borderRadius: 6,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.9375rem',
            fontFamily: 'inherit',
          }}
        >
          Create free account →
        </Link>
        <span
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.75rem',
          }}
        >
          Free = no card · Paid = cancel anytime
        </span>
      </div>
    </div>
  );
}
