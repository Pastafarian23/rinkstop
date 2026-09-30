import Link from 'next/link';

/**
 * <PricingComparisonTable /> — side-by-side feature comparison for the
 * personal track (Free vs Hockey Passport vs Hockey Passport Plus).
 *
 * Why this exists alongside the card grid:
 *   - Card grids are good for skimming price + tagline. They're bad for
 *     showing the difference between two tiers with overlapping features.
 *   - A comparison table answers the actual question a visitor has:
 *     "What does Plus get me that Hockey Passport doesn't?"
 *
 * Layout: 3-column sticky-header table. Each row = one feature. Cells =
 *   ✓ / ✗ / "1GB" / "Unlimited" / etc.
 *
 * Comparison data lives here (not in pricing.ts) because:
 *   - The table is a PRESENTATION format, not a tier definition.
 *   - Pricing tiers may change. Features here are stable from the user's POV.
 *   - Avoids the "personal track" vs "business track" cross-conflation.
 */

interface CellValue {
  free: string;
  passport: string;
  plus: string;
}

interface FeatureRow {
  category: string;
  feature: string;
  free: string;
  passport: string;
  plus: string;
  /** Optional tooltip explaining the feature */
  hint?: string;
}

const PERSONAL_ROWS: FeatureRow[] = [
  {
    category: 'Identity',
    feature: 'Government-ID verification',
    free: '—',
    passport: '✓ (renews every 2 yrs)',
    plus: '✓ (renews every 2 yrs)',
  },
  {
    category: 'Identity',
    feature: 'Hockey Passport — lifetime record',
    free: 'First 5 rinks only',
    passport: '✓ All rinks',
    plus: '✓ All rinks',
  },
  {
    category: 'Identity',
    feature: 'Stamps at every rink you visit',
    free: '5 lifetime',
    passport: '✓ Unlimited',
    plus: '✓ Unlimited',
  },
  {
    category: 'Identity',
    feature: 'Challenge badges (league circuits, geography)',
    free: '—',
    passport: '✓',
    plus: '✓',
  },
  {
    category: 'Identity',
    feature: 'Career timeline (auto-built)',
    free: '—',
    passport: '—',
    plus: '✓',
  },
  {
    category: 'Family',
    feature: 'Family Hub (link kids, manage multiple players)',
    free: '—',
    passport: '—',
    plus: '✓ Unlimited',
  },
  {
    category: 'Family',
    feature: 'Parent / guardian linking',
    free: '—',
    passport: '✓',
    plus: '✓',
  },
  {
    category: 'Communication',
    feature: 'Direct messaging',
    free: '—',
    passport: '—',
    plus: '✓ Advanced',
    hint: 'Connect with coaches, scouts, and other verified hockey people.',
  },
  {
    category: 'Communication',
    feature: 'Team invitations',
    free: '—',
    passport: '✓',
    plus: '✓',
  },
  {
    category: 'Tools',
    feature: 'Secure document storage',
    free: '—',
    passport: '✓',
    plus: '✓',
  },
  {
    category: 'Tools',
    feature: 'Digital signatures',
    free: '—',
    passport: '✓',
    plus: '✓',
  },
  {
    category: 'Tools',
    feature: 'Photos & videos',
    free: '—',
    passport: 'Limited',
    plus: '✓ Unlimited',
  },
  {
    category: 'Tools',
    feature: 'Premium insights & analytics',
    free: '—',
    passport: '—',
    plus: '✓',
  },
  {
    category: 'Eligibility',
    feature: 'Payment eligibility (charges + payouts)',
    free: '—',
    passport: '✓',
    plus: '✓',
  },
  {
    category: 'Eligibility',
    feature: 'Registration eligibility (events, teams, leagues)',
    free: '—',
    passport: '✓',
    plus: '✓',
  },
  {
    category: 'Support',
    feature: 'Support response',
    free: 'Community + docs',
    passport: 'Priority email',
    plus: 'Priority email + chat',
  },
];

