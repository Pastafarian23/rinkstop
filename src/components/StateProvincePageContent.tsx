import Link from 'next/link';
import type { StateFAQEntry } from '@/lib/state-faq-builder';

export interface CityRow {
  city: string;
  rink_count: number;
  team_count: number;
  city_slug: string;
}

export interface StateProvinceContentProps {
  /** Display name e.g. "New York" or "Ontario" */
  regionName: string;
  /** Abbr e.g. "NY" or "ON" */
  regionAbbr: string;
  /** Country display name, "United States" or "Canada" */
  countryName: string;
  /** Parent URL (e.g. /directory/united-states or /directory/canada) */
  parentUrl: string;
  /** Parent display name (e.g. "United States" or "Canada") */
  parentLabel: string;
  /** ISO-2 country code for the flag emoji lookup */
  countryCode: 'US' | 'CA';
  /** Whether to render the Hockey Canada Ad slot (Canada only) */
  showHockeyCanadaAd?: boolean;
  /** City-level rows to render as the directory list */
  cities: CityRow[];
  /** Total rink count across this state/province */
  rinkCount: number;
  /** Total team count across this state/province */
  teamCount: number;
  /** Pre-built FAQ entries (from buildStateFAQs or buildProvinceFAQs) */
  faqs: StateFAQEntry[];
  /** Pre-built intro paragraph */
  intro: string;
  /** Optional curated flag emoji */
  flag?: string;
  /**
   * PR2 (2026-07-08): top leagues in the country this state/province belongs
   * to. Leagues table has no province_state column (verified 2026-07-08),
   * so country is the most granular level we can filter on. Rendered as
   * a cross-link section between the city list and the FAQs.
   */
  topLeagues?: Array<{
    id: string;
    name: string;
    slug: string | null;
    level: string | null;
    logo_url: string | null;
  }>;
}

