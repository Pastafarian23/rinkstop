/**
 * Four-path navigation (WS30 conversion overhaul, Arnel 2026-10-01).
 *
 * Per the conversion overhaul directive, RinkStop's primary commercial
 * surfaces should NOT lead every visitor toward a paid subscription.
 * Instead, segment visitors into four primary paths:
 *
 *   1. FIND HOCKEY         — browse the directory
 *   2. CLAIM MY PROFILE    — players/parents/coaches/individuals
 *   3. MANAGE MY CLUB/LEAGUE — organizations
 *   4. GROW MY HOCKEY BUSINESS — rinks, shops, trainers, clinics, B2B
 *
 * Each card uses a hockey-coded color (red/gold/navy/teal) and routes
 * to the most-relevant landing page for that visitor's intent. The
 * "See what you can unlock" secondary link inside each card points at
 * /pricing filtered by intent so the visitor can self-educate on the
 * upgrade ladder — but only AFTER they've understood the free path.
 *
 * This component is server-rendered. No client JS. Each Link is a
 * regular next/link. We track clicks via the search/CTAs we already
 * instrument elsewhere (no inline analytics — every existing Link CTA
 * already passes through one of the funnel events).
 *
 * Per Arnel: "The homepage should sell the ecosystem, not force
 * visitors to understand the entire pricing architecture."
 */
import Link from 'next/link';

interface Path {
  title: string;
  blurb: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  accent: string;
  icon: string;
  trackLabel: string;
}

const PATHS: Path[] = [
  {
    title: 'Find Hockey',
    blurb: 'Search the global directory of rinks, teams, players, and leagues — by city, country, or league.',
    primaryHref: '/directory',
    primaryLabel: 'Browse the directory',
    secondaryHref: '/directory/united-states',
    secondaryLabel: 'Browse by city',
    accent: '#FFB81C',
    icon: '🔎',
    trackLabel: 'find_hockey',
  },
  {
    title: 'Claim My Profile',
    blurb: 'Players, parents, coaches, managers, individuals. Verify your identity and own your listing.',
    primaryHref: '/claim-your-listing',
    primaryLabel: 'Claim it — free',
    secondaryHref: '/pricing?for=player',
    secondaryLabel: 'See what you can unlock',
    accent: '#38bdf8',
    icon: '🪪',
    trackLabel: 'claim_profile',
  },
  {
    title: 'Manage My Club or League',
    blurb: 'Organizations. Add rosters, schedule games, post news, run tryouts, manage your season.',
    primaryHref: '/claim-your-listing?focus=team',
    primaryLabel: 'Claim my team or league',
    secondaryHref: '/pricing?for=team',
    secondaryLabel: 'Compare Club plans',
    accent: '#a78bfa',
    icon: '🏒',
    trackLabel: 'manage_club',
  },
  {
    title: 'Grow My Hockey Business',
    blurb: 'Rinks, pro shops, trainers, clinics, equipment. Capture leads and get found by local players.',
    primaryHref: '/launch',
    primaryLabel: 'List my business',
    secondaryHref: '/pricing?for=rink',
    secondaryLabel: 'Compare Business plans',
    accent: '#4ade80',
    icon: '📈',
    trackLabel: 'grow_business',
  },
];

export default function FourPathNav({
  variant = 'cards',
}: {
  /**
   * 'cards' = large 4-up grid for the homepage above-the-fold.
   * 'compact' = horizontal row for secondary placements (e.g. /directory).
   */
  variant?: 'cards' | 'compact';
}) {
  if (variant === 'compact') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.625rem',
        }}
      >
        {PATHS.map((p) => (
          <Link
            key={p.trackLabel}
            href={p.primaryHref}
            data-four-path={p.trackLabel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${p.accent}33`,
              borderRadius: 8,
              color: '#fff',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
          >
            <span style={{ fontSize: '1.1rem' }} aria-hidden>{p.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{p.title}</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{p.primaryLabel} →</div>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <section
      aria-label="Four primary paths on RinkStop"
      style={{
        background: '#0D1117',
        padding: 'clamp(2rem, 5vw, 3rem) 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="container" style={{ maxWidth: '1200px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div className="label" style={{ color: 'rgba(255,255,255,0.5)' }}>
            What can we help you do?
          </div>
          <h2
            className="font-sport"
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
              color: '#fff',
              letterSpacing: '0.04em',
              margin: 0,
            }}
          >
            FOUR WAYS TO USE RINKSTOP
          </h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '0.875rem',
          }}
        >
          {PATHS.map((p) => (
            <div
              key={p.trackLabel}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${p.accent}22`,
                borderRadius: 12,
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 3,
                  bottom: 0,
                  background: p.accent,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }} aria-hidden>{p.icon}</span>
                <span
                  className="font-sport"
                  style={{
                    fontSize: '1.1rem',
                    color: '#fff',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {p.title}
                </span>
              </div>
              <p
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {p.blurb}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
                <Link
                  href={p.primaryHref}
                  data-four-path={p.trackLabel}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: p.accent,
                    color: '#0a0a0a',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                    letterSpacing: '0.02em',
                  }}
                >
                  {p.primaryLabel} →
                </Link>
                <Link
                  href={p.secondaryHref}
                  style={{
                    color: 'rgba(255,255,255,0.65)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    textAlign: 'center',
                    padding: '0.35rem 0.5rem',
                  }}
                >
                  {p.secondaryLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
