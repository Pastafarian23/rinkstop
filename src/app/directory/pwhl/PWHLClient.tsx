'use client';
import Link from 'next/link';

const PWHL_TEAL = '#4ECDC4';

interface Team {
  id: string;
  name: string;
  city?: string;
  country?: string;
  league_id?: string;
  slug?: string;
  logo_url?: string;
}

interface League {
  id: string;
  name: string;
  slug: string;
  country: string;
  level: string;
  website_url: string;
  description?: string;
}

interface Props {
  league: League | null;
  teams: Team[];
}

export default function PWHLClient({ league, teams }: Props) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>PWHL</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="label" style={{ color: PWHL_TEAL }}>Professional Women&apos;s Hockey League</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1 }}>
          PWHL
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9375rem', marginTop: '0.625rem', maxWidth: '560px', lineHeight: 1.6 }}>
          North America&apos;s premier professional women&apos;s hockey league  --  6 teams, elite competition, history in the making.
        </p>
      </div>

      {/* About the PWHL */}
      <div style={{
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${PWHL_TEAL}`,
        borderRadius: '6px',
        padding: '1.25rem 1.5rem',
        marginBottom: '2rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.25rem',
      }}>
        <div style={{ flex: '1 1 280px' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.125rem', color: PWHL_TEAL, letterSpacing: '0.06em', marginBottom: '0.5rem' }}>ABOUT THE PWHL</h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', lineHeight: 1.7 }}>
            The Professional Women&apos;s Hockey League launched in January 2024 as the first major professional women&apos;s hockey league in North America with six teams across the USA and Canada. Backed by a consortium of NHL owners, the PWHL set out to establish the first sustainable, standalone professional women&apos;s hockey league  --  paying players, building arenas, and creating a new standard for the sport.
          </p>
        </div>
        <div style={{ flex: '0 0 auto', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Founded', value: '2023' },
            { label: 'Teams', value: '6' },
            { label: 'Countries', value: '2' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.75rem', color: PWHL_TEAL, letterSpacing: '0.04em', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: '0.25rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Teams */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="font-sport" style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em' }}>ALL 6 TEAMS</h2>
          <a
            href={league?.website_url || 'https://www.thepwhl.com'}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: PWHL_TEAL, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            Official Site →
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
          {teams.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', color: '#666', padding: '2rem', textAlign: 'center' }}>
              No PWHL teams found.
            </div>
          ) : (
            teams.map(team => (
              <Link
                key={team.id}
                href={`/directory/teams/${team.slug}`}
                style={{
                  display: 'block',
                  background: 'var(--s2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '1.125rem',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s, transform 0.2s',
                  borderTop: `3px solid ${PWHL_TEAL}`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = PWHL_TEAL;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.borderTopColor = PWHL_TEAL;
                  (e.currentTarget as HTMLElement).style.transform = '';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                  {team.logo_url ? (
                    <img src={team.logo_url} alt="" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${PWHL_TEAL}, #2a9d8f)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.875rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>🏒</div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {team.name}
                    </h3>
                  </div>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.8125rem' }}>
                  {[team.city, team.country].filter(Boolean).join(', ')}
                </p>
                <span style={{
                  display: 'inline-block',
                  marginTop: '0.5rem',
                  fontSize: '0.5625rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '0.15rem 0.4rem',
                  borderRadius: '3px',
                  background: `${PWHL_TEAL}22`,
                  color: PWHL_TEAL,
                }}>
                  PWHL
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* League Leaders Placeholder */}
      <div style={{
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}>
        <h2 className="font-sport" style={{ fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>SEASON LEADERS</h2>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>
          Stats integration coming soon  --  player scoring, goaltending, and team standings.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '1.25rem' }}>
          {['Points', 'Goals', 'Assists', 'GAA', 'Save %', 'Wins'].map(stat => (
            <div key={stat} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: '0.25rem' }}>{stat}</div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.3)' }}> -- </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mission */}
      <div style={{
        background: `linear-gradient(135deg, ${PWHL_TEAL}18 0%, transparent 60%)`,
        border: `1px solid ${PWHL_TEAL}30`,
        borderRadius: '6px',
        padding: '1.5rem',
      }}>
        <h2 className="font-sport" style={{ fontSize: '1.25rem', color: PWHL_TEAL, letterSpacing: '0.04em', marginBottom: '0.625rem' }}>THE MISSION</h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', lineHeight: 1.7, maxWidth: '640px' }}>
          The PWHL exists to create a sustainable professional league that elevates women&apos;s hockey, provides elite playing opportunities, and inspires the next generation of players and fans. With NHL-backed ownership, paid salaries, and dedicated arenas, the PWHL is building something the sport has never had before.
        </p>
      </div>

    </div>
  );
}
