'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { NHL_TEAM_DATA } from '@/lib/nhl-teams-data';
import NHLShopWidget from '@/components/NHLShopWidget';

const BASE_URL = 'https://rinkstop.com';

export default function TeamDetail() {
  const { slug } = useParams();
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/teams?slug=${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d?.data?.length > 0) {
          setTeam(d.data[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!team) return;
    fetch(`/api/players?teamId=${team.id}&limit=60`)
      .then(r => r.json())
      .then(d => setPlayers(d?.data || []))
      .catch(() => {});
  }, [team]);

  useEffect(() => {
    if (!team) return;
    const enriched = NHL_TEAM_DATA[team.slug] || {};
    const teamData = { ...team, ...enriched };

    const schemaOrg = {
      '@context': 'https://schema.org',
      '@type': 'SportsTeam',
      name: teamData.name,
      sport: 'Ice hockey',
      url: `${BASE_URL}/directory/teams/${team.slug}`,
      ...(team.logo_url && { logo: team.logo_url }),
      foundingDate: enriched.founded ? String(enriched.founded) : undefined,
      ...(enriched.arena && {
        venue: {
          '@type': 'SportsActivityLocation',
          name: enriched.arena,
          address: { '@type': 'PostalAddress', addressLocality: enriched.city },
        },
      }),
      ...(team.leagues?.name && {
        memberOf: { '@type': 'SportsOrganization', name: team.leagues.name },
      }),
    };

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Teams', item: `${BASE_URL}/directory/teams` },
        { '@type': 'ListItem', position: 3, name: team.name, item: `${BASE_URL}/directory/teams/${team.slug}` },
      ],
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify([breadcrumbSchema, schemaOrg]);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [team]);

  if (loading) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div className="skeleton" style={{ height: '1.5rem', width: '250px', marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: '80px' }} />)}
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700 }}>Team not found</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>Check the URL or browse all teams.</p>
        <Link href="/directory/teams" style={{ color: 'var(--red)', display: 'block', marginTop: '1rem' }}>← Browse All Teams</Link>
      </div>
    );
  }

  const staticData = NHL_TEAM_DATA[team.slug] || {};
  const hasRichData = Object.keys(staticData).length > 0;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>

      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '0.875rem' }}>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/teams" style={{ color: '#555' }}>Teams</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>{team.name}</span>
      </nav>

      {/* Sticky team header */}
      <div style={{
        position: 'sticky', top: '60px', zIndex: 20, background: 'var(--bg)',
        paddingTop: '0.75rem', paddingBottom: '0.75rem',
        borderBottom: '2px solid var(--red)', marginBottom: '1.5rem',
      }}>
        <Link href="/directory/teams" style={{ color: 'var(--red)', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.5rem' }}>
          ← All Teams
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {team.logo_url ? (
            <img src={team.logo_url} alt="" style={{ width: 52, height: 52, objectFit: 'contain', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: '8px', background: 'linear-gradient(135deg, #C8102E, #041E42)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🏒</div>
          )}
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
              {team.name.toUpperCase()}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', marginTop: '0.2rem' }}>
              {[team.city, team.country].filter(Boolean).join(', ')}
              {team.leagues?.name ? ` · ${team.leagues.name}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Rich team info section */}
      {hasRichData && (
        <>
          <section style={{ marginBottom: '2rem' }}>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9375rem', lineHeight: 1.75, maxWidth: '720px', marginBottom: '1.25rem', borderLeft: '3px solid var(--red)', paddingLeft: '1rem' }}>
              {staticData.description}
            </p>
          </section>

          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.625rem', marginBottom: '2rem' }}>
            {[
              { label: 'Founded', value: staticData.founded || ' -- ', highlight: false },
              { label: 'Arena', value: staticData.arena || ' -- ', highlight: false },
              { label: 'Stanley Cups', value: staticData.championships || 0, highlight: true },
              { label: 'Division', value: staticData.division || ' -- ', highlight: false },
              { label: 'Conference', value: staticData.conference || ' -- ', highlight: false },
              { label: 'Captain', value: staticData.captain || ' -- ', highlight: false },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1rem' }}>
                <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '0.2rem' }}>{s.label}</p>
                <p style={{ fontSize: s.highlight ? '1.5rem' : '0.875rem', fontWeight: s.highlight ? 800 : 700, color: s.highlight ? 'var(--red)' : '#fff' }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Notable Players */}
          {staticData.notablePlayers && staticData.notablePlayers.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.875rem' }}>NOTABLE PLAYERS</h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {staticData.notablePlayers.map(player => (
                  <span key={player} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '0.3rem 0.75rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                    {player}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Coaching & Management */}
          {[
            { role: 'Head Coach', name: staticData.coach },
            { role: 'General Manager', name: staticData.generalManager },
            { role: 'Captain', name: staticData.captain },
          ].filter(s => s.name).length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.875rem' }}>COACHING & MANAGEMENT</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.625rem' }}>
                {[
                  { role: 'Head Coach', name: staticData.coach },
                  { role: 'General Manager', name: staticData.generalManager },
                  { role: 'Captain', name: staticData.captain },
                ].filter(s => s.name).map(s => (
                  <div key={s.role} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                    <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '0.2rem' }}>{s.role}</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{s.name}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* NHL Shop Widget */}
          <NHLShopWidget
            teamName={team.name}
            teamSlug={team.slug}
            primaryColor={staticData.colors?.[0] || '#C8102E'}
            secondaryColor={staticData.colors?.[1] || '#FFFFFF'}
          />
        </>
      )}

      {/* Navigation breadcrumb trail */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: staticData.conference === 'Western' ? 'Western Conf.' : 'Eastern Conf.', href: staticData.conference === 'Western' ? '/directory/nhl/western' : '/directory/nhl/eastern' },
          { label: staticData.division ? `${staticData.division} Division` : 'NHL', href: staticData.division ? `/directory/nhl/${staticData.division.toLowerCase()}` : '/directory/nhl' },
          { label: 'NHL Hub', href: '/directory/nhl' },
          { label: 'NHL Playoffs', href: '/directory/nhl/playoffs' },
        ].filter(n => n.label).map(n => (
          <Link key={n.href} href={n.href} style={{
            padding: '0.3rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
            textDecoration: 'none', color: 'rgba(255,255,255,0.55)', background: 'var(--s2)',
            border: '1px solid var(--border)',
          }}>{n.label}</Link>
        ))}
      </div>

      {/* Home rink and league */}
      <TeamRelated leagueId={team.league_id} currentTeamId={team.id} homeRinkId={team.home_rink_id} />

      <div style={{ height: '1px', background: 'var(--border)', margin: '2rem 0' }} />

      {/* Roster */}
      <div>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.03em', marginBottom: '0.875rem' }}>
          ROSTER  --  {players.length} PLAYERS
        </h2>
        {players.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.875rem' }}>No roster data available.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
            {players.map((p: any) => (
              <Link key={p.id} href={`/directory/players/${p.id}`} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamRelated({ leagueId, currentTeamId, homeRinkId }: { leagueId: string; currentTeamId: string; homeRinkId?: string }) {
  const [homeRink, setHomeRink] = useState<any>(null);
  const [league, setLeague] = useState<any>(null);
  const [otherTeams, setOtherTeams] = useState<any[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    let loaded = 0;

    const checkDone = () => { loaded++; };

    if (homeRinkId) {
      fetch(`/api/rinks?id=${homeRinkId}`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          const rink = Array.isArray(data) ? data[0] : (data?.data?.[0]);
          if (rink) setHomeRink(rink);
        })
        .catch(() => {});
    }
    if (leagueId) {
      fetch(`/api/leagues?id=${leagueId}`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          const lg = Array.isArray(data) ? data[0] : (data?.data?.[0]);
          if (lg) setLeague(lg);
        })
        .catch(() => {});
      fetch(`/api/teams?leagueId=${leagueId}&limit=6`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          const teams = Array.isArray(data) ? data : (data?.data || []);
          setOtherTeams(teams.filter((t: any) => t.id !== currentTeamId).slice(0, 4));
        })
        .catch(() => {});
    }
    return () => controller.abort();
  }, [leagueId, currentTeamId, homeRinkId]);

  return (
    <>
      {homeRink && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '0.875rem' }}>
          <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.3rem' }}>Home Arena</p>
          <Link href={`/directory/rinks/${homeRink.id}`} style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', textDecoration: 'none' }}>{homeRink.name || homeRink.address || 'View Rink'}</Link>
        </div>
      )}
      {league && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '0.875rem' }}>
          <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.3rem' }}>League</p>
          <Link href={`/directory/leagues/${league.id}`} style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', textDecoration: 'none' }}>{league.name}</Link>
        </div>
      )}
      {otherTeams.length > 0 && (
        <div>
          <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '0.75rem' }}>More in {league?.name || 'League'}</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {otherTeams.map((t: any) => (
              <Link key={t.id} href={`/directory/teams/${t.slug}`} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '0.3rem 0.75rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 600 }}>
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}