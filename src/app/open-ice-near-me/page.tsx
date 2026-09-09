// /open-ice-near-me
//
// Top-of-funnel informational page targeting the highest-intent
// commercial search: "open ice near me", "open hockey ice near me",
// "practice ice near me", "ice for rent near me". Indexable, with
// (1) a working city-search form that 302-redirects to the right
// /ice-marketplace/{country}/{province}/{city} hub, and (2) SEO body
// copy explaining what the marketplace is and how to use it.
//
// Why this page exists: the marketplace hub is great for users who
// already know what they're looking for. This page catches the
// top-of-funnel "I just want open ice somewhere near me" intent
// and gives them a way to find their city.

import Link from 'next/link';
import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import type { CSSProperties } from 'react';

export const dynamic = 'force-dynamic';

const SITE = 'https://rinkstop.com';

export const metadata: Metadata = {
  title: 'Open Ice Near Me — Find Hockey Practice Ice by the Hour | RinkStop',
  description:
    'Find open ice time near you. Practice ice, tournament slots, and clinic ice from rinks, clubs, and teams across the U.S., Canada, and 70+ countries. Browse by city, age group, and skill level.',
  alternates: { canonical: `${SITE}/open-ice-near-me` },
  robots: { index: true, follow: true, 'max-image-preview': 'large' },
  openGraph: {
    title: 'Open Ice Near Me — Find Hockey Practice Ice by the Hour',
    description: 'Find open ice time at rinks, clubs, and teams near you. Filter by city, age group, and skill level.',
    url: `${SITE}/open-ice-near-me`,
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open Ice Near Me — Find Hockey Practice Ice by the Hour',
    description: 'Find open ice time at rinks, clubs, and teams near you.',
  },
};

const US_STATES_ABBR_FULL: Record<string, string> = {
  AL: 'alabama', AK: 'alaska', AZ: 'arizona', AR: 'arkansas', CA: 'california',
  CO: 'colorado', CT: 'connecticut', DE: 'delaware', FL: 'florida', GA: 'georgia',
  HI: 'hawaii', ID: 'idaho', IL: 'illinois', IN: 'indiana', IA: 'iowa',
  KS: 'kansas', KY: 'kentucky', LA: 'louisiana', ME: 'maine', MD: 'maryland',
  MA: 'massachusetts', MI: 'michigan', MN: 'minnesota', MS: 'mississippi', MO: 'missouri',
  MT: 'montana', NE: 'nebraska', NV: 'nevada', NH: 'new-hampshire', NJ: 'new-jersey',
  NM: 'new-mexico', NY: 'new-york', NC: 'north-carolina', ND: 'north-dakota', OH: 'ohio',
  OK: 'oklahoma', OR: 'oregon', PA: 'pennsylvania', RI: 'rhode-island', SC: 'south-carolina',
  SD: 'south-dakota', TN: 'tennessee', TX: 'texas', UT: 'utah', VT: 'vermont',
  VA: 'virginia', WA: 'washington', WV: 'west-virginia', WI: 'wisconsin', WY: 'wyoming',
  DC: 'district-of-columbia',
};

const CA_PROVINCES_FULL: Record<string, string> = {
  AB: 'alberta', BC: 'british-columbia', MB: 'manitoba', NB: 'new-brunswick',
  NL: 'newfoundland-and-labrador', NS: 'nova-scotia', NT: 'northwest-territories',
  NU: 'nunavut', ON: 'ontario', PE: 'prince-edward-island', QC: 'quebec',
  SK: 'saskatchewan', YT: 'yukon',
};

const COUNTRY_SLUGS: Record<string, string> = {
  'united states': 'united-states',
  usa: 'united-states',
  us: 'united-states',
  canada: 'canada',
  ca: 'canada',
};

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

