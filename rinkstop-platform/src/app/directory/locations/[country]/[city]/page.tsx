'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { COUNTRY_CONTENT } from '@/lib/location-content';

interface Team {
  id: string;
  name: string;
  logo_url?: string;
  league_id?: string;
  leagues?: { name: string } | { name: string }[];
}
interface Rink {
  id: string;
  name: string;
  city?: string;
  country?: string;
  address?: string;
}
interface YouthProgram {
  id: string;
  name: string;
  program_type?: string;
  age_group?: string;
}

export default function CityPage({
  params,
}: {
  params: Promise<{ country: string; city: string }>;
}) {
  const [countryName, setCountryName] = useState('');
  const [cityName, setCityName] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [rinks, setRinks] = useState<Rink[]>([]);
  const [programs, setPrograms] = useState<YouthProgram[]>([]);
  const [leagues, setLeagues] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(async p => {
      const c = decodeURIComponent(p.country);
      const cty = decodeURIComponent(p.city);
      setCountryName(c);
      setCityName(cty);
      await loadCityData(c, cty);
    });
  }, [params]);

  async function loadCityData(country: string, city: string) {
    setLoading(true);

    const [
      { data: teamsData },
      { data: rinksData },
      { data: programsData },
    ] = await Promise.all([
      supabase
        .from('teams')
        .select('id, name, logo_url, league_id, leagues(name)')
        .eq('country', country)
        .eq('city', city)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('rinks')
        .select('id, name, city, country, address')
        .eq('country', country)
        .eq('city', city)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('youth_programs')
        .select('id, name, program_type, age_group')
        .eq('country', country)
        .eq('city', city)
        .eq('is_active', true)
        .order('name'),
    ]);

    setTeams((teamsData as unknown as Team[]) || []);
    setRinks((rinksData as unknown as Rink[]) || []);
    setPrograms((programsData as unknown as YouthProgram[]) || []);

    // Extract unique leagues
    const leagueMap = new Map<string, string>();
    (teamsData || []).forEach((t: Team) => {
      const leagueName = Array.isArray(t.leagues) ? t.leagues[0]?.name : t.leagues?.name;
      if (t.league_id && leagueName && !leagueMap.has(t.league_id)) {
        leagueMap.set(t.league_id, leagueName);
      }
    });
    setLeagues(Array.from(leagueMap.entries()).map(([id, name]) => ({ id, name })));

    setLoading(false);
  }

  const countryContent = COUNTRY_CONTENT[countryName];
  const cityContent = countryContent?.cities?.[cityName];
  const cityDescription = cityContent?.description || null;
  const pageTitle = cityName;

  const hasContent = teams.length > 0 || rinks.length > 0 || programs.length > 0;

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
        <Link href={`/directory/locations/${encodeURIComponent(countryName)}`} style={{ color: '#555555' }}>
          {countryContent?.name ?? countryName}
        </Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>{pageTitle}</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem', paddingTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.875rem' }}>
          {countryContent?.flag && (
            <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{countryContent.flag}</span>
          )}
          <div>
            <h1 style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: 'clamp(2rem, 6vw, 3.5rem)',
              color: '#fff',
              letterSpacing: '0.02em',
              lineHeight: 1,
            }}>
              {pageTitle.toUpperCase()}
            </h1>
            {countryContent?.name && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {countryContent.name}
              </p>
            )}
          </div>
        </div>

        {/* About section — editorial content */}
        {cityDescription && (
          <div style={{
            maxWidth: '600px',
            borderLeft: '3px solid #C8102E',
            paddingLeft: '1rem',
            marginTop: '0.75rem',
          }}>
            <p style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.9375rem',
              lineHeight: 1.75,
            }}>
              {cityDescription}
            </p>
          </div>
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
            { label: 'Teams', value: teams.length },
            { label: 'Rinks', value: rinks.length },
            { label: 'Youth Programs', value: programs.length },
            { label: 'Leagues', value: leagues.length },
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem', height: '120px' }}>
              <div className="skeleton" style={{ height: '1rem', width: '60%', marginBottom: '0.75rem' }} />
              <div className="skeleton" style={{ height: '0.75rem', width: '40%' }} />
            </div>
          ))}
        </div>
      )}

      {/* No content state */}
      {!loading && !hasContent && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏒</div>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.03em', marginBottom: '0.75rem' }}>
            NO HOCKEY LISTED IN {pageTitle.toUpperCase()} YET
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '400px', margin: '0 auto 0.5rem', lineHeight: 1.6 }}>
            Help us document hockey in {pageTitle}. Be the first to add teams, rinks, and youth programs here.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8125rem', margin: '0 auto 1.5rem' }}>
            Start with a team — everything else grows from there.
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
            + Add a Team in {pageTitle}
          </Link>
        </div>
      )}

      {/* Teams section */}
      {!loading && teams.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.5rem',
            color: '#fff',
            letterSpacing: '0.03em',
            marginBottom: '1.25rem',
          }}>
            TEAMS IN {pageTitle.toUpperCase()}
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '0.75rem',
          }}>
            {teams.map(team => (
              <Link
                key={team.id}
                href={`/directory/teams/${team.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'var(--s2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '1rem 1.125rem',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'var(--border-h)';
                  el.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'var(--border)';
                  el.style.transform = '';
                }}
              >
                {team.logo_url ? (
                  <img src={team.logo_url} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: '4px', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #C8102E, #041E42)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    flexShrink: 0,
                  }}>
                    🏒
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <h3 style={{
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    color: '#fff',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {team.name}
                  </h3>
                  {(() => { const n = Array.isArray(team.leagues) ? team.leagues[0]?.name : team.leagues?.name; return n ? (
                    <span style={{
                      display: 'inline-block',
                      marginTop: '0.25rem',
                      fontSize: '0.5625rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '3px',
                      background: 'rgba(200,16,46,0.15)',
                      color: 'var(--red)',
                    }}>
                      {n}
                    </span>
                  ) : null; })()}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Rinks section */}
      {!loading && rinks.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.5rem',
            color: '#fff',
            letterSpacing: '0.03em',
            marginBottom: '1.25rem',
          }}>
            RINKS IN {pageTitle.toUpperCase()}
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '0.75rem',
          }}>
            {rinks.map(rink => (
              <Link
                key={rink.id}
                href={`/directory/rinks/${rink.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  background: 'var(--s2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '1rem 1.125rem',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'var(--border-h)';
                  el.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'var(--border)';
                  el.style.transform = '';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🏟️</span>
                  <h3 style={{
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    color: '#fff',
                    lineHeight: 1.3,
                  }}>
                    {rink.name}
                  </h3>
                </div>
                {rink.address && (
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                    {rink.address}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Youth programs section */}
      {!loading && programs.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.5rem',
            color: '#fff',
            letterSpacing: '0.03em',
            marginBottom: '1.25rem',
          }}>
            YOUTH PROGRAMS IN {pageTitle.toUpperCase()}
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '0.75rem',
          }}>
            {programs.map(program => (
              <Link
                key={program.id}
                href={`/directory/youth-hockey/programs?city=${encodeURIComponent(cityName)}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.375rem',
                  background: 'var(--s2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '1rem 1.125rem',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'var(--border-h)';
                  el.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'var(--border)';
                  el.style.transform = '';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>⛸️</span>
                  <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff', lineHeight: 1.3 }}>
                    {program.name}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {program.program_type && (
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '0.1rem 0.35rem', borderRadius: '3px', background: 'rgba(255,184,28,0.1)', color: '#FFB81C' }}>
                      {program.program_type}
                    </span>
                  )}
                  {program.age_group && (
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '0.1rem 0.35rem', borderRadius: '3px', background: 'rgba(0,100,200,0.1)', color: '#0064C8' }}>
                      {program.age_group}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}