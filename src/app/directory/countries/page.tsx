import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hockey by Country | RinkStop',
  description: 'Browse hockey programs, national teams, and leagues by country. From traditional powers to emerging markets worldwide.',
};

const HOCKEY_NATIONS = [
  { country: 'Canada', flag: '🇨🇦', tier: 'Elite', leagues: 'NHL, AHL, OHL, WHL, QMJHL, BCHL, Jr. A', note: 'Hockey&apos;s birthplace and powerhouse' },
  { country: 'United States', flag: '🇺🇸', tier: 'Elite', leagues: 'NHL, AHL, NCAA, USHL, NAHL, USDP', note: 'Fastest-growing market globally' },
  { country: 'Russia', flag: '🇷🇺', tier: 'Elite', leagues: 'KHL, MHL, VHL', note: 'KHL is world&apos;s second-best league' },
  { country: 'Sweden', flag: '🇸🇪', tier: 'Top', leagues: 'SHL, Hockeyallsvenskan, J20', note: 'Top development system' },
  { country: 'Finland', flag: '🇫🇮', tier: 'Top', leagues: 'Liiga, Mestis, Jr. A', note: 'Per-capita hockey power' },
  { country: 'Czech Republic', flag: '🇨🇿', tier: 'Top', leagues: 'Extraliga, 1. Liga', note: 'Rich hockey tradition' },
  { country: 'Germany', flag: '🇩🇪', tier: 'Top', leagues: 'DEL, DEL2, Oberliga', note: 'Growing NHL pipeline' },
  { country: 'Switzerland', flag: '🇨🇭', tier: 'Top', leagues: 'NL, SL', note: 'High-quality league, neutral host' },
  { country: 'Slovakia', flag: '🇸🇰', tier: 'Mid', leagues: 'SLKHL, 1. Liga', note: 'Consistent talent producer' },
  { country: 'Latvia', flag: '🇱🇻', tier: 'Mid', leagues: 'Optibet Latvian Hockey League', note: 'Passionate hockey nation' },
  { country: 'Belarus', flag: '🇧🇾', tier: 'Mid', leagues: 'Extraleague', note: 'Strong regional presence' },
  { country: 'Austria', flag: '🇦🇹', tier: 'Mid', leagues: 'ICEHL, Eishockey-Liga', note: 'Alpine hockey tradition' },
  { country: 'Norway', flag: '🇳🇴', tier: 'Mid', leagues: 'Fjordkraft-Ligaen', note: 'Rapidly improving program' },
  { country: 'Denmark', flag: '🇩🇰', tier: 'Mid', leagues: 'Metal Ligaen', note: 'Strong domestic league' },
  { country: 'France', flag: '🇫🇷', tier: 'Mid', leagues: 'Ligue Magnus', note: 'Growing NHL interest' },
  { country: 'United Kingdom', flag: '🇬🇧', tier: 'Mid', leagues: 'EIHL, NIHL', note: 'UK hockey expanding' },
  { country: 'Italy', flag: '🇮🇹', tier: 'Developing', leagues: 'Serie A, Serie B', note: 'Mediterranean hockey hub' },
  { country: 'Kazakhstan', flag: '🇰🇿', tier: 'Developing', leagues: 'Kazakhstan Hockey League', note: 'Asian hockey presence' },
  { country: 'Japan', flag: '🇯🇵', tier: 'Developing', leagues: 'BHL, JHML', note: 'Asia&apos;s most developed program' },
  { country: 'South Korea', flag: '🇰🇷', tier: 'Developing', leagues: 'KHL, Asia League', note: 'Rapidly rising program' },
  { country: 'China', flag: '🇨🇳', tier: 'Emerging', leagues: 'CWHL, Russia-based teams', note: 'Fastest-growing market' },
  { country: 'Philippines', flag: '🇵🇭', tier: 'Emerging', leagues: 'MAHL, Manila Ice Hockey', note: 'Tropical hockey growth' },
  { country: 'Thailand', flag: '🇹🇭', tier: 'Emerging', leagues: 'THL', note: 'Southeast Asian hockey' },
  { country: 'Singapore', flag: '🇸🇬', tier: 'Emerging', leagues: 'SHL Singapore', note: 'City-state hockey start' },
  { country: 'Australia', flag: '🇦🇺', tier: 'Emerging', leagues: 'AIHL', note: 'Southern hemisphere hub' },
  { country: 'New Zealand', flag: '🇳🇿', tier: 'Emerging', leagues: 'NZIHL', note: 'Oceania hockey entry point' },
  { country: 'South Africa', flag: '🇿🇦', tier: 'Emerging', leagues: 'SAHL', note: 'African hockey initiative' },
  { country: 'Netherlands', flag: '🇳🇱', tier: 'Developing', leagues: 'Eredivisie', note: 'Dutch hockey progressing' },
  { country: 'Poland', flag: '🇵🇱', tier: 'Developing', leagues: 'Polska Hokej Liga', note: 'Central European hockey' },
  { country: 'Hungary', flag: '🇭🇺', tier: 'Developing', leagues: 'Erste Liga', note: 'National league development' },
];

const TIER_COLORS: Record<string, string> = {
  'Elite': '#C8102E',
  'Top': '#041E42',
  'Mid': '#1E5B9C',
  'Developing': '#7B3FA0',
  'Emerging': '#1E7B1E',
  'No Known Hockey': '#555555',
};

