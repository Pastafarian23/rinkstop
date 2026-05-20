'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import TeamRelated from '@/components/TeamRelated';
import NHLShopWidget from '@/components/NHLShopWidget';

const BASE_URL = 'https://rinkstop.com';

export default function TeamDetail() {
  const { id } = useParams();
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/teams?slug=${id}`)
      .then(r => r.json())
      .then(d => {
        if (d?.data) setTeam(d.data); else { fetch(`/api/teams?id=${id}`).then(r => r.json()).then(d2 => { if (d2?.data?.[0]) setTeam(d2.data[0]); }); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/players?teamId=${id}&limit=60`)
      .then(r => r.json())
      .then(d => setPlayers(d?.data || []))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!team) return;

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Teams', item: `${BASE_URL}/directory/teams` },
        { '@type': 'ListItem', position: 3, name: team.name, item: `${BASE_URL}/directory/teams/${team.id}` },
      ],
    };

    const teamSchema = {
      '@context': 'https://schema.org',
      '@type': 'SportsTeam',
      name: team.name,
      sport: 'Ice hockey',
      url: `${BASE_URL}/directory/teams/${team.id}`,
      ...(team.logo_url && { logo: team.logo_url }),
      ...(team.leagues?.name && {
        memberOf: { '@type': 'SportsOrganization', name: team.leagues.name },
      }),
      address: {
        '@type': 'PostalAddress',
        addressLocality: team.city,
        addressCountry: team.country,
      },
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify([breadcrumbSchema, teamSchema]);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [team]);

  if (loading) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div className="skeleton" style={{ height: '1.5rem', width: '200px', marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '80px' }} />)}
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
        <Breadcrumbs links={[{ label: 'Teams', href: '/directory/teams' }]} />
        <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, marginTop: '1rem' }}>Team not found</h1>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>

      <Breadcrumbs links={[
        { label: 'Directory', href: '/directory' },
        { label: 'Teams', href: '/directory/teams' },
        { label: team.name, href: `/directory/teams/${team.id}` },
      ]} />

      {/* Sticky header bar */}
      <div style={{
        position: 'sticky',
        top: '60px',
        zIndex: 20,
        background: 'var(--bg)',
        paddingTop: '0.75rem',
        paddingBottom: '0.75rem',
        borderBottom: '2px solid var(--red)',
        marginBottom: '1.25rem',
      }}>
        <Link href="/directory/teams" style={{ color: 'var(--red)', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.5rem' }}>
          ← All NHL Teams
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {team.logo_url ? (
            <img src={team.logo_url} alt="" style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: '8px', background: 'linear-gradient(135deg, #C8102E, #041E42)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🏒</div>
          )}
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 'clamp(1.375rem, 4vw, 2rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
              {team.name.toUpperCase()}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem' }}>
              {[team.city, team.country].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem', maxWidth: '600px' }}>
        {[
          { label: 'League',  value: team.leagues?.name || '—' },
          { label: 'Country', value: team.country || '—' },
          { label: 'City',   value: team.city || '—' },
          { label: 'Roster', value: `${players.length} players` },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem 1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '0.2rem' }}>{s.label}</p>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Related Content (Home Rink, League, Other Teams) */}
      <TeamRelated
        leagueId={team.league_id}
        currentTeamId={team.id}
        homeRinkId={team.home_rink_id}
      />

      {/* NHL Shop Affiliate Widget */}
      <NHLShopWidget
        teamName={team.name}
        teamSlug={team.slug || team.id}
        primaryColor="#C8102E"
        secondaryColor="#FFFFFF"
        logoUrl={team.logo_url}
      />

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)', margin: '2rem 0' }} />

      {/* Roster */}
      <div>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.03em', marginBottom: '0.875rem' }}>
          ROSTER — {players.length} PLAYERS
        </h2>
        {players.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.875rem' }}>No roster data available.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
            {players.map((p: any) => (
              <div key={p.id} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                {p.headshot_url ? (
                  <img src={p.headshot_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#1a2D45' }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1a2D45', flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.first_name} {p.last_name}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                    {p.position?.replace('_', ' ')}{p.jersey_number ? ` · #${p.jersey_number}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}