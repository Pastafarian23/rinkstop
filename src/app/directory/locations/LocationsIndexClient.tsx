'use client';
import Link from 'next/link';

interface CountryEntry {
  country: string;
  name: string;
  flag: string;
  description: string;
  team_count: number;
  rink_count: number;
  program_count: number;
  leagues: { id: string; name: string }[];
}

interface Props {
  initialCountries: CountryEntry[];
}

export default function LocationsIndexClient({ initialCountries }: Props) {
  const countries = initialCountries;
  const loading = false;

  const totalCountries = countries.length;
  const totalTeams = countries.reduce((s, c) => s + c.team_count, 0);
  const totalRinks = countries.reduce((s, c) => s + c.rink_count, 0);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem 4rem' }}>

      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555555', padding: '1.5rem 0 0', marginBottom: '0' }}>
        <Link href="/" style={{ color: '#555555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Locations</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem', paddingTop: '1.5rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.5rem' }}>
          Hockey Around the World
        </div>
        <h1 style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: 'clamp(2rem, 6vw, 3.5rem)',
          color: '#fff',
          letterSpacing: '0.02em',
          lineHeight: 1,
          marginBottom: '0.875rem',
        }}>
          GLOBAL HOCKEY LOCATIONS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', maxWidth: '520px', lineHeight: 1.65 }}>
          Browse hockey teams, rinks, and youth programs by country and city.
          From NHL arenas to emerging markets in Southeast Asia.
        </p>
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
            { label: 'Countries', value: totalCountries },
            { label: 'Teams', value: totalTeams },
            { label: 'Rinks', value: totalRinks },
          ].map(stat => (
            <div key={stat.label}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{stat.value.toLocaleString()}</span>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8102E', marginLeft: '0.5rem' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && countries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌍</div>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.03em', marginBottom: '0.75rem' }}>
            NO LOCATIONS YET
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Hockey locations will appear here once teams, rinks, and programs are added to the directory.
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
          </Link>
        </div>
      )}

      {/* Country grid */}
      {!loading && countries.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1rem',
        }}>
          {countries.map(entry => {
            const activity = entry.team_count + entry.rink_count + entry.program_count;
            return (
              <Link
                key={entry.country}
                href={`/directory/locations/${encodeURIComponent(entry.country)}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--s2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '1.5rem',
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
                {/* Flag + name row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
                  <span style={{ fontSize: '2rem', lineHeight: 1 }}>{entry.flag}</span>
                  <div>
                    <h2 style={{
                      fontFamily: "'Bebas Neue', Impact, sans-serif",
                      fontSize: '1.5rem',
                      color: '#fff',
                      letterSpacing: '0.02em',
                      lineHeight: 1,
                    }}>
                      {entry.name.toUpperCase()}
                    </h2>
                  </div>
                </div>

                {/* Description */}
                <p style={{
                  color: 'rgba(255,255,255,0.42)',
                  fontSize: '0.8125rem',
                  lineHeight: 1.6,
                  flex: 1,
                  marginBottom: '1rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {entry.description}
                </p>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '0.875rem' }}>
                  {[
                    { count: entry.team_count, label: 'Teams' },
                    { count: entry.rink_count, label: 'Rinks' },
                    { count: entry.program_count, label: 'Youth' },
                    { count: entry.leagues.length, label: 'Leagues' },
                  ].map(stat => (
                    <div key={stat.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{stat.count}</div>
                      <div style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8102E' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Explore link */}
                {activity > 0 && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.6875rem', fontWeight: 700, color: '#C8102E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Explore →
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
