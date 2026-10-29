import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  FEDERATIONS,
  lookupFederation,
  type Federation,
} from '@/lib/federations';
import { countryToSlug } from '@/lib/country-page';
import { withDefaultOg } from '@/lib/metadata-defaults';
import { shortenSercTitle } from '@/lib/seo-title';
import {
  getFederationByCountryCode,
  getFederationBySlug,
  getFederationMembers,
} from '@/lib/federation-ownership';

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

/**
 * Resolve the DB federation row for a URL segment.
 *
 * Two shapes are accepted, because the federation dashboard links to the DB
 * slug (`/federations/in`) while the sitemap and the historical URLs use the
 * country slug (`/federations/india`). Both must resolve to the same page.
 */
async function resolveDbFederation(slug: string) {
  const bySlug = await getFederationBySlug(slug);
  if (bySlug) return bySlug;
  const code = resolveCountryCode(slug);
  if (!code) return null;
  return getFederationByCountryCode(code);
}

/**
 * Resolve BOTH the static IIHF reference row and the DB row for a URL segment.
 *
 * The static table is keyed by country code, so the DB row is the bridge: a
 * DB slug (`in`) gives us the country code (`IN`), which gives us the static
 * row. If there is no DB row, the country name in the URL is all we have.
 */
async function resolveFederationPage(slug: string) {
  const dbFed = await resolveDbFederation(slug);

  let code = dbFed?.country_code || null;
  if (!code) code = resolveCountryCode(slug);

  const staticFed = code ? lookupFederation(code) : null;
  return { dbFed, staticFed };
}

// 2026-10-10: Removed generateStaticParams to fix Vercel build timeout.
// With 84 country pages each running at build time, the build worker hit
// the 60s-per-page budget × 3-attempt retry. Now the page is rendered on
// first request (dynamicParams=true) and cached for 1 hour (revalidate=3600).
// The page is data-only (no Supabase), so first-render cost is minimal.
//
// To revert (re-enable build-time pre-render): uncomment the function below.
// export async function generateStaticParams() {
//   return FEDERATIONS.map((f) => ({
//     country: countryToSlug(f.countryName),
//   }));
// }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country } = await params;
  const { dbFed, staticFed } = await resolveFederationPage(country);
  const fed = staticFed;
  if (!fed) return { title: 'Federation Not Found' };

  const displayName = dbFed?.name?.trim() || fed.federationName;

  // 2026-10-23 (GSC title pass): the old code hard-truncated at 57 chars and
  // appended "...", which produced titles that read as broken text in the SERP
  // ("ÖEHV — Österreichischer Eishockeyverband — Au..."). It also ignored the
  // layout's " | RinkStop" template suffix, so the FINAL title was ~11 chars
  // longer than the 60-char budget it thought it was enforcing.
  //
  // shortenSercTitle drops trailing clauses at natural boundaries instead, and
  // budgets against the FINAL rendered length.
  const fedTitle = `${displayName} — ${fed.countryName}`;
  const title = shortenSercTitle(fedTitle);

  return {
    title,
    description: `${displayName} is the national ice hockey federation for ${fed.countryName}. ${fed.ageGroupNote} Registration, insurance, safeguarding, and required documents for players, coaches, and teams.`,
    alternates: {
      canonical: `https://rinkstop.com/federations/${countryToSlug(fed.countryName)}`,
    },
    robots: { index: true, follow: true },
    openGraph: withDefaultOg({
      title: `${displayName} — ${fed.countryName}`,
      description: `Official national hockey federation for ${fed.countryName}.`,
      url: `https://rinkstop.com/federations/${countryToSlug(fed.countryName)}`,
      siteName: 'RinkStop',
      type: 'website',
    }),
  };
}

export const revalidate = 3600;
export const dynamicParams = true;

