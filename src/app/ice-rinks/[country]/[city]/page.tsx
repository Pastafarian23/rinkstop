import type { Metadata } from 'next';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ country: string; city: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { country, city } = await params;
  const cityName = city.charAt(0).toUpperCase() + city.slice(1).replace(/-/g, ' ');
  const countryName = country.charAt(0).toUpperCase() + country.slice(1).replace(/-/g, ' ');
  return {
    title: `Ice Rinks in ${cityName}`,
    description: `Hockey venues, ice rinks, and skating facilities in ${cityName}, ${countryName}.`,
    alternates: {
      canonical: `https://rinkstop.com/ice-rinks/${country}/${city}`,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `Ice Rinks in ${cityName}`,
      description: `Hockey venues, ice rinks, and skating facilities in ${cityName}, ${countryName}.`,
      url: `https://rinkstop.com/ice-rinks/${country}/${city}`,
      siteName: 'RinkStop',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Ice Rinks in ${cityName}`,
      description: `Hockey venues, ice rinks, and skating facilities in ${cityName}, ${countryName}.`,
    },
  };
}

export default async function CityRinksPage({ params }: PageProps) {
  const { country, city } = await params;
  const cityName = city.charAt(0).toUpperCase() + city.slice(1).replace(/-/g, ' ');
  const countryName = country.charAt(0).toUpperCase() + country.slice(1).replace(/-/g, ' ');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav style={{ fontSize: '0.75rem', color: '#555555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory">Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href={`/directory/${country}`}>{countryName}</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>{cityName}</span>
      </nav>

      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #222', paddingBottom: '1.5rem' }}>
        <div className="label">Local Guide</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          ICE RINKS IN {cityName.toUpperCase()}
        </h1>
        <p style={{ marginTop: '0.75rem', fontSize: '1rem', color: '#888', maxWidth: '600px' }}>
          Hockey venues, ice rinks, and skating facilities in {cityName}, {countryName}.
        </p>
      </header>

      <section style={{ marginBottom: '3rem', textAlign: 'center', padding: '3rem', background: '#111', borderRadius: '10px', border: '1px solid #222' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❄️</div>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', marginBottom: '0.75rem' }}>
          NO VENUES LISTED YET
        </h2>
        <p style={{ color: '#888', marginBottom: '1.5rem' }}>
          Know a rink in {cityName}? Help us grow the directory.
        </p>
        <Link href="/add-listing" style={{ background: '#C8102E', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '6px', textDecoration: 'none', display: 'inline-block' }}>
          Add a Venue
        </Link>
      </section>

      <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #222' }}>
        <Link href={`/directory/${country}`} style={{ color: '#C8102E', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Back to Hockey in {countryName}
        </Link>
      </div>

      <section style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)', border: '1px solid #333', borderRadius: '12px', padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          KNOW A VENUE WE'RE MISSING?
        </h2>
        <Link href="/add-listing" style={{ background: '#C8102E', color: '#fff', padding: '0.875rem 2rem', borderRadius: '6px', textDecoration: 'none', display: 'inline-block', fontWeight: 600 }}>
          Submit a Venue
        </Link>
      </section>
    </div>
  );
}