export default function StateProvincePageContent({
  regionName,
  regionAbbr,
  countryName,
  parentUrl,
  parentLabel,
  countryCode,
  showHockeyCanadaAd = false,
  cities,
  rinkCount,
  teamCount,
  faqs,
  intro,
  flag,
  topLeagues = [],
}: StateProvinceContentProps) {
  const cityCount = cities.length;
  const bg = '#0a0a0a', card = '#0f0f0f', border = '#1e1e1e', red = '#C8102E', textMain = '#fff', textMuted = '#888', textDim = '#555';
  const flagEmoji = flag || (countryCode === 'US' ? '🇺🇸' : '🇨🇦');

  // FAQ schema (server-rendered JSON-LD for crawlers)
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer.replace(/<[^>]+>/g, '') },
    })),
  };

  // Breadcrumb schema
  const currentUrl = `${parentUrl}/${regionAbbr.toLowerCase()}`;
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com' },
      { '@type': 'ListItem', position: 2, name: 'Directory', item: 'https://rinkstop.com/directory' },
      { '@type': 'ListItem', position: 3, name: parentLabel, item: `https://rinkstop.com${parentUrl}` },
      { '@type': 'ListItem', position: 4, name: regionName, item: `https://rinkstop.com${currentUrl}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem 4rem' }}>
        {/* Breadcrumb nav */}
        <nav style={{ fontSize: '0.75rem', color: '#555555', padding: '1.5rem 0 0', marginBottom: '0' }}>
          <Link href="/" style={{ color: '#555555' }}>Home</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/directory" style={{ color: '#555555' }}>Directory</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href={parentUrl} style={{ color: '#555555' }}>{parentLabel}</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: '#A0A0A0' }}>{regionName}</span>
        </nav>

        {/* Hero */}
        <header style={{ marginBottom: '2.5rem', paddingTop: '1.5rem' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: red, marginBottom: '0.5rem' }}>
            {flagEmoji} {countryName}
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.75rem' }}>
            {regionName} Hockey
          </h1>

          {/* Intro paragraph (pre-built from state-faq-builder, no invention) */}
          <p style={{ color: '#555', fontSize: '1.0625rem', lineHeight: 1.7, maxWidth: '800px', marginBottom: '1.5rem' }}>
            {intro}
          </p>

          {/* Stats grid */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <Stat label="Cities" value={cityCount} />
            <Stat label="Rinks" value={rinkCount} />
            <Stat label="Teams" value={teamCount} />
          </div>

          <p style={{ color: '#666666', fontSize: '0.9375rem' }}>
            Browse by city below or{' '}
            <Link href="/add-listing" style={{ color: red, fontWeight: 600 }}>add a listing</Link>
            {' '}if you know a rink or team we&apos;re missing.
          </p>

          {/* PR2 (2026-07-08): claim CTA strip. Operators landing on this
              state hub should see a single, prominent path to claim their
              listing. Previously the only path to /claim-your-listing was
              the footer nav, which is below the fold. Inline red-accent
              strip with one button + one secondary link. */}
          <div
            role="region"
            aria-label={`Claim your listing in ${regionName}`}
            style={{
              marginTop: '1.25rem',
              padding: '1rem 1.25rem',
              background: 'rgba(200,16,46,0.08)',
              border: `1px solid ${red}`,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ color: textMain, fontSize: '0.9375rem', lineHeight: 1.5 }}>
              <strong style={{ color: red }}>Run a rink or team in {regionName}?</strong>{' '}
              Claim your listing to get a verified checkmark, lead capture, and direct messages from coaches and parents.
            </div>
            <Link
              href={`/claim-your-listing?type=${countryCode === 'CA' ? 'rink' : 'rink'}`}
              style={{
                display: 'inline-block',
                background: red,
                color: '#fff',
                padding: '0.6rem 1.1rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.875rem',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Claim your {regionName} listing →
            </Link>
          </div>
        </header>

        {/* Hockey Canada Ad slot — Canada only, matches country page */}
        {showHockeyCanadaAd && (
          <div style={{ marginBottom: '2rem', padding: '1rem', background: card, border: `1px solid ${border}`, borderRadius: '8px' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textDim, marginBottom: '0.5rem' }}>Sponsored</p>
            <p style={{ color: textMuted, fontSize: '0.875rem', margin: 0 }}>
              <a href="https://www.hockeycanada.ca" target="_blank" rel="noopener noreferrer" style={{ color: red, fontWeight: 700 }}>Hockey Canada</a> — official governing body for amateur hockey across Canada. Registration, development pathways, and national programs.
            </p>
          </div>
        )}

        {/* City list */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.25rem', borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
            <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em', color: textMain, margin: 0 }}>
              Cities with Hockey in {regionName}
            </h2>
            <span style={{ fontSize: '0.75rem', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {cityCount} {cityCount === 1 ? 'city' : 'cities'}
            </span>
          </div>
          {cityCount > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {cities.map(({ city, team_count, rink_count, city_slug }) => (
                <Link
                  key={city}
                  href={`${currentUrl}/${city_slug}`}
                  style={{
                    display: 'block',
                    padding: '1.25rem',
                    background: card,
                    border: `1px solid ${border}`,
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '1.0625rem', marginBottom: '0.5rem', color: textMain }}>
                    {city}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', gap: '1rem' }}>
                    {team_count > 0 && <span>🏒 {team_count} teams</span>}
                    {rink_count > 0 && <span>⛸️ {rink_count} rinks</span>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: textMuted }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏒</div>
              <p>No hockey found in {regionName} yet.</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Know a team or rink? <Link href="/add-listing" style={{ color: red }}>Add it</Link>
              </p>
            </div>
          )}
        </section>

        {/* PR2 (2026-07-08): Top Leagues in {countryName} — cross-link hub.
            Leagues table has no province_state column (verified 2026-07-08),
            so country is the most granular level we can show. Same leagues
            surface on the rink detail page; rendering them here gives the
            state hub a second internal-link path to the league directory.
            Skipped when no leagues match. */}
        {topLeagues.length > 0 && (
          <section style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.25rem', borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em', color: textMain, margin: 0 }}>
                Hockey leagues in {countryName}
              </h2>
              <span style={{ fontSize: '0.75rem', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {topLeagues.length} {topLeagues.length === 1 ? 'league' : 'leagues'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {topLeagues.map((l) => (
                <Link
                  key={l.id}
                  href={l.slug ? `/directory/leagues/${l.slug}` : '/directory/leagues'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    padding: '0.75rem 1rem',
                    background: card,
                    border: `1px solid ${border}`,
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  {l.logo_url ? (
                    <img src={l.logo_url} alt={`${l.name} logo`} style={{ width: 28, height: 28, borderRadius: '4px', objectFit: 'contain', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} loading="lazy" />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '4px', background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🏆</div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: textMain, fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.3 }}>{l.name}</div>
                    {l.level && <div style={{ color: textMuted, fontSize: '0.75rem', textTransform: 'capitalize' }}>{l.level}</div>}
                  </div>
                </Link>
              ))}
            </div>
            <p style={{ marginTop: '0.875rem', fontSize: '0.8125rem' }}>
              <Link href="/directory/leagues" style={{ color: red, textDecoration: 'none' }}>
                See all leagues →
              </Link>
            </p>
          </section>
        )}

        {/* FAQ Section (accordion + schema) */}
        <section style={{ marginBottom: '3rem', maxWidth: 820 }}>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em', color: textMain, marginBottom: '1.25rem', borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
            Frequently Asked Questions About Hockey in {regionName}
          </h2>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {faqs.map((q, i) => (
              <details
                key={i}
                style={{ background: card, border: `1px solid ${border}`, borderRadius: '8px', padding: '0.875rem 1.125rem' }}
              >
                <summary
                  style={{
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    color: textMain,
                    cursor: 'pointer',
                    listStyle: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span>{q.question}</span>
                  <span aria-hidden style={{ color: red, fontSize: '1.125rem', flexShrink: 0, lineHeight: 1 }}>+</span>
                </summary>
                <p
                  style={{ color: '#aaa', fontSize: '0.875rem', lineHeight: 1.65, marginTop: '0.625rem', marginBottom: 0 }}
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: q.answer }}
                />
              </details>
            ))}
          </div>
        </section>

        {/* Explore-more — only render for high-traffic regions, no invention */}
        {cityCount === 0 && (
          <p style={{ color: textMuted, fontSize: '0.875rem' }}>
            Browse the parent {countryName} <Link href={parentUrl} style={{ color: red }}>directory</Link> to see hockey across the country.
          </p>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: '#0f0f0f', padding: '0.75rem 1.25rem', borderRadius: '8px', textAlign: 'center', minWidth: 90 }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#C8102E' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#666' }}>{label}</div>
    </div>
  );
}