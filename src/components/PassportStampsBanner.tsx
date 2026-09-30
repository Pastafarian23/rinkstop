'use client';

/**
 * PassportStampsBanner — inline CTA for the RinkStop Hockey Passport.
 *
 * Used on high-traffic directory pages (team, rink, player, league, country hub).
 * Pitch is intentionally specific to the page context so it reads as relevant,
 * not boilerplate.
 *
 * Variants:
 *   - "team" — "Stamp this team's arena every time you play here"
 *   - "rink" — "Stamp this rink on your Hockey Passport"
 *   - "player" — "Track every rink this player has played in"
 *   - "league" — "Collect every rink in this league"
 *   - "country" — "Stamp your first rink in [country] on your Hockey Passport"
 *
 * Default ("generic") used for catch-all surfaces.
 *
 * Lives at /src/components/PassportStampsBanner.tsx.
 * Server-rendered (no 'use client' dependency), but this file uses 'use client'
 * to keep React from breaking on hydration when the variant copy is computed.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';

export type PassportBannerVariant =
  | 'team'
  | 'rink'
  | 'player'
  | 'league'
  | 'country'
  | 'generic';

export interface PassportStampsBannerProps {
  variant: PassportBannerVariant;
  /** Context name — team name, rink name, country name, etc. */
  contextName?: string;
  /** Optional extra line — e.g. "47 rinks in Ontario" */
  contextHint?: string;
}

interface VariantCopy {
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
  href: string;
}

function pickCopy(variant: PassportBannerVariant, name?: string, hint?: string): VariantCopy {
  const displayName = name ? name : 'this rink';
  switch (variant) {
    case 'team':
      return {
        eyebrow: 'Hockey Passport',
        headline: `Every rink you suit up for, stamped.`,
        body: `Whether it's ${displayName}'s home arena or a tournament rink across the country — every visit earns a stamp. Recruiters, scouts, and scholarship committees see the full record at one URL.`,
        cta: 'Start Your Passport — Free',
        href: '/claim-your-listing?for=identity',
      };
    case 'rink':
      return {
        eyebrow: 'Hockey Passport',
        headline: `Stamp ${displayName} on your Hockey Passport.`,
        body: hint
          ? `You've already played or skated here — claim the stamp and add it to your lifetime record. ${hint}`
          : `You've already played or skated here — claim the stamp and add it to your lifetime record.`,
        cta: 'Get My Stamp — Free',
        href: '/claim-your-listing?for=identity',
      };
    case 'player':
      return {
        eyebrow: 'Hockey Passport',
        headline: `Track every rink this player has played in.`,
        body: name
          ? `Build out ${displayName}'s career record — every team, every arena, every season. One URL a coach or scout can open and see the full picture.`
          : `Build out a player's career record — every team, every arena, every season. One URL a coach or scout can open and see the full picture.`,
        cta: 'Build My Passport — Free',
        href: '/claim-your-listing?for=identity',
      };
    case 'league':
      return {
        eyebrow: 'Hockey Passport · Challenges',
        headline: `Collect every rink in ${displayName}.`,
        body: hint
          ? `${hint} Stamp them all and earn the "League Circuit" badge. Most players never finish — the ones who do get noticed.`
          : `Stamp every rink in the league and earn the "League Circuit" badge. Most players never finish — the ones who do get noticed.`,
        cta: 'Start Collecting — Free',
        href: '/claim-your-listing?for=identity',
      };
    case 'country':
      return {
        eyebrow: 'Hockey Passport',
        headline: `Stamp your first rink in ${displayName}.`,
        body: `Whether you live here, played a tournament here, or just skated once — every rink in ${displayName} can go on your Hockey Passport.`,
        cta: 'Claim My First Stamp — Free',
        href: '/claim-your-listing?for=identity',
      };
    case 'generic':
    default:
      return {
        eyebrow: 'Hockey Passport',
        headline: `Your hockey lifetime record. Free to start.`,
        body: `Every rink you've played in, every stamp you've earned, every challenge you've finished — one shareable URL. Built for the player, parent, or coach who treats hockey as a career, not a hobby.`,
        cta: 'Get My Passport',
        href: '/claim-your-listing?for=identity',
      };
  }
}

export default function PassportStampsBanner({
  variant,
  contextName,
  contextHint,
}: PassportStampsBannerProps): React.ReactElement {
  // Avoid hydration mismatch for variant copy by deferring render to client mount.
  // The server renders a stable placeholder; the client hydrates with real copy.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const copy = pickCopy(variant, contextName, contextHint);

  // Stable SSR shell — same on server + first client render so hydration doesn't mismatch.
  if (!mounted) {
    return (
      <aside
        data-passport-banner={variant}
        data-hydrated="false"
        style={{
          margin: '1.5rem 0',
          padding: '1.25rem 1.5rem',
          background:
            'linear-gradient(135deg, rgba(255,184,28,0.10) 0%, rgba(200,16,54,0.08) 100%)',
          border: '1px solid rgba(255,184,28,0.35)',
          borderLeft: '4px solid #FFB81C',
          borderRadius: 12,
        }}
      >
        <div style={{ minHeight: 96 }} />
      </aside>
    );
  }

  return (
    <aside
      data-passport-banner={variant}
      data-hydrated="true"
      role="complementary"
      aria-label="RinkStop Hockey Passport"
      style={{
        margin: '1.5rem 0',
        padding: '1.25rem 1.5rem',
        background:
          'linear-gradient(135deg, rgba(255,184,28,0.10) 0%, rgba(200,16,54,0.08) 100%)',
        border: '1px solid rgba(255,184,28,0.35)',
        borderLeft: '4px solid #FFB81C',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#FFB81C',
          }}
        >
          {copy.eyebrow}
        </p>
        <h3
          style={{
            margin: '0.35rem 0 0.5rem',
            fontSize: '1.25rem',
            fontWeight: 700,
            lineHeight: 1.25,
            color: '#fff',
          }}
        >
          {copy.headline}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {copy.body}
        </p>
      </div>
      <Link
        href={copy.href}
        data-passport-banner-cta
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.75rem 1.25rem',
          background: '#FFB81C',
          color: '#0D1117',
          fontWeight: 700,
          fontSize: 14,
          borderRadius: 8,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          border: '1px solid rgba(0,0,0,0.08)',
          flexShrink: 0,
        }}
      >
        🏒 {copy.cta}
      </Link>
    </aside>
  );
}