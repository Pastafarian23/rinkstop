'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LeagueEntry { id: string; name: string }
interface CityEntry {
  city: string;
  name: string;
  description: string;
  team_count: number;
  rink_count: number;
  program_count: number;
}

interface CountryData {
  country: string;
  content: {
    name: string;
    flag: string;
    description: string;
    cities: Record<string, { name: string; description: string }>;
  } | null;
  cities: CityEntry[];
}

export default function CountryPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const [data, setData] = useState<CountryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState('');

  useEffect(() => {
    params.then(p => {
      setCountry(decodeURIComponent(p.country));
    });
  }, [params]);

  useEffect(() => {
    if (!country) return;
    setLoading(true);
    fetch(`/api/locations/${encodeURIComponent(country)}`)
      .then(r => r.json())
      .then(d => {
        setData(d?.data || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [country]);

  const content = data?.content;
  const cities = data?.cities || [];

  // Build stats from cities data
  const totalTeams = cities.reduce((s, c) => s + c.team_count, 0);
  const totalRinks = cities.reduce((s, c) => s + c.rink_count, 0);
  const totalPrograms = cities.reduce((s, c) => s + c.program_count, 0);

  // Page title
  const pageTitle = content?.name ?? country;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem 4rem' }}>

      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555555', padding: '1.5rem 0 0', marginBottom: '0' }}>
        <Link href="/" style={{ color: '#555555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/locations" style={{ color: '#555555' }}>Locations</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>{pageTitle}</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem', paddingTop: '1.5rem' }}>
        {loading ? (
          <div>
            <div className="skeleton" style={{ height: '0.875rem', width: '120px', marginBottom: '0.75rem' }} />
            <div className="skeleton" style={{ height: '3.5rem', width: '280px', marginBottom: '0.875rem' }} />
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '0.875rem',
            }}>
              {content?.flag && (
                <span style={{ fontSize: '3.5rem', lineHeight: 1 }}>{content.flag}</span>
              )}
              <h1 style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                color: '#fff',
                letterSpacing: '0.02em',
                lineHeight: 1,
              }}>
                {pageTitle.toUpperCase()}
              </h1>
            </div>
            {content?.description && (
              <p style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '1rem',
                lineHeight: 1.7,
                maxWidth: '600px',
                marginBottom: '1.25rem',
              }}>
                {content.description}
              </p>
            )}
          </>
        )}
      </div>

      {/* Stats bar */}
      {!loading && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          marginBottom: '2.5rem',
          padding: '1rem 1.25rem',
          background: 'var(--s2)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
        }}>
          {[
            { label: 'Cities', value: cities.length },
            { label: 'Teams', value: totalTeams },
            { label: 'Rinks', value: totalRinks },
            { label: 'Youth Programs', value: totalPrograms },
          ].map(stat => (
            <div key={stat.label}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{stat.value}</span>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8102E', marginLeft: '0.5rem' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.5rem', height: '160px' }}>
              <div className="skeleton" style={{ height: '1.25rem', width: '50%', marginBottom: '1rem' }} />
              <div className="skeleton" style={{ height: '0.75rem', width: '75%', marginBottom: '0.5rem' }} />
              <div className="skeleton" style={{ height: '0.75rem', width: '60%' }} />
            </div>
          ))}
        </div>
      )}

      {/* No cities state */}
      {!loading && cities.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏒</div>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.03em', marginBottom: '0.75rem' }}>
            NO HOCKEY YET IN {pageTitle.toUpperCase()}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '400px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            Help us document hockey in {pageTitle}. Add teams, rinks, and youth programs to grow the directory.
          </p>
          <Link href="/admin/teams/new" style={{
            display: 'inline-block',
            background: '#C8102E',
            color: '#fff',
            padding: '0.625rem 1.25rem',
            borderRadius: '4px',
            fontSize: '0.8125rem',
            fontWeight: 700,
            textDecoration: 'none',
            letterSpacing: '0.05em',
          }}>
            + Add Hockey in {pageTitle}
          </Link>
        </div>
      )}

      {/* Cities section */}
      {!loading && cities.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.5rem',
            color: '#fff',
            letterSpacing: '0.03em',
            marginBottom: '1.25rem',
          }}>
            CITIES WITH HOCKEY
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}>
            {cities.map(city => {
              const cityContent = content?.cities?.[city.city];
              const activity = city.team_count + city.rink_count + city.program_count;
              return (
                <Link
                  key={city.city}
                  href={`/directory/locations/${encodeURIComponent(country)}/${encodeURIComponent(city.city)}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '1.375rem',
                    textDecoration: 'none',
                    transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'var(--border-h)';
                    el.style.transform = 'translateY(-2px)';
                    el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.45)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'var(--border)';
                    el.style.transform = '';
                    el.style.boxShadow = '';
                  }}
                >
                  {/* City name */}
                  <h3 style={{
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    fontSize: '1.375rem',
                    color: '#fff',
                    letterSpacing: '0.02em',
                    lineHeight: 1,
                    marginBottom: '0.5rem',
                  }}>
                    {city.name.toUpperCase()}
                  </h3>

                  {/* Description from content or fallback */}
                  <p style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.8125rem',
                    lineHeight: 1.6,
                    flex: 1,
                    marginBottom: '1rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {cityContent?.description || city.description}
                  </p>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '0.875rem', borderTop: '1px solid var(--border)', paddingTop: '0.875rem', flexWrap: 'wrap' }}>
                    {city.team_count > 0 && (
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                        {city.team_count} Team{city.team_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    {city.rink_count > 0 && (
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                        {city.rink_count} Rink{city.rink_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    {city.program_count > 0 && (
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                        {city.program_count} Youth
                      </span>
                    )}
                  </div>

                  {activity > 0 && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.6875rem', fontWeight: 700, color: '#C8102E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      View Details →
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}