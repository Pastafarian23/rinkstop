import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Rink {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website_url?: string;
  notes?: string;
  slug?: string;
}

interface Team {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string;
}

// EIHL teams for cross-referencing
const UK_EIHL_TEAMS = [
  { name: 'Sheffield Steelers', city: 'Sheffield', website: 'https://www.sheffieldsteels.com' },
  { name: 'Cardiff Devils', city: 'Cardiff', website: 'https://www.cardiffdevils.com' },
  { name: 'Nottingham Panthers', city: 'Nottingham' },
  { name: 'Coventry Blaze', city: 'Coventry' },
  { name: 'Belfast Giants', city: 'Belfast' },
  { name: 'Guildford Flames', city: 'Guildford' },
  { name: 'Coventry Blaze', city: 'Coventry' },
  { name: 'Manchester Storm', city: 'Manchester' },
  { name: 'Milton Keynes Lightning', city: 'Milton Keynes' },
  { name: 'Bradford Bulldogs', city: 'Bradford' },
  { name: 'Peterborough Phantoms', city: 'Peterborough' },
];

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city: citySlug } = await params;
  const cityName = citySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return {
    title: `${cityName} Hockey - Ice Rinks & Teams | RinkStop`,
    description: `Find hockey teams and ice rinks in ${cityName}, United Kingdom. Discover local EIHL teams, NIHL clubs, and skating facilities.`,
    alternates: {
      canonical: `https://rinkstop.com/directory/united-kingdom/${citySlug}`,
    },
  };
}

export const dynamic = 'force-dynamic';

export default async function UKCityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: citySlug } = await params;
  const cityName = citySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  // Get rinks in this city
  const { data: rinksData } = await supabase
    .from('rinks')
    .select('id, name, slug, address, phone, website_url, notes')
    .eq('country', 'United Kingdom')
    .eq('is_active', true)
    .ilike('city', `%${cityName}%`)
    .order('name');

  // Get teams in this city
  const { data: teamsData } = await supabase
    .from('teams')
    .select('id, name, slug, logo_url')
    .eq('country', 'United Kingdom')
    .eq('is_active', true)
    .ilike('city', `%${cityName}%`)
    .order('name');

  const rinksList = (rinksData || []) as Rink[];
  const teamsList = (teamsData || []) as Team[];

  // Find EIHL team for this city
  const eihlTeam = UK_EIHL_TEAMS.find(t => t.city.toLowerCase() === cityName.toLowerCase());

  // Schema markup
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com' },
      { '@type': 'ListItem', position: 2, name: 'Directory', item: 'https://rinkstop.com/directory' },
      { '@type': 'ListItem', position: 3, name: 'United Kingdom', item: 'https://rinkstop.com/directory/united-kingdom' },
      { '@type': 'ListItem', position: 4, name: cityName, item: `https://rinkstop.com/directory/united-kingdom/${citySlug}` },
    ],
  };

  // SportsVenue schema for rinks
  const venueSchemas = rinksList.map(rink => ({
    '@type': 'SportsVenue',
    '@id': `https://rinkstop.com/directory/rinks/${rink.slug || rink.id}`,
    name: rink.name,
    address: rink.address ? {
      '@type': 'PostalAddress',
      addressLocality: cityName,
      addressCountry: 'GB',
      streetAddress: rink.address,
    } : undefined,
    telephone: rink.phone,
    url: rink.website_url,
  }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {venueSchemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: '#555555', padding: '1.5rem 0 0', marginBottom: '0' }}>
          <Link href="/" style={{ color: '#555555' }}>Home</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/directory" style={{ color: '#555555' }}>Directory</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/directory/united-kingdom" style={{ color: '#555555' }}>United Kingdom</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: '#A0A0A0' }}>{cityName}</span>
        </nav>

        <div style={{ marginBottom: '2rem', paddingTop: '1.5rem' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.5rem' }}>
            United Kingdom
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.75rem' }}>
            {cityName} Hockey
          </h1>

          <p style={{ color: '#555', fontSize: '1.0625rem', lineHeight: 1.7, maxWidth: '800px', marginBottom: '1rem' }}>
            {cityName} is home to {rinksList.length} ice {rinksList.length === 1 ? 'rink' : 'rinks'}{teamsList.length > 0 ? ` and ${teamsList.length} hockey ${teamsList.length === 1 ? 'team' : 'teams'}` : ''}.
            {eihlTeam ? ` The city hosts ${eihlTeam.name} in the Elite Ice Hockey League (EIHL).` : ''}
            {' '}Browse listings below or <Link href="/add-listing" style={{ color: '#C8102E', fontWeight: 600 }}>add a listing</Link> if we&apos;re missing something.
          </p>

          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div style={{ background: 'var(--s2)', padding: '0.75rem 1.25rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#C8102E' }}>{teamsList.length}</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Teams</div>
            </div>
            <div style={{ background: 'var(--s2)', padding: '0.75rem 1.25rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#C8102E' }}>{rinksList.length}</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Rinks</div>
            </div>
          </div>
        </div>

        {/* Teams */}
        {teamsList.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>🏒 Hockey Teams in {cityName}</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {teamsList.map(team => (
                <Link
                  key={team.id}
                  href={`/directory/teams/${team.slug || team.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  {team.logo_url ? (
                    <img src={team.logo_url} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, background: 'var(--s3)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏒</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600 }}>{team.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>View team →</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Rinks */}
        {rinksList.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>⛸️ Ice Rinks in {cityName}</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {rinksList.map(rink => (
                <div key={rink.id} style={{ padding: '1.25rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{rink.name}</div>
                  {rink.address && <div style={{ fontSize: '0.8125rem', color: '#666', marginBottom: '0.25rem' }}>📍 {rink.address}</div>}
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem' }}>
                    {rink.phone && <span>📞 {rink.phone}</span>}
                    {rink.website_url && <a href={rink.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#C8102E' }}>🌐 Website →</a>}
                  </div>
                  {rink.notes && <div style={{ fontSize: '0.8125rem', color: '#888', marginTop: '0.5rem', fontStyle: 'italic' }}>{rink.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EIHL cross-link */}
        {eihlTeam && (
          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>🏆 Professional Hockey: {eihlTeam.name}</h3>
            <p style={{ fontSize: '0.875rem', color: '#555', marginBottom: '0.75rem' }}>
              {cityName} is home to the {eihlTeam.name}, competing in the Elite Ice Hockey League (EIHL), the UK&apos;s top professional hockey league.
            </p>
            <Link href="/directory/united-kingdom" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>
              ← All UK hockey
            </Link>
          </div>
        )}

        {/* Empty state */}
        {teamsList.length === 0 && rinksList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏒</div>
            <p>No hockey found in {cityName}, UK yet.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Know a team or rink? <Link href="/add-listing" style={{ color: '#C8102E' }}>Add it</Link>
            </p>
          </div>
        )}
      </div>
    </>
  );
}