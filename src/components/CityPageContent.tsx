import Link from 'next/link';
import type { CityPageData } from '@/lib/city-page';
import DirectoryRelatedArticles from '@/components/DirectoryRelatedArticles';
import CityHockeyScene from '@/components/CityHockeyScene';
import HockeyCanadaAd from '@/components/HockeyCanadaAd';
import type { CityFAQEntry } from '@/lib/city-context';

interface Props {
  data: CityPageData;
  /** Optional FAQ entries (built by buildCityFAQs in lib/city-context.ts).
   *  When provided, renders a server-rendered accordion beneath the pro
   *  team cross-reference block. All text is sourced from CITY_FACTS,
   *  COUNTRY_HOCKEY_CONTEXT, or DB counts — no fabrication. */
  faqs?: CityFAQEntry[];
}

export default function CityPageContent({ data, faqs }: Props) {
  const {
    countryName,
    countrySlug,
    regionName,
    regionSlug,
    cityName,
    teams,
    rinks,
    teamCount,
    rinkCount,
    proTeams,
    breadcrumb,
    leaguesInCity = [],
  } = data;

  // Theme
  const bg = '#0a0a0a';
  const card = '#0f0f0f';
  const border = '#1e1e1e';
  const red = '#C8102E';
  const textMain = '#fff';
  const textMuted = '#aaa';
  const textDim = '#666';
  const gold = '#FFB81C';
  const ice = '#EEF5FF';

  const hasData = teamCount + rinkCount > 0;

  // Schema.org — BreadcrumbList
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumb
      .filter(b => b.href)
      .map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.name,
        item: `https://rinkstop.com${b.href}`,
      })),
  };

  // Schema.org — ItemList of SportsTeam entries
  const teamItemListSchema = teams.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Hockey Teams in ${cityName}`,
    itemListElement: teams.slice(0, 25).map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SportsTeam',
        name: t.name,
        url: `https://rinkstop.com/directory/teams/${t.slug || t.id}`,
        logo: t.logo_url,
      },
    })),
  } : null;

  // Schema.org — ItemList of SportsVenue entries
  const rinkItemListSchema = rinks.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Ice Rinks in ${cityName}`,
    itemListElement: rinks.slice(0, 25).map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SportsActivityLocation',
        name: r.name,
        address: r.address ? {
          '@type': 'PostalAddress',
          streetAddress: r.address,
          addressLocality: cityName,
          addressRegion: regionName,
          addressCountry: countryName,
        } : undefined,
        telephone: r.phone,
        url: r.website_url,
      },
    })),
  } : null;

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {teamItemListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(teamItemListSchema) }}
        />
      )}
      {rinkItemListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rinkItemListSchema) }}
        />
      )}

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem 4rem' }}>
        {/* BREADCRUMB */}
        <nav
          aria-label="Breadcrumb"
          style={{
            fontSize: '0.8125rem',
            color: textMuted,
            padding: '1.5rem 0 0',
            marginBottom: '0.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          {breadcrumb.map((b, i) => {
            const isLast = i === breadcrumb.length - 1;
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                {b.href && !isLast ? (
                  <Link href={b.href} style={{ color: textMuted, textDecoration: 'none' }}>
                    {b.name}
                  </Link>
                ) : (
                  <span style={{ color: textDim }}>{b.name}</span>
                )}
                {!isLast && <span style={{ color: textDim }}>›</span>}
              </span>
            );
          })}
        </nav>

        {/* HERO */}
        <header style={{ marginBottom: '2.5rem', paddingTop: '1rem' }}>
          <div
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: red,
              marginBottom: '0.5rem',
            }}
          >
            {countryName}
            {regionName ? ` · ${regionName}` : ''}
          </div>
          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 900,
              marginBottom: '1rem',
              color: textMain,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {cityName} Hockey
          </h1>

          {/* Hockey Canada affiliate ad — test placement, top of city page */}
          {countryName === 'Canada' && (
            <HockeyCanadaAd size="300x250" />
          )}
          <p
            style={{
              color: textMuted,
              fontSize: '1.0625rem',
              lineHeight: 1.7,
              maxWidth: '820px',
              marginBottom: '1.5rem',
            }}
          >
            {cityName} is home to{' '}
            <strong style={{ color: textMain }}>{teamCount} hockey {teamCount === 1 ? 'team' : 'teams'}</strong>
            {rinkCount > 0 && (
              <>
                {' '}and{' '}
                <strong style={{ color: textMain }}>{rinkCount} ice {rinkCount === 1 ? 'rink' : 'rinks'}</strong>
              </>
            )}
            .
            {proTeams.length > 0 && (
              <>
                {' '}The city hosts{' '}
                <strong style={{ color: gold }}>
                  {proTeams.map((p, i) => (
                    <span key={p.name}>
                      {i > 0 && ', '}
                      {p.name} ({p.league})
                    </span>
                  ))}
                </strong>.
              </>
            )}
            {' '}Browse listings below,{' '}
            <Link href="/claim-your-listing" style={{ color: red, fontWeight: 600 }}>
              claim your listing
            </Link>{' '}
            if you&apos;re listed, or{' '}
            <Link href="/add-listing" style={{ color: red, fontWeight: 600 }}>
              add a new listing
            </Link>{' '}
            if we&apos;re missing something.
          </p>

          {/* Quick stats grid */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div
              style={{
                background: card,
                border: `1px solid ${border}`,
                padding: '0.75rem 1.25rem',
                borderRadius: '10px',
                textAlign: 'center',
                minWidth: '110px',
              }}
            >
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: red, lineHeight: 1 }}>{teamCount}</div>
              <div style={{ fontSize: '0.6875rem', color: textDim, marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Teams
              </div>
            </div>
            <div
              style={{
                background: card,
                border: `1px solid ${border}`,
                padding: '0.75rem 1.25rem',
                borderRadius: '10px',
                textAlign: 'center',
                minWidth: '110px',
              }}
            >
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: red, lineHeight: 1 }}>{rinkCount}</div>
              <div style={{ fontSize: '0.6875rem', color: textDim, marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Rinks
              </div>
            </div>
            {proTeams.length > 0 && (
              <div
                style={{
                  background: card,
                  border: `1px solid ${border}`,
                  padding: '0.75rem 1.25rem',
                  borderRadius: '10px',
                  textAlign: 'center',
                  minWidth: '110px',
                }}
              >
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: gold, lineHeight: 1 }}>{proTeams.length}</div>
                <div style={{ fontSize: '0.6875rem', color: textDim, marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                  Pro {proTeams.length === 1 ? 'Team' : 'Teams'}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* HOCKEY SCENE — data-driven unique content for SEO (Phase 1 step 2) */}
        <CityHockeyScene
          cityName={cityName}
          countryName={countryName}
          countrySlug={countrySlug}
          regionName={regionName}
          regionSlug={regionSlug}
          rinks={rinks}
          teams={teams}
          teamCount={teamCount}
          rinkCount={rinkCount}
          proTeams={proTeams}
          leaguesInCity={leaguesInCity}
        />

        {/* TEAMS */}
        {teams.length > 0 && (
          <section style={{ marginBottom: '3rem' }}>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                marginBottom: '1.25rem',
                color: textMain,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>🏒</span> Hockey Teams in {cityName}
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '0.875rem',
              }}
            >
              {teams.map(team => (
                <Link
                  key={team.id}
                  href={`/directory/teams/${team.slug || team.id}`}
                  className="city-team-card"
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem 1.25rem',
                    background: card,
                    border: `1px solid ${border}`,
                    borderRadius: '10px',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'border-color 0.15s, transform 0.15s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '10px',
                      zIndex: 0,
                    }}
                    aria-hidden
                  />
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt=""
                      style={{ width: 44, height: 44, objectFit: 'contain', position: 'relative', zIndex: 1 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        background: '#1a1a1a',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      🏒
                    </div>
                  )}
                  <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: textMain }}>{team.name}</div>
                    <div style={{ fontSize: '0.75rem', color: textDim, marginTop: '0.15rem' }}>View team details →</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* RINKS */}
        {rinks.length > 0 && (
          <section style={{ marginBottom: '3rem' }}>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                marginBottom: '1.25rem',
                color: textMain,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>⛸️</span> Ice Rinks in {cityName}
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '0.875rem',
              }}
            >
              {rinks.map(rink => (
                <div
                  key={rink.id}
                  className="rink-card"
                  style={{
                    position: 'relative',
                    padding: '1.25rem 1.5rem',
                    background: card,
                    border: `1px solid ${border}`,
                    borderRadius: '10px',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <Link
                    href={rink.slug ? `/directory/rinks/${rink.slug}` : `/directory/rinks`}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '10px',
                      zIndex: 0,
                    }}
                    aria-label={rink.name}
                  />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: textMain, marginBottom: '0.35rem' }}>
                      {rink.name}
                    </div>
                    {rink.address && (
                      <div style={{ fontSize: '0.8125rem', color: textMuted, marginBottom: '0.5rem', lineHeight: 1.5 }}>
                        📍 {rink.address}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', flexWrap: 'wrap' }}>
                      {rink.phone && <span style={{ color: textMuted }}>📞 {rink.phone}</span>}
                      {rink.website_url && (
                        <a
                          href={rink.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: red,
                            textDecoration: 'none',
                            fontWeight: 600,
                            position: 'relative',
                            zIndex: 2,
                          }}
                        >
                          🌐 Website →
                        </a>
                      )}
                    </div>
                    {rink.notes && (
                      <div
                        style={{
                          fontSize: '0.8125rem',
                          color: textDim,
                          marginTop: '0.625rem',
                          fontStyle: 'italic',
                          lineHeight: 1.5,
                        }}
                      >
                        {rink.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PRO TEAM CROSS-REFERENCE */}
        {proTeams.length > 0 && (
          <section
            style={{
              marginBottom: '3rem',
              padding: '1.75rem',
              background: `linear-gradient(135deg, ${card} 0%, #14161c 100%)`,
              border: `1px solid ${border}`,
              borderRadius: '14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                marginBottom: '0.875rem',
              }}
            >
              <span
                style={{
                  background: gold,
                  color: '#000',
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  padding: '0.25rem 0.625rem',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Pro
              </span>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: textMain, margin: 0 }}>
                {proTeams.length === 1
                  ? proTeams[0].league === 'EIHL'
                    ? `${proTeams[0].name} — ${proTeams[0].league}`
                    : `${proTeams[0].name}`
                  : `Professional Hockey in ${cityName}`}
              </h3>
            </div>
            <p style={{ fontSize: '0.9375rem', color: textMuted, marginBottom: '1.25rem', lineHeight: 1.6 }}>
              {proTeams.length === 1 && proTeams[0].league === 'EIHL' ? (
                <>
                  {cityName} is home to the <strong style={{ color: textMain }}>{proTeams[0].name}</strong>,
                  competing in the Elite Ice Hockey League (EIHL), the UK&apos;s top professional hockey league.
                </>
              ) : proTeams.length === 1 ? (
                <>
                  {cityName} is home to the <strong style={{ color: textMain }}>{proTeams[0].name}</strong>,
                  competing in the National Hockey League (NHL).
                </>
              ) : (
                <>
                  {cityName} is home to {proTeams.map((p, i) => (
                    <span key={p.name}>
                      {i > 0 && (i === proTeams.length - 1 ? ' and ' : ', ')}
                      <strong style={{ color: textMain }}>{p.name}</strong>
                    </span>
                  ))}, all competing in the National Hockey League (NHL).
                </>
              )}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link
                href={`/directory/${countrySlug}`}
                style={{
                  color: red,
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                ← All {countryName} hockey
              </Link>
              {proTeams.some(t => t.league === 'NHL') && (
                <Link
                  href="/directory/nhl"
                  style={{
                    color: red,
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  View All NHL Teams →
                </Link>
              )}
            </div>
          </section>
        )}

        {/* CITY FAQ — accordion, facts only (added 2026-07-07) */}
        {faqs && faqs.length > 0 && (
          <section
            aria-label={`Hockey FAQs about ${cityName}`}
            style={{ marginBottom: '3rem', maxWidth: '820px' }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                marginBottom: '1rem',
                color: textMain,
                borderLeft: `4px solid ${red}`,
                paddingLeft: '0.875rem',
                letterSpacing: '0.02em',
              }}
            >
              Frequently Asked Questions About Hockey in {cityName}
            </h2>
            <div style={{ display: 'grid', gap: '0.625rem' }}>
              {faqs.map((q, i) => (
                <details
                  key={i}
                  style={{
                    background: card,
                    border: `1px solid ${border}`,
                    borderRadius: '8px',
                    padding: '0.875rem 1.125rem',
                  }}
                >
                  <summary
                    style={{
                      fontWeight: 700,
                      fontSize: '0.9375rem',
                      color: textMain,
                      cursor: 'pointer',
                      listStyle: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <span>{q.question}</span>
                    <span aria-hidden style={{ color: red, fontSize: '1.125rem', flexShrink: 0, lineHeight: 1 }}>
                      +
                    </span>
                  </summary>
                  <p
                    style={{
                      color: textMuted,
                      fontSize: '0.875rem',
                      lineHeight: 1.65,
                      marginTop: '0.625rem',
                      marginBottom: 0,
                    }}
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: q.answer }}
                  />
                </details>
              ))}
            </div>
          </section>
        )}

        {/* RELATED ARTICLES — directory → article funnel */}
        <DirectoryRelatedArticles
          countryName={countryName}
          countrySlug={countrySlug}
          regionName={regionName}
          regionSlug={regionSlug}
          cityName={cityName}
          citySlug=""
        />

        {/* EXPLORE MORE */}
        <section
          style={{
            padding: '1.5rem',
            background: card,
            border: `1px solid ${border}`,
            borderRadius: '12px',
            marginBottom: '2rem',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.875rem', color: textMain }}>
            🗺️ Explore More Hockey
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {regionSlug && (
              <Link
                href={`/directory/${countrySlug}/${regionSlug}`}
                style={{
                  padding: '0.5rem 0.875rem',
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: '6px',
                  color: textMain,
                  fontSize: '0.8125rem',
                  textDecoration: 'none',
                }}
              >
                ← All {regionName} cities
              </Link>
            )}
            <Link
              href={`/directory/${countrySlug}`}
              style={{
                padding: '0.5rem 0.875rem',
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: '6px',
                color: textMain,
                fontSize: '0.8125rem',
                textDecoration: 'none',
              }}
            >
              {countryName} overview
            </Link>
            <Link
              href="/directory"
              style={{
                padding: '0.5rem 0.875rem',
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: '6px',
                color: textMain,
                fontSize: '0.8125rem',
                textDecoration: 'none',
              }}
            >
              All countries
            </Link>
          </div>
        </section>

        {/* EMPTY STATE */}
        {!hasData && (
          <section
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: card,
              border: `1px dashed ${border}`,
              borderRadius: '14px',
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏒</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: textMain, marginBottom: '0.75rem' }}>
              No hockey found in {cityName} yet
            </h2>
            <p style={{ fontSize: '1rem', color: textMuted, marginBottom: '1.5rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
              Help us build out the {cityName} directory! If you know of a team or rink in this area, add a listing.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link
                href="/add-listing"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  background: red,
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Add a listing →
              </Link>
              <Link
                href="/claim-your-listing"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  color: red,
                  border: `1px solid ${red}`,
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Claim a listing →
              </Link>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