export default async function FederationPage({ params }: PageProps) {
  const { country } = await params;
  const { dbFed, staticFed: fed } = await resolveFederationPage(country);
  if (!fed) return notFound();

  const canonicalCountry = countryToSlug(fed.countryName);

  // DB-driven overlay (2026-10-29): anything a federation admin has claimed
  // and edited (name, description, logo, website, contact) plus the member
  // leagues and clubs they have linked. The static IIHF table above remains
  // the fallback for everything the DB does not have yet.
  const members = dbFed ? await getFederationMembers(dbFed.id) : { leagues: [], clubs: [] };

  const displayName = dbFed?.name?.trim() || fed.federationName;
  const description = dbFed?.description?.trim() || '';
  const logoUrl = dbFed?.logo_url?.trim() || '';
  const websiteUrl = dbFed?.website_url?.trim() || fed.federationUrl;
  const contactEmail = dbFed?.contact_email?.trim() || '';
  const contactPhone = dbFed?.contact_phone?.trim() || '';
  const isClaimed = Boolean(dbFed?.owner_user_id);

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: 'rgba(255,255,255,0.4)' }}>Directory</Link>
        <span style={{ margin: '0 0 0.4rem' }}>›</span>
        <Link href={`/directory/${canonicalCountry}`} style={{ color: 'rgba(255,255,255,0.4)' }}>
          {fed.countryName}
        </Link>
        <span style={{ margin: '0 0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{displayName}</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', paddingTop: '1.5rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.5rem' }}>
          National Hockey Federation
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, background: '#fff' }}
            />
          ) : null}
          <h1
            className="font-sport"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: '#fff',
              letterSpacing: '0.02em',
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            {displayName}
          </h1>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          {fed.countryName} national ice hockey federation. {fed.ageGroupNote}
        </p>
        {isClaimed ? (
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', marginTop: '0.4rem' }}>
            <span style={{ color: '#14B8A6' }}>●</span> Managed by {displayName} on RinkStop.
          </p>
        ) : null}
      </div>

      {/* Hockey Canada affiliate ad — only on the Canada federation page */}

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
          About {displayName}
        </h2>
        {description ? (
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
            {description}
          </p>
        ) : null}
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
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#C8102E', textDecoration: 'none' }}>
                {websiteUrl} ↗
              </a>
            </dd>
          </div>
          {contactEmail ? (
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', alignItems: 'baseline' }}>
              <dt style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Contact
              </dt>
              <dd style={{ margin: 0, color: '#fff', fontSize: '0.9375rem' }}>
                <a href={`mailto:${contactEmail}`} style={{ color: '#C8102E', textDecoration: 'none' }}>
                  {contactEmail}
                </a>
                {contactPhone ? (
                  <span style={{ color: 'rgba(255,255,255,0.55)' }}> · {contactPhone}</span>
                ) : null}
              </dd>
            </div>
          ) : null}
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

      {/* Member leagues and clubs — populated by the federation admin */}
      {(members.leagues.length > 0 || members.clubs.length > 0) ? (
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
            Member Leagues &amp; Clubs
          </h2>
          {members.leagues.length > 0 ? (
            <>
              <h3 style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.75rem' }}>
                Leagues
              </h3>
              <ul style={{ listStyle: 'none', margin: '0 0 1.5rem', padding: 0, display: 'grid', gap: '0.5rem' }}>
                {members.leagues.map((l) => (
                  <li key={String(l.id)} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.7rem 0.95rem' }}>
                    <Link
                      href={`/directory/leagues/${String(l.slug)}`}
                      style={{ color: '#fff', fontWeight: 700, fontSize: '0.9375rem', textDecoration: 'none' }}
                    >
                      {String(l.name)}
                    </Link>
                    {l.level ? (
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', marginLeft: '0.6rem' }}>
                        {String(l.level)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {members.clubs.length > 0 ? (
            <>
              <h3 style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.75rem' }}>
                Clubs
              </h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.5rem' }}>
                {members.clubs.map((c) => (
                  <li key={String(c.id)} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.7rem 0.95rem' }}>
                    <Link
                      href={`/directory/teams/${String(c.slug)}`}
                      style={{ color: '#fff', fontWeight: 700, fontSize: '0.9375rem', textDecoration: 'none' }}
                    >
                      {String(c.name)}
                    </Link>
                    {c.home_city ? (
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', marginLeft: '0.6rem' }}>
                        {String(c.home_city)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

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
          Players, coaches, and team staff registering with {displayName} typically need the following documents. Always confirm with your local club or provincial association for the latest requirements.
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
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#C8102E', textDecoration: 'none' }}
          >
            {displayName} official site →
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