export default function PricingComparisonTable() {
  // Group by category for visual clarity
  const grouped: Record<string, FeatureRow[]> = {};
  for (const row of PERSONAL_ROWS) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(row);
  }

  const cellStyle = (val: string): React.CSSProperties => {
    const isYes = val.startsWith('✓');
    const isNo = val === '—';
    return {
      padding: '0.75rem 1rem',
      fontSize: '0.875rem',
      color: isYes ? '#FFB81C' : isNo ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.85)',
      fontWeight: isYes ? 700 : 500,
      textAlign: 'center',
    };
  };

  return (
    <div
      data-pricing-comparison
      style={{
        maxWidth: 920,
        margin: '0 auto',
        padding: '0 1rem',
      }}
    >
      <h2
        style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          color: '#fff',
          margin: '0 0 0.5rem',
          textAlign: 'center',
          letterSpacing: '0.01em',
        }}
      >
        Compare personal plans
      </h2>
      <p
        style={{
          fontSize: '0.9375rem',
          color: 'rgba(255,255,255,0.6)',
          textAlign: 'center',
          margin: '0 0 1.75rem',
        }}
      >
        What's in each tier, side-by-side.
      </p>

      <div
        style={{
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {/* Sticky header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            background: 'rgba(255,184,28,0.06)',
            borderBottom: '1px solid rgba(255,184,28,0.25)',
          }}
        >
          <div style={{ padding: '1rem 1rem', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
            Feature
          </div>
          <div style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 4 }}>Free</div>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>$0</div>
          </div>
          <div style={{ padding: '1rem 0.5rem', textAlign: 'center', background: 'rgba(255,184,28,0.04)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.18em', color: '#FFB81C', textTransform: 'uppercase' }}>Popular</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.18em', color: '#FFB81C', textTransform: 'uppercase', marginBottom: 4, marginTop: 8 }}>Hockey Passport</div>
            <div style={{ fontSize: '0.8125rem', color: '#FFB81C', fontWeight: 700 }}>$24.99/yr</div>
          </div>
          <div style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 4 }}>Hockey Passport Plus</div>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>$59.99/yr</div>
          </div>
        </div>

        {/* Body grouped by category */}
        {Object.entries(grouped).map(([category, rows], catIdx) => (
          <div key={category}>
            {/* Category separator */}
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                padding: '0.5rem 1rem',
                fontSize: '0.6875rem',
                fontWeight: 800,
                letterSpacing: '0.15em',
                color: 'rgba(255,255,255,0.55)',
                textTransform: 'uppercase',
                borderTop: catIdx > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              {category}
            </div>
            {rows.map((row) => (
              <div
                key={row.feature}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)' }}>
                  {row.feature}
                  {row.hint && (
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 2, lineHeight: 1.4 }}>
                      {row.hint}
                    </div>
                  )}
                </div>
                <div style={cellStyle(row.free)}>{row.free}</div>
                <div style={{ ...cellStyle(row.passport), background: 'rgba(255,184,28,0.03)' }}>{row.passport}</div>
                <div style={cellStyle(row.plus)}>{row.plus}</div>
              </div>
            ))}
          </div>
        ))}

        {/* CTA footer */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            padding: '1.25rem 0',
            background: 'rgba(0,0,0,0.4)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ padding: '0 1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
            All paid plans renew automatically. Cancel anytime in dashboard.
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link
              href="/sign-up"
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.18)',
                color: 'rgba(255,255,255,0.85)',
                borderRadius: 6,
                fontSize: '0.8125rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Sign up free
            </Link>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(255,184,28,0.03)' }}>
            <Link
              href="https://buy.stripe.com/00waEW5fh9hR2yz1LMeIw02"
              target="_blank"
              rel="noopener"
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                background: 'linear-gradient(135deg, #FFB81C 0%, #E89C0F 100%)',
                color: '#0B1E3F',
                borderRadius: 6,
                fontSize: '0.8125rem',
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              $24.99/yr
            </Link>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link
              href="https://buy.stripe.com/6oU8wOazB8dN2yzduueIw03"
              target="_blank"
              rel="noopener"
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                background: 'linear-gradient(135deg, #C8102E 0%, #a00d24 100%)',
                color: '#fff',
                borderRadius: 6,
                fontSize: '0.8125rem',
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              $59.99/yr
            </Link>
          </div>
        </div>
      </div>

      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: '1rem' }}>
        Need business / team plans?{' '}
        <Link href="/pricing#business" style={{ color: '#FFB81C' }}>See Club Starter, Club Pro, and League →</Link>
      </p>
    </div>
  );
}