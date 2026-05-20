import { Metadata } from 'next';
import Link from 'next/link';

// Force dynamic rendering - page fetches live data from API
export const dynamic = 'force-dynamic';

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CA: 'Canada', SE: 'Sweden', FI: 'Finland',
  RU: 'Russia', DE: 'Germany', CH: 'Switzerland', CZ: 'Czech Republic',
  SK: 'Slovakia', AT: 'Austria', GB: 'United Kingdom', FR: 'France',
  DK: 'Denmark', NO: 'Norway', IT: 'Italy', PL: 'Poland', BY: 'Belarus',
  UA: 'Ukraine', KZ: 'Kazakhstan', SI: 'Slovenia', HU: 'Hungary',
  LV: 'Latvia', LT: 'Lithuania', EE: 'Estonia', NL: 'Netherlands',
  BE: 'Belgium', ES: 'Spain', PT: 'Portugal', IE: 'Ireland',
  AU: 'Australia', NZ: 'New Zealand', JP: 'Japan', TR: 'Turkey',
  World: 'International', EU: 'Europe'
};

export const metadata: Metadata = {
  title: 'Global Hockey Leagues & Teams Directory | RinkStop',
  description: 'Browse hockey leagues and teams from 30+ countries worldwide. NHL, SHL, Liiga, KHL, DEL, and more. Complete standings, schedules, and team information.',
  alternates: {
    canonical: 'https://rinkstop.com/hockey',
  },
};

export default async function HockeyPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
  const res = await fetch(`${baseUrl}/api/hockey/countries`, { 
    next: { revalidate: 3600 }
  });
  const result = await res.json();
  const countries = result?.countries || [];
  
  // Group by region
  const majorHockeyCountries = countries.filter((c: any) => 
    ['US', 'CA', 'SE', 'FI', 'RU', 'DE', 'CH', 'CZ', 'SK', 'GB'].includes(c.code)
  );
  
  const otherCountries = countries.filter((c: any) => 
    !['US', 'CA', 'SE', 'FI', 'RU', 'DE', 'CH', 'CZ', 'SK', 'GB', 'World', 'EU'].includes(c.code)
  );
  
  const international = countries.filter((c: any) => 
    ['World', 'EU'].includes(c.code)
  );
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Global Hockey Leagues & Teams</h1>
          <p className="text-xl text-blue-200">
            {countries.length} leagues across {countries.length} countries
          </p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Major Hockey Nations */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Major Hockey Nations</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {majorHockeyCountries.map((country: any) => (
              <Link
                key={country.code}
                href={`/hockey/${country.code.toLowerCase()}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-5 border-t-4 border-blue-600"
              >
                <h3 className="font-bold text-lg text-gray-900">{country.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {country.leagueCount} {country.leagueCount === 1 ? 'league' : 'leagues'}
                </p>
                <div className="mt-2 text-xs text-gray-400">
                  {country.leagues.slice(0, 3).map((l: any) => l.name).join(', ')}
                  {country.leagueCount > 3 && ` +${country.leagueCount - 3} more`}
                </div>
              </Link>
            ))}
          </div>
        </section>
        
        {/* Europe */}
        {otherCountries.filter((c: any) => ['AT', 'FR', 'DK', 'NO', 'IT', 'PL', 'SI', 'HU', 'LV', 'LT', 'EE', 'NL', 'BE'].includes(c.code)).length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Europe</h2>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {otherCountries
                .filter((c: any) => ['AT', 'FR', 'DK', 'NO', 'IT', 'PL', 'SI', 'HU', 'LV', 'LT', 'EE', 'NL', 'BE'].includes(c.code))
                .map((country: any) => (
                  <Link
                    key={country.code}
                    href={`/hockey/${country.code.toLowerCase()}`}
                    className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4"
                  >
                    <h3 className="font-semibold text-gray-900">{country.name}</h3>
                    <p className="text-sm text-gray-500">{country.leagueCount} leagues</p>
                  </Link>
                ))}
            </div>
          </section>
        )}
        
        {/* Rest of World */}
        {otherCountries.filter((c: any) => !['AT', 'FR', 'DK', 'NO', 'IT', 'PL', 'SI', 'HU', 'LV', 'LT', 'EE', 'NL', 'BE'].includes(c.code)).length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">More Countries</h2>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {otherCountries
                .filter((c: any) => !['AT', 'FR', 'DK', 'NO', 'IT', 'PL', 'SI', 'HU', 'LV', 'LT', 'EE', 'NL', 'BE', 'World', 'EU'].includes(c.code))
                .map((country: any) => (
                  <Link
                    key={country.code}
                    href={`/hockey/${country.code.toLowerCase()}`}
                    className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4"
                  >
                    <h3 className="font-semibold text-gray-900">{country.name}</h3>
                    <p className="text-sm text-gray-500">{country.leagueCount} leagues</p>
                  </Link>
                ))}
            </div>
          </section>
        )}
        
        {/* Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: "Global Hockey Leagues Directory",
              description: "Browse hockey leagues and teams from 30+ countries worldwide",
              url: "https://rinkstop.com/hockey",
            })
          }}
        />
      </div>
    </div>
  );
}