function citySlug(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function provinceSlugFromAbbrOrFull(input: string): string | null {
  if (!input) return null;
  const upper = input.toUpperCase();
  if (US_STATES_ABBR_FULL[upper]) return US_STATES_ABBR_FULL[upper];
  if (CA_PROVINCES_FULL[upper]) return CA_PROVINCES_FULL[upper];
  // Already a slug?
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || null;
}

interface PageProps {
  searchParams: Promise<{ city?: string; state?: string; country?: string; q?: string }>;
}

export default async function OpenIceNearMePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const query = (sp.q || sp.city || '').trim();
  const stateInput = (sp.state || '').trim();
  const countryInput = (sp.country || '').trim();

  // If the user has provided a city (and maybe state/country), try to
  // resolve to a known city hub and 302-redirect. This is a server
  // component, so we use the `redirect()` helper.
  let resolvedTarget: string | null = null;
  let suggestedCities: Array<{ city: string; state: string | null; country: string; href: string; listingCount: number }> = [];

  if (query) {
    const { data: rinks } = await supabaseAdmin
      .from('rinks')
      .select('city, province_state, country')
      .eq('is_active', true)
      .ilike('city', query)
      .limit(20);

    const stateSlug = provinceSlugFromAbbrOrFull(stateInput);
    const countrySlug = countryInput ? COUNTRY_SLUGS[countryInput.toLowerCase()] || countryInput.toLowerCase() : null;

    if (rinks && rinks.length > 0) {
      // Pick the best match: prefer the one whose country matches countrySlug and state matches stateSlug
      const ranked = rinks
        .map((r) => {
          const rCountry = (r.country || '').toLowerCase();
          const rProvince = (r.province_state || '').toLowerCase();
          const rCountrySlug = COUNTRY_SLUGS[rCountry] || rCountry.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const rProvinceSlug = US_STATES_ABBR_FULL[r.province_state || ''] ||
            CA_PROVINCES_FULL[r.province_state || ''] ||
            rProvince.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          let score = 0;
          if (countrySlug && rCountrySlug === countrySlug) score += 10;
          if (stateSlug && rProvinceSlug === stateSlug) score += 20;
          if (rCountry === 'united states' || rCountry === 'canada') score += 5;
          return { r, rCountrySlug, rProvinceSlug, score };
        })
        .sort((a, b) => b.score - a.score);

      if (ranked.length > 0) {
        const top = ranked[0];
        // If the country is US/CA, link to the 3-segment URL. Otherwise /cities/.
        if (top.rCountrySlug === 'united-states' || top.rCountrySlug === 'canada') {
          resolvedTarget = `/ice-marketplace/${top.rCountrySlug}/${top.rProvinceSlug}/${citySlug(top.r.city)}`;
        } else if (top.rCountrySlug) {
          resolvedTarget = `/ice-marketplace/${top.rCountrySlug}/cities/${citySlug(top.r.city)}`;
        } else {
          resolvedTarget = `/ice-marketplace`;
        }
      }

      // Also collect up to 6 suggested cities to show in the "we found" list
      for (const { r, rCountrySlug, rProvinceSlug } of ranked.slice(0, 6)) {
        const href = (rCountrySlug === 'united-states' || rCountrySlug === 'canada')
          ? `/ice-marketplace/${rCountrySlug}/${rProvinceSlug}/${citySlug(r.city)}`
          : `/ice-marketplace/${rCountrySlug}/cities/${citySlug(r.city)}`;
        suggestedCities.push({
          city: r.city,
          state: r.province_state,
          country: r.country,
          href,
          listingCount: 0,
        });
      }

      // If we have a hard match on (city, state, country), redirect immediately
      if (resolvedTarget && countrySlug && stateSlug) {
        const { redirect } = await import('next/navigation');
        redirect(resolvedTarget);
      }
    }
  }

  // JSON-LD: FAQ schema for rich snippet eligibility
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How do I find open ice near me?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Use RinkStop\'s ice marketplace. Type your city in the search above, or browse the directory by country and province. Every city hub shows open ice slots from rinks, clubs, and teams near you.',
        },
      },
      {
        '@type': 'Question',
        name: 'How much does open ice cost?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Open ice is listed by the hour. Prices range from under $100/hour for off-peak practice ice at small rinks to $300+/hour for prime-time slots at large arenas. Each listing shows the exact price; you can filter by your budget when browsing.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need an account to book ice?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No account is required to inquire about a listing. Click "Request to book" on any open ice slot, fill in your name and email, and the rink owner will reply directly.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I list my rink\'s open ice?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Rinks, clubs, and teams can list their open ice for free. Founding partners pay 0% take-rate for the first 6 months. Apply at rinkstop.com/launch.',
        },
      },
    ],
  };

  // Breadcrumb
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Open Ice Near Me', item: `${SITE}/open-ice-near-me` },
    ],
  };

  return (
    <main
      data-page="open-ice-near-me"
      style={{ background: '#0F172A', color: '#fff', minHeight: '100vh', padding: '2rem 1rem 4rem' }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Home</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: '#FFB81C' }}>Open Ice Near Me</span>
        </nav>

        <h1
          data-oi-h1="near-me"
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            color: '#fff',
            margin: '0 0 0.5rem',
            letterSpacing: '0.02em',
            lineHeight: 1.1,
          }}
        >
          Open Ice Near Me
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '1.1rem', maxWidth: 640, margin: '0 0 1.5rem' }}>
          Find open practice ice, tournament slots, and clinic ice at rinks, clubs, and teams near you.
          Type your city below to find open ice in your area.
        </p>

        {/* Search form */}
        <form
          method="GET"
          action="/open-ice-near-me"
          data-oi-search="true"
          style={{
            background: '#0a1a36',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.875rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <label htmlFor="q" style={labelStyle}>City</label>
            <input
              id="q"
              name="q"
              type="text"
              defaultValue={query}
              required
              placeholder="e.g. Toronto, Denver, Stockholm"
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="state" style={labelStyle}>State / Province (optional)</label>
            <input
              id="state"
              name="state"
              type="text"
              defaultValue={stateInput}
              placeholder="e.g. ON, California, Alberta"
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="country" style={labelStyle}>Country (optional)</label>
            <input
              id="country"
              name="country"
              type="text"
              defaultValue={countryInput}
              placeholder="e.g. USA, Canada, Sweden"
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="submit"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: '#C8102E',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: '0.9375rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Find open ice →
            </button>
          </div>
        </form>

        {/* Suggestion list (when user has searched) */}
        {suggestedCities.length > 0 && (
          <div
            data-oi-suggestions="true"
            style={{
              background: 'rgba(13,17,23,0.6)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            <h2
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: '1.25rem',
                color: '#fff',
                margin: '0 0 0.75rem',
                letterSpacing: '0.04em',
              }}
            >
              Open ice in {titleCase(query)}
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: '0 0 1rem' }}>
              {suggestedCities.length} {suggestedCities.length === 1 ? 'city matches' : 'cities match'} your search. Click a city to see open ice:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
              {suggestedCities.map((s, i) => (
                <li key={`${s.city}-${i}`}>
                  <Link
                    href={s.href}
                    data-oi-suggestion={s.city}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: 'rgba(56,189,248,0.08)',
                      border: '1px solid rgba(56,189,248,0.3)',
                      borderRadius: 6,
                      color: '#7DD3FC',
                      textDecoration: 'none',
                      fontSize: '0.95rem',
                    }}
                  >
                    <span>
                      <strong style={{ color: '#fff' }}>{s.city}</strong>
                      {s.state ? `, ${s.state}` : ''}
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}> · {s.country}</span>
                    </span>
                    <span style={{ color: '#38BDF8' }}>View open ice →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* SEO body */}
        <section
          data-oi-seo="true"
          style={{
            marginTop: '2rem',
            padding: '2rem 0',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
          }}
        >
          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', letterSpacing: '0.04em', color: '#fff', margin: '0 0 0.75rem' }}>
            How to find open ice near you
          </h2>
          <p>
            RinkStop lists every open ice slot at rinks, hockey clubs, and teams across the United States, Canada,
            and 70+ other countries. To find open ice near you, search by city above, or browse the{' '}
            <Link href="/ice-marketplace" style={{ color: '#38BDF8', textDecoration: 'underline' }}>full marketplace</Link>.
            Each city hub shows every open slot with the rink, the time, the price, the skill level, and the age
            group. Click any listing to send the rink owner a direct booking inquiry.
          </p>

          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', letterSpacing: '0.04em', color: '#fff', margin: '1.5rem 0 0.75rem' }}>
            What kinds of open ice are available?
          </h2>
          <p>
            Most open ice on RinkStop falls into one of these categories:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1rem' }}>
            <li><strong>Practice ice</strong> — the most common type. Off-peak hours when rinks aren&apos;t running programs. Perfect for team practices, skills sessions, and private coaching.</li>
            <li><strong>Tournament ice</strong> — multi-day blocks for tournaments, showcases, and tryouts.</li>
            <li><strong>Camps and clinics</strong> — full-day or partial-day ice for hockey schools and development programs.</li>
            <li><strong>Game ice</strong> — for leagues or exhibition games, usually prime-time evenings and weekends.</li>
            <li><strong>Open pickup</strong> — public stick time, often adult-league oriented.</li>
          </ul>

          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', letterSpacing: '0.04em', color: '#fff', margin: '1.5rem 0 0.75rem' }}>
            How much does open ice cost?
          </h2>
          <p>
            Open ice is priced by the hour, set by the rink or club listing it. Prices vary by city, time of day,
            and slot type. A few rough ranges:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1rem' }}>
            <li><strong>Off-peak practice ice</strong> in smaller markets: $80&ndash;$150/hour</li>
            <li><strong>Prime-time evening/weekend</strong> at suburban rinks: $150&ndash;$300/hour</li>
            <li><strong>Tournament and showcase ice</strong> in major markets: $250&ndash;$500+/hour</li>
          </ul>
          <p>
            Each listing on the marketplace shows the exact price. You can filter the{' '}
            <Link href="/ice-marketplace" style={{ color: '#38BDF8', textDecoration: 'underline' }}>full marketplace</Link>
            {' '}by slot type to find the right fit.
          </p>

          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', letterSpacing: '0.04em', color: '#fff', margin: '1.5rem 0 0.75rem' }}>
            How do I book a slot?
          </h2>
          <p>
            Booking is a 3-step process. (1) Find a slot in your city. (2) Click &ldquo;Request to book&rdquo; on the
            listing and fill in your name, email, and a short note about your team or group. (3) The rink owner
            replies within 1 business day with availability, exact pricing, and a payment link. You don&apos;t need
            a RinkStop account to inquire.
          </p>
        </section>

        {/* Big country links for SEO crawl depth */}
        <section
          data-oi-countries="true"
          style={{
            marginTop: '2.5rem',
            padding: '2rem',
            background: 'rgba(13,17,23,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
          }}
        >
          <h2
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: '1.5rem',
              letterSpacing: '0.04em',
              color: '#fff',
              margin: '0 0 0.75rem',
            }}
          >
            Browse by country
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: '0 0 1rem' }}>
            RinkStop has rinks in 78+ countries. Pick one to see open ice:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem' }}>
            {[
              { slug: 'united-states', name: 'United States' },
              { slug: 'canada', name: 'Canada' },
              { slug: 'sweden', name: 'Sweden' },
              { slug: 'finland', name: 'Finland' },
              { slug: 'czech-republic', name: 'Czech Republic' },
              { slug: 'russia', name: 'Russia' },
              { slug: 'germany', name: 'Germany' },
              { slug: 'switzerland', name: 'Switzerland' },
              { slug: 'austria', name: 'Austria' },
              { slug: 'slovakia', name: 'Slovakia' },
              { slug: 'japan', name: 'Japan' },
              { slug: 'australia', name: 'Australia' },
            ].map((c) => (
              <Link
                key={c.slug}
                href={`/ice-marketplace/${c.slug}`}
                data-oi-country={c.slug}
                style={{
                  display: 'block',
                  padding: '0.625rem 0.875rem',
                  background: 'rgba(56,189,248,0.08)',
                  border: '1px solid rgba(56,189,248,0.25)',
                  borderRadius: 6,
                  color: '#7DD3FC',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </main>
  );
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.7)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '0.375rem',
};

const inputStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.625rem 0.75rem',
  background: '#0f1e3a',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  color: '#fff',
  fontSize: '0.9375rem',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};