// Countries with no known active ice hockey — indexed for SEO, not hidden
const NO_HOCKEY_NATIONS: Array<{ country: string; flag: string; region: string }> = [
  // Africa
  { country: 'Ethiopia', flag: '🇪🇹', region: 'East Africa' },
  { country: 'Kenya', flag: '🇰🇪', region: 'East Africa' },
  { country: 'Nigeria', flag: '🇳🇬', region: 'West Africa' },
  { country: 'Ghana', flag: '🇬🇭', region: 'West Africa' },
  { country: 'Uganda', flag: '🇺🇬', region: 'East Africa' },
  { country: 'Tanzania', flag: '🇹🇿', region: 'East Africa' },
  { country: 'Zambia', flag: '🇿🇲', region: 'Southern Africa' },
  { country: 'Mozambique', flag: '🇲🇿', region: 'Southern Africa' },
  { country: 'Angola', flag: '🇦🇴', region: 'Southern Africa' },
  { country: 'Cameroon', flag: '🇨🇲', region: 'Central Africa' },
  { country: 'Ivory Coast', flag: '🇨🇮', region: 'West Africa' },
  { country: 'Senegal', flag: '🇸🇳', region: 'West Africa' },
  { country: 'Botswana', flag: '🇧🇼', region: 'Southern Africa' },
  { country: 'Zimbabwe', flag: '🇿🇼', region: 'Southern Africa' },
  // Asia Pacific
  { country: 'India', flag: '🇮🇳', region: 'South Asia' },
  { country: 'Pakistan', flag: '🇵🇰', region: 'South Asia' },
  { country: 'Bangladesh', flag: '🇧🇩', region: 'South Asia' },
  { country: 'Sri Lanka', flag: '🇱🇰', region: 'South Asia' },
  { country: 'Nepal', flag: '🇳🇵', region: 'South Asia' },
  { country: 'Myanmar', flag: '🇲🇲', region: 'Southeast Asia' },
  { country: 'Vietnam', flag: '🇻🇳', region: 'Southeast Asia' },
  { country: 'Indonesia', flag: '🇮🇩', region: 'Southeast Asia' },
  { country: 'Malaysia', flag: '🇲🇾', region: 'Southeast Asia' },
  // Latin America / Caribbean
  { country: 'Ecuador', flag: '🇪🇨', region: 'South America' },
  { country: 'Peru', flag: '🇵🇪', region: 'South America' },
  { country: 'Bolivia', flag: '🇧🇴', region: 'South America' },
  { country: 'Paraguay', flag: '🇵🇾', region: 'South America' },
  { country: 'Guatemala', flag: '🇬🇹', region: 'Central America' },
  { country: 'Costa Rica', flag: '🇨🇷', region: 'Central America' },
  { country: 'Panama', flag: '🇵🇦', region: 'Central America' },
  { country: 'Jamaica', flag: '🇯🇲', region: 'Caribbean' },
  { country: 'Trinidad & Tobago', flag: '🇹🇹', region: 'Caribbean' },
];

const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function CountriesPage() {
  const tiers = ['Elite', 'Top', 'Mid', 'Developing', 'Emerging'] as const;

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Countries</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          HOCKEY BY COUNTRY
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          {HOCKEY_NATIONS.length}+ nations with organized hockey programs. From traditional powers to emerging markets.
        </p>
      </div>

      {/* Quick links */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'International', href: '/directory/international' },
          { label: 'IIHF', href: '/directory/international/iihf' },
          { label: 'World Championship', href: '/directory/international/world-championships' },
          { label: 'Olympics', href: '/directory/international/olympics' },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{
            padding: '0.3rem 0.75rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            textDecoration: 'none',
            color: 'rgba(255,255,255,0.55)',
            background: 'var(--s2)',
            border: '1px solid var(--border)',
          }}>
            {n.label}
          </Link>
        ))}
      </div>

      {/* Tier legend */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem', padding: '1rem', background: 'var(--s2)', borderRadius: '6px' }}>
        {tiers.map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: TIER_COLORS[t], display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{t}</span>
          </div>
        ))}
      </div>

      {/* Countries by tier */}
      {tiers.map(tier => {
        const nations = HOCKEY_NATIONS.filter(n => n.tier === tier);
        if (nations.length === 0) return null;
        return (
          <div key={tier} style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1.25rem',
              color: TIER_COLORS[tier],
              letterSpacing: '0.04em',
              marginBottom: '0.75rem',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '0.5rem',
            }}>
              {tier.toUpperCase()} TIER
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {nations.map(n => {
                const href = `/directory/${slugify(n.country)}`;
                return (
                  <Link className="country-card" href={href} style={{
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}>
                    <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{n.flag}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff', marginBottom: '0.25rem' }}>{n.country}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem', lineHeight: 1.5 }}>{n.leagues}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>{n.note}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Bottom CTA */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem 2rem', marginTop: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '1rem' }}>Don't see your country? Hockey is growing worldwide.</p>
        <Link href="/add-listing" style={{ display: 'inline-block', background: '#C8102E', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}>
          Sign Up Free →
        </Link>
      </div>

      {/* Countries with no known active ice hockey — SEO indexed */}
      <div style={{ marginTop: '3rem' }}>
        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '1.25rem',
          color: '#555555',
          letterSpacing: '0.04em',
          marginBottom: '0.75rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.5rem',
        }}>
          NO KNOWN ACTIVE HOCKEY
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', marginBottom: '1.25rem', fontStyle: 'italic' }}>
          Ice hockey is not currently established in these countries. If you know of any activity, we&apos;d love to feature it — reach out to us.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {NO_HOCKEY_NATIONS.map(n => {
            const href = `/directory/${slugify(n.country)}`;
            return (
              <Link key={n.country} href={href} style={{
                background: 'var(--s2)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                textDecoration: 'none',
                cursor: 'pointer',
                opacity: 0.65,
              }}>
                <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{n.flag}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff', marginBottom: '0.25rem' }}>{n.country}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                    Ice hockey is not currently established in {n.country}. The sport remains developing in {n.region}.
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}