import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  FEDERATIONS,
  lookupFederation,
  type Federation,
} from '@/lib/federations';
import { countryToSlug } from '@/lib/country-page';
import HockeyCanadaAd from '@/components/HockeyCanadaAd';

interface PageProps {
  params: Promise<{ country: string }>;
}

const COUNTRY_NAME_TO_CODE: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const f of FEDERATIONS) {
    // Map by country name (case-insensitive) and by the canonical slug from countryToSlug.
    m[f.countryName.toLowerCase()] = f.countryCode;
  }
  return m;
})();

function resolveCountryCode(slug: string): string | null {
  const normalized = decodeURIComponent(slug).toLowerCase().trim();
  // Try direct country name match (e.g. "canada", "Canada")
  if (COUNTRY_NAME_TO_CODE[normalized]) {
    return COUNTRY_NAME_TO_CODE[normalized];
  }
  // Try canonical slug from countryToSlug (e.g. "united-states" -> "United States")
  // countryToSlug accepts the country name; try common transformations.
  const titleCased = normalized
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
  if (COUNTRY_NAME_TO_CODE[titleCased.toLowerCase()]) {
    return COUNTRY_NAME_TO_CODE[titleCased.toLowerCase()];
  }
  return null;
}

function resolveFederation(slug: string): Federation | null {
  const code = resolveCountryCode(slug);
  if (!code) return null;
  return lookupFederation(code);
}

export async function generateStaticParams() {
  return FEDERATIONS.map((f) => ({
    country: countryToSlug(f.countryName),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country } = await params;
  const fed = resolveFederation(country);
  if (!fed) return { title: 'Federation Not Found' };

  return {
    title: (() => {
      // Improvements-everywhere (2026-08-19): cap at 60 chars for Google SERP preview.
      const base = `${fed.federationName} — ${fed.countryName}`;
      return base.length > 60 ? base.slice(0, 57) + '...' : base;
    })(),
    description: `${fed.federationName} is the national ice hockey federation for ${fed.countryName}. ${fed.ageGroupNote} Registration, insurance, safeguarding, and required documents for players, coaches, and teams.`,
    alternates: {
      canonical: `https://rinkstop.com/federations/${countryToSlug(fed.countryName)}`,
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${fed.federationName} — ${fed.countryName}`,
      description: `Official national hockey federation for ${fed.countryName}.`,
      url: `https://rinkstop.com/federations/${countryToSlug(fed.countryName)}`,
      siteName: 'RinkStop',
      type: 'website',
    },
  };
}

export const revalidate = 3600;
export const dynamicParams = true;

export default async function FederationPage({ params }: PageProps) {
  const { country } = await params;
  const fed = resolveFederation(country);
  if (!fed) return notFound();

  const canonicalCountry = countryToSlug(fed.countryName);

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0 0.4rem' }}>›</span>
        <Link href={`/directory/${canonicalCountry}`} style={{ color: '#555' }}>
          {fed.countryName}
        </Link>
        <span style={{ margin: '0 0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>{fed.federationName}</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', paddingTop: '1.5rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.5rem' }}>
          National Hockey Federation
        </div>
        <h1
          className="font-sport"
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            color: '#fff',
            letterSpacing: '0.02em',
            lineHeight: 1.05,
          }}
        >
          {fed.federationName}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          {fed.countryName} national ice hockey federation. {fed.ageGroupNote}
        </p>
      </div>

      {/* Hockey Canada affiliate ad — only on the Canada federation page */}
      {fed.countryCode === 'CA' && <HockeyCanadaAd size="300x250" />}

      {/* Federation overview */}
      <section
        style={{
          background: 'var(--s2)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px 28px',
          marginBottom: '2rem',
        }}
      >
        <h2
          className="font-sport"
          style={{
            fontSize: '1.5rem',
            color: '#fff',
            letterSpacing: '0.04em',
            marginBottom: '1rem',
          }}
        >
          About {fed.federationName}
        </h2>
        <dl style={{ display: 'grid', gap: '0.875rem', margin: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', alignItems: 'baseline' }}>
            <dt style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Country
            </dt>
            <dd style={{ margin: 0, color: '#fff', fontSize: '0.9375rem' }}>
              <Link href={`/directory/${canonicalCountry}`} style={{ color: '#C8102E', textDecoration: 'none' }}>
                {fed.countryName} →
              </Link>
            </dd>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', alignItems: 'baseline' }}>
            <dt style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Federation
            </dt>
            <dd style={{ margin: 0, color: '#fff', fontSize: '0.9375rem' }}>
              <a href={fed.federationUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#C8102E', textDecoration: 'none' }}>
                {fed.federationUrl} ↗
              </a>
            </dd>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', alignItems: 'baseline' }}>
            <dt style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Governing Body
            </dt>
            <dd style={{ margin: 0, color: '#fff', fontSize: '0.9375rem' }}>{fed.governingBody}</dd>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', alignItems: 'baseline' }}>
            <dt style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Safeguarding
            </dt>
            <dd style={{ margin: 0, color: '#fff', fontSize: '0.9375rem' }}>
              {fed.safeguardingBody}
              {fed.safeguardingUrl && fed.safeguardingUrl !== fed.federationUrl && (
                <>
                  {' · '}
                  <a href={fed.safeguardingUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#C8102E', textDecoration: 'none', fontSize: '0.875rem' }}>
                    Safety program ↗
                  </a>
                </>
              )}
            </dd>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', alignItems: 'baseline' }}>
            <dt style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Age Categories
            </dt>
            <dd style={{ margin: 0, color: '#fff', fontSize: '0.9375rem' }}>{fed.ageGroupNote}</dd>
          </div>
        </dl>
      </section>

      {/* Required documents for team registration */}
      <section style={{ marginBottom: '2rem' }}>
        <h2
          className="font-sport"
          style={{
            fontSize: '1.5rem',
            color: '#fff',
            letterSpacing: '0.04em',
            marginBottom: '1rem',
            borderLeft: '4px solid #C8102E',
            paddingLeft: '14px',
          }}
        >
          Required Documents for Registration
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', lineHeight: 1.65, marginBottom: '1rem' }}>
          Players, coaches, and team staff registering with {fed.federationName} typically need the following documents. Always confirm with your local club or provincial association for the latest requirements.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '10px',
          }}
        >
          {fed.requiredDocKinds.map((doc) => (
            <div
              key={doc.kind}
              style={{
                background: 'var(--s2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px 16px',
              }}
            >
              <div style={{ fontSize: '0.6875rem', color: '#C8102E', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
                {doc.kind.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#fff', marginBottom: '6px', lineHeight: 1.3 }}>
                {doc.label}
              </div>
              {doc.note && (
                <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  {doc.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Back to country + federation links */}
      <section
        style={{
          background: 'var(--s2)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '1.5rem 2rem',
          marginTop: '1rem',
        }}
      >
        <h2
          className="font-sport"
          style={{
            fontSize: '1.25rem',
            color: '#fff',
            letterSpacing: '0.04em',
            marginBottom: '0.75rem',
          }}
        >
          Related Links
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
          <a
            href={fed.federationUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#C8102E', textDecoration: 'none' }}
          >
            {fed.federationName} official site →
          </a>
          <Link href={`/directory/${canonicalCountry}`} style={{ color: '#C8102E', textDecoration: 'none' }}>
            Hockey in {fed.countryName} →
          </Link>
          <Link href="/directory/international/iihf" style={{ color: '#C8102E', textDecoration: 'none' }}>
            About the IIHF →
          </Link>
        </div>
      </section>
    </main>
  );
}