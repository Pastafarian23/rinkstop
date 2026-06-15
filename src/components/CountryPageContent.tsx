import Link from 'next/link';
import type { CountryPageData } from '@/lib/country-page';
import DirectoryRelatedArticles from '@/components/DirectoryRelatedArticles';
import CountryRinksList from '@/components/CountryRinksList';

interface Props {
  data: CountryPageData;
}

export default function CountryPageContent({ data }: Props) {
  const {
    countryName,
    countrySlug,
    rinks,
    teams,
    rinkCount,
    teamCount,
    leagueCount,
    playerCount,
    leagues,
    players,
    finalPosts,
    hasData,
    info,
    howToNote,
    nearestHockeyCountries,
    iihfMember,
    nationalTeams,
  } = data;

  const bg = '#0a0a0a', card = '#0f0f0f', border = '#1e1e1e', red = '#C8102E', textMain = '#fff', textMuted = '#888', textDim = '#555';
  const rinkN = rinkCount;
  const teamN = teamCount;
  const leagueN = leagueCount;
  const playerN = playerCount;
  // Prefer the live IIHF ranking over the hardcoded LEAGUE_INFO
  const iihfMensRank = iihfMember?.mens_ranking ? `#${iihfMember.mens_ranking}` : (info?.iihfRank ?? null);
  const iihfWomensRank = iihfMember?.womens_ranking ? `#${iihfMember.womens_ranking}` : null;

  // Build league name list for FAQ
  const topLeagueName = info?.league.split(',')[0] || (leagues?.[0]?.name ?? null);
  const womenLeague = leagues.find(l => {
    const n = (l?.name || '').toLowerCase();
    return n.includes('women') || n.includes('sdhl') || n.includes('naisten') || n.includes('pwhl');
  });

  // FAQ schema (8 Q&As)
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How many ice rinks are in ${countryName}?`,
        acceptedAnswer: { '@type': 'Answer', text: `RinkStop currently lists ${rinkN} ice rinks in ${countryName}. The directory covers public arenas, private clubs, and training facilities.` },
      },
      {
        '@type': 'Question',
        name: `What is the main hockey league in ${countryName}?`,
        acceptedAnswer: { '@type': 'Answer', text: topLeagueName ? `The top professional hockey league in ${countryName} is the ${topLeagueName}.` : `${countryName} has multiple hockey leagues; browse the full list on this page.` },
      },
      {
        '@type': 'Question',
        name: `How do I start playing hockey in ${countryName}?`,
        acceptedAnswer: { '@type': 'Answer', text: `Most players in ${countryName} start with a learn-to-skate program, then progress to a learn-to-play clinic through a local rink or club. The "How to play" section below has a step-by-step pathway.` },
      },
      {
        '@type': 'Question',
        name: `Is there women's hockey in ${countryName}?`,
        acceptedAnswer: { '@type': 'Answer', text: womenLeague ? `Yes. ${womenLeague.name} is a women's hockey league in ${countryName}. Many local rinks also run women-only recreational leagues.` : `Yes, ${countryName} has women's hockey programs. Most rinks run women-only recreational leagues in addition to any national women's league.` },
      },
      {
        '@type': 'Question',
        name: `Is hockey popular in ${countryName}?`,
        acceptedAnswer: { '@type': 'Answer', text: info?.note ? `Hockey in ${countryName}: ${info.note}. IIHF ranking: ${info.iihfRank ?? 'unranked'}.` : `Hockey has a dedicated community in ${countryName}. Browse the rinks, teams, and leagues listed on this page to see the local scene.` },
      },
      {
        '@type': 'Question',
        name: `How many registered hockey teams are in ${countryName}?`,
        acceptedAnswer: { '@type': 'Answer', text: `RinkStop's directory lists ${teamN} active hockey teams in ${countryName} across all levels and age groups.` },
      },
      {
        '@type': 'Question',
        name: `What is the IIHF ranking of ${countryName}?`,
        acceptedAnswer: { '@type': 'Answer', text: iihfMember?.mens_ranking ? `${countryName} is ranked #${iihfMember.mens_ranking} in the IIHF Men's World Ranking (as of ${iihfMember.ranking_as_of}).` : iihfMember ? `${countryName} is an IIHF ${iihfMember.iihf_status} member but does not currently hold a top-division ranking.` : `${countryName} is not currently an IIHF member nation.` },
      },
      {
        '@type': 'Question',
        name: `Does ${countryName} have an ice hockey national team?`,
        acceptedAnswer: { '@type': 'Answer', text: nationalTeams.length > 0 ? `Yes. ${countryName} fields ${nationalTeams.length} national team${nationalTeams.length === 1 ? '' : 's'} through the IIHF, including ${nationalTeams.slice(0, 2).map(t => t.team_name).join(' and ')}.` : `No IIHF national team record for ${countryName} in the RinkStop directory yet.` },
      },
      {
        '@type': 'Question',
        name: `Can my child start hockey at any age in ${countryName}?`,
        acceptedAnswer: { '@type': 'Answer', text: `Yes. Most programs in ${countryName} accept beginners from age 5–6, and many rinks offer adult learn-to-play programs for any age above 18.` },
      },
    ],
  };

  // Breadcrumb schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com' },
      { '@type': 'ListItem', position: 2, name: 'Directory', item: 'https://rinkstop.com/directory' },
      { '@type': 'ListItem', position: 3, name: countryName, item: `https://rinkstop.com/directory/${countrySlug}` },
    ],
  };

  // ItemList schema for rinks
  const rinksListSchema = rinks.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Ice rinks in ${countryName}`,
    numberOfItems: rinkN,
    itemListElement: rinks.slice(0, 10).map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { '@type': 'IceRink', name: r.name, address: r.address, url: r.website_url || `https://rinkstop.com/directory/rinks/${r.slug || r.id}` },
    })),
  } : null;

  // ItemList schema for teams
  const teamsListSchema = teams.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Hockey teams in ${countryName}`,
    numberOfItems: teamN,
    itemListElement: teams.slice(0, 10).map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { '@type': 'SportsTeam', name: t.name, url: `https://rinkstop.com/directory/teams/${t.slug || t.id}` },
    })),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {rinksListSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(rinksListSchema) }} />}
      {teamsListSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(teamsListSchema) }} />}

      <div style={{ background: bg, color: textMain, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        {/* Breadcrumb */}
        <div style={{ borderBottom: `1px solid ${border}`, background: '#0f0f0f' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 24px' }}>
            <nav style={{ fontSize: 13, color: textDim }}>
              <a href="/" style={{ color: textDim, textDecoration: 'none' }}>Home</a>
              <span style={{ margin: '0 6px' }}>›</span>
              <a href="/directory" style={{ color: textDim, textDecoration: 'none' }}>Directory</a>
              <span style={{ margin: '0 6px' }}>›</span>
              <span style={{ color: textMuted }}>{countryName}</span>
            </nav>
          </div>
        </div>

        {/* Hero */}
        <header style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 24px 32px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 'clamp(2.5rem, 8vw, 4rem)', color: textMain, letterSpacing: '0.04em', lineHeight: 1, marginBottom: 16 }}>
            HOCKEY IN {countryName.toUpperCase()}
          </h1>
          <p style={{ color: textMuted, fontSize: 16, maxWidth: 640, margin: '0 auto 24px' }}>
            {hasData
              ? `${info?.note || `Browse the complete hockey directory for ${countryName}.`}`
              : `Hockey has a growing presence in ${countryName}. Browse the directory, learn-to-play resources, and the closest active hockey countries.`
            }
          </p>
        </header>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px' }}>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 32 }}>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: red, lineHeight: 1 }}>{rinkN}</div>
              <div style={{ fontSize: 12, color: textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ice Rinks</div>
            </div>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: red, lineHeight: 1 }}>{teamN}</div>
              <div style={{ fontSize: 12, color: textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teams</div>
            </div>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: red, lineHeight: 1 }}>{leagueN}</div>
              <div style={{ fontSize: 12, color: textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leagues</div>
            </div>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: red, lineHeight: 1 }}>{playerN}</div>
              <div style={{ fontSize: 12, color: textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Players</div>
            </div>
            {iihfMensRank && (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: red, lineHeight: 1 }}>{iihfMensRank}</div>
                <div style={{ fontSize: 12, color: textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>IIHF Men&apos;s</div>
              </div>
            )}
            {iihfWomensRank && (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: red, lineHeight: 1 }}>{iihfWomensRank}</div>
                <div style={{ fontSize: 12, color: textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>IIHF Women&apos;s</div>
              </div>
            )}
            {info?.firstNhl && (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: red, lineHeight: 1 }}>{info.firstNhl}</div>
                <div style={{ fontSize: 12, color: textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>First NHL Player</div>
              </div>
            )}
            {iihfMember && (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: red, lineHeight: 1, textTransform: 'capitalize' }}>{iihfMember.iihf_status}</div>
                <div style={{ fontSize: 12, color: textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>IIHF Member</div>
              </div>
            )}
            {iihfMember?.mens_division && (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: red, lineHeight: 1.1 }}>{iihfMember.mens_division}</div>
                {iihfMember.mens_division_rank && (
                  <div style={{ fontSize: 11, color: red, fontWeight: 700, marginTop: 2 }}>
                    Ranked #{iihfMember.mens_division_rank} in division
                  </div>
                )}
                <div style={{ fontSize: 12, color: textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>IIHF Division (2025)</div>
              </div>
            )}
          </div>

          {/* SEO editorial section — added 2026-06-15.
              Server-rendered, appears on every country page. Targets
              the kind of queries people actually search for country
              pages: "hockey in {country}", "ice rinks in {country}",
              "hockey teams in {country}", etc. Renders between the
              stats grid and the data sections so it shows up early
              in the page HTML and Google can extract snippets. */}
          {hasData && (
            <section style={{ marginBottom: 48, color: textMuted, fontSize: '0.9375rem', lineHeight: 1.7, background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '24px 28px' }}>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', color: textMain, marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
                Hockey in {countryName}
              </h2>
              <p style={{ marginBottom: '0.875rem' }}>
                {countryName} has {rinkN} ice rink{rinkN === 1 ? '' : 's'}, {teamN} active hockey team{teamN === 1 ? '' : 's'}, {leagueN} league{leagueN === 1 ? '' : 's'} and {playerN} player{playerN === 1 ? '' : 's'} on file in the RinkStop directory.
                {iihfMember ? ` ${countryName} is ${iihfMember.iihf_status ? `a ${iihfMember.iihf_status} member` : 'a member'} of the International Ice Hockey Federation (IIHF)${iihfMensRank ? ` and the men\u2019s national team is currently ranked ${iihfMensRank} in the world` : ''}${iihfWomensRank ? `, with the women\u2019s national team at ${iihfWomensRank}` : ''}.` : ''}
              </p>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: textMain, marginTop: '1rem', marginBottom: '0.5rem' }}>
                Finding hockey in {countryName}
              </h3>
              <p style={{ marginBottom: '0.875rem' }}>
                The teams listed on this page are organized by league. {topLeagueName ? `The top professional league is the ${topLeagueName}.` : 'There are multiple leagues competing at different levels.'}
                {leagues && leagues.length > 1 ? ` Below you can browse ${leagues.length} league${leagues.length === 1 ? '' : 's'} from professional to amateur, including ${womenLeague ? `women\u2019s hockey in the ${womenLeague.name}` : `women\u2019s programs where available`}.` : ''}
                Each team has a roster page with arena info, the league they play in, and a link to the team\u2019s official site.
              </p>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: textMain, marginTop: '1rem', marginBottom: '0.5rem' }}>
                Where to play hockey in {countryName}
              </h3>
              <p>
                New players should start with a learn-to-skate program at one of the {rinkN} rink{rinkN === 1 ? '' : 's'} on this page. Most rinks also run learn-to-play hockey clinics for both kids and adults. Registration with {iihfMember ? `the national federation` : 'your local rink'} is typically required before joining a team. The \u201cHow to play\u201d section below has a step-by-step pathway from first-time skater to league play.
              </p>
            </section>
          )}

          {/* No data state */}
          {!hasData && (
            <div style={{ textAlign: 'center', padding: '60px 24px', background: card, border: `1px solid ${border}`, borderRadius: 12, marginBottom: 48 }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏒</div>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.75rem', color: textMain, marginBottom: '0.75rem' }}>
                NO HOCKEY LISTINGS IN {countryName.toUpperCase()} YET
              </h2>
              <p style={{ color: textMuted, fontSize: 16, maxWidth: 480, margin: '0 auto 1.5rem' }}>
                Know a hockey team, rink, or league in {countryName}? Help us grow the world&apos;s hockey directory!
              </p>
              <Link href="/add-listing" style={{ display: 'inline-block', background: red, color: '#fff', padding: '12px 24px', borderRadius: 6, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                + Add Hockey in {countryName}
              </Link>
            </div>
          )}

          {/* Closest active hockey markets (no-data countries only) */}
          {!hasData && nearestHockeyCountries.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
                <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 26, letterSpacing: '0.04em', color: textMain, margin: 0 }}>
                  Closest Active Hockey Markets
                </h2>
                <span style={{ fontSize: 12, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {countryName} has no permanent rink — the nearest options are below
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {nearestHockeyCountries.map(n => (
                  <Link key={n.slug} href={`/directory/${n.slug}`} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '16px 18px', textDecoration: 'none', display: 'block', position: 'relative' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: textMain, marginBottom: 8 }}>
                      <span style={{ position: 'absolute', inset: 0, zIndex: 0 }} aria-hidden="true" />
                      <span style={{ position: 'relative', zIndex: 1 }}>Hockey in {n.name}</span>
                    </div>
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 14, fontSize: 12, color: textMuted }}>
                      <span style={{ color: red, fontWeight: 700 }}>{n.rinkCount}</span><span>rinks</span>
                      <span style={{ color: red, fontWeight: 700 }}>{n.teamCount}</span><span>teams</span>
                    </div>
                  </Link>
                ))}
              </div>
              <p style={{ color: textDim, fontSize: 13, marginTop: 16, lineHeight: 1.5 }}>
                Most rinks in these countries run public skate sessions, learn-to-play programs, and adult recreational leagues. If you&apos;re traveling to play or coach, contact the rink in advance — many require international federation registration (IIHF transfer) for organized play.
              </p>
            </section>
          )}

          {/* Hockey Ecosystem Snapshot */}
          {(info || hasData || iihfMember) && (
            <section style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '24px 28px', marginBottom: 48 }}>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 22, letterSpacing: '0.04em', color: textMain, marginBottom: 12 }}>
                Hockey ecosystem in {countryName}
              </h2>
              <p style={{ color: textMuted, fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                {howToNote
                  ? howToNote
                  : hasData
                    ? `${countryName} has ${rinkN} ice rinks, ${teamN} active teams, and ${leagueN} leagues in the RinkStop directory. ${info?.note || ''}`
                    : iihfMember
                      ? `${countryName} is a ${iihfMember.iihf_status} member of the IIHF${iihfMember.date_joined ? `, joining on ${new Date(iihfMember.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}. ${iihfMember.organization ? `The national federation is ${iihfMember.organization}.` : ''} RinkStop lists ${rinkN} ${rinkN === 1 ? 'rink' : 'rinks'} in the country. ${info?.note || ''}`
                      : `Hockey is an emerging or developing sport in ${countryName}. The page below includes learn-to-play resources and the closest established hockey markets.`
                }
              </p>
            </section>
          )}

          {/* National Teams Section — visible whenever we have IIHF data */}
          {iihfMember && nationalTeams.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
                <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 26, letterSpacing: '0.04em', color: textMain, margin: 0 }}>
                  National Teams in {countryName}
                </h2>
                <span style={{ fontSize: 12, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {iihfMember.iihf_status === 'full' ? 'IIHF Full Member' : iihfMember.iihf_status === 'associate' ? 'IIHF Associate Member' : 'IIHF Member'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {nationalTeams.map(t => {
                  const typeLabel = t.team_type === 'mens' ? "Men's" : t.team_type === 'womens' ? "Women's" : t.team_type === 'mens_u20' ? "Men's U20" : t.team_type === 'mens_u18' ? "Men's U18" : "Women's U18";
                  return (
                    <div key={t.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{typeLabel}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: textMain, marginBottom: 6, lineHeight: 1.3 }}>
                        {countryName} {typeLabel}
                      </div>
                      <div style={{ fontSize: 12, color: t.ranking ? red : textMuted, fontWeight: t.ranking ? 700 : 400 }}>
                        {t.ranking_label || 'Unranked'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Directory completeness note — shown when rinks exist but teams/leagues are sparse */}
          {rinkCount > 0 && (teamCount === 0 || leagueCount === 0) && (
            <section style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 48, borderLeft: `4px solid ${red}` }}>
              <p style={{ color: textMuted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: textMain }}>Directory status:</strong>{' '}
                RinkStop currently lists {rinkCount} {rinkCount === 1 ? 'rink' : 'rinks'} in {countryName},
                {' '}{teamCount === 0 ? 'no club teams' : `${teamCount} teams`}
                {leagueCount > 0 ? `, and ${leagueCount} ${leagueCount === 1 ? 'league' : 'leagues'}` : ', and no leagues yet'}.
                {' '}Hockey {iihfMember ? `is governed by ${iihfMember.organization || 'the national federation'}` : 'is emerging'} in {countryName}.
                {' '}{teamCount === 0 || leagueCount === 0 ? (
                  <>Help us complete this directory — <Link href="/add-listing" style={{ color: red, fontWeight: 700, textDecoration: 'underline' }}>add a team or league in {countryName}</Link>.</>
                ) : null}
              </p>
            </section>
          )}

          {/* Leagues Section */}
          {leagues.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
                <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 26, letterSpacing: '0.04em', color: textMain, margin: 0 }}>
                  Hockey Leagues in {countryName}
                </h2>
                <Link href="/directory/leagues" style={{ fontSize: 12, color: red, textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  All leagues →
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                {leagues.map(l => (
                  <Link key={l.id} href={`/directory/leagues/${l.slug}`} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 16px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                    {l.logo_url ? (
                      <img src={l.logo_url} alt="" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0, borderRadius: 4 }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 4, background: '#1a1a1a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏆</div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                      <div style={{ fontSize: 11, color: textMuted, textTransform: 'capitalize' }}>{l.level}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Teams Section */}
          {teams.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
                <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 26, letterSpacing: '0.04em', color: textMain, margin: 0 }}>
                  Hockey Teams in {countryName}
                </h2>
                <Link href={`/directory/teams?country=${encodeURIComponent(countryName)}`} style={{ fontSize: 12, color: red, textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  All {teamN} teams →
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {teams.map(team => (
                  <Link key={team.id} href={`/directory/teams/${team.slug || team.id}`} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 16px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                    {team.logo_url ? (
                      <img src={team.logo_url} alt="" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0, borderRadius: 4 }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: 4, background: '#1a1a1a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🏒</div>
                    )}
                    <span style={{ fontSize: 14, fontWeight: 600, color: textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', position: 'relative', zIndex: 1 }}>{team.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Rinks Section */}
          {rinks.length > 0 && (
            <CountryRinksList
              rinks={rinks}
              countryName={countryName}
              countrySlug={countrySlug}
              totalCount={rinkCount}
              card={card}
              border={border}
              red={red}
              textMain={textMain}
              textMuted={textMuted}
              textDim={textDim}
            />
          )}

          {/* Featured Players Section */}
          {players.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 26, letterSpacing: '0.04em', color: textMain, marginBottom: 16, borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
                Featured Hockey Players from {countryName}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {players.map(p => (
                  <Link key={p.id} href={`/directory/players/${p.slug || p.id}`} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 12px', textDecoration: 'none', textAlign: 'center', position: 'relative' }}>
                    {p.headshot_url ? (
                      <img src={p.headshot_url} alt="" style={{ width: 56, height: 56, objectFit: 'cover', flexShrink: 0, borderRadius: '50%', margin: '0 auto 8px', display: 'block' }} />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1a1a1a', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧑</div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 700, color: textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.first_name} {p.last_name}
                    </div>
                    {p.position && <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{p.position}</div>}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* How to Play Hockey in {Country} — Reusable Section */}
          <section style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '32px 28px', marginBottom: 48 }}>
            <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 26, letterSpacing: '0.04em', color: textMain, marginBottom: 8, borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
              How to Play Hockey in {countryName}
            </h2>
            <p style={{ color: textMuted, fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
              A practical guide for beginners, newcomers to {countryName}, and parents looking to get their child into the sport.
            </p>
            <ol style={{ color: textMain, fontSize: 15, lineHeight: 1.7, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 14 }}>
              {[
                { title: 'Learn to skate first', body: `Most hockey players in ${countryName} start with skating lessons. Many rinks run learn-to-skate programs for ages 3+ that teach the basics of balance, edges, and stopping — the foundations of hockey.` },
                { title: 'Try a learn-to-play clinic', body: `Most local rinks and clubs run learn-to-play programs for beginners. These typically run 6–8 weeks, provide loaner equipment, and cost between $50–$300. ${hasData ? `Browse rinks above and contact one directly to ask about upcoming sessions.` : 'Search for nearby rinks in the closest active hockey country.'}` },
                { title: 'Join a youth or adult recreational team', body: `After learn-to-play, most players in ${countryName} join a house league or recreational team. These run weekly practices and games at the local rink and are the most common entry point to organized hockey.` },
                { title: 'Register with the national federation', body: `${info ? info.note || '' : `Most countries require player registration with the national ice hockey federation.`} In the US this is USA Hockey, in Canada it's Hockey Canada, and in Europe each country has its own federation. Registration is typically annual and includes insurance.` },
                { title: 'Progress through the development pathway', body: `Talented players in ${countryName} typically progress through age-group teams (U8, U10, U12...) into travel or select teams, then junior leagues, and eventually professional or collegiate hockey. The pathway differs by country but generally follows the IIHF development model.` },
              ].map((step, i) => (
                <li key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 12, alignItems: 'start' }}>
                  <div style={{ background: red, color: '#fff', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: textMain, marginBottom: 2 }}>{step.title}</div>
                    <div style={{ color: textMuted, fontSize: 14, lineHeight: 1.55 }}>{step.body}</div>
                  </div>
                </li>
              ))}
            </ol>
            <div style={{ marginTop: 24, padding: '14px 18px', background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.25)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: textMain, fontWeight: 600, marginBottom: 4 }}>Know something we&apos;re missing?</div>
              <div style={{ fontSize: 13, color: textMuted, lineHeight: 1.5 }}>
                Help us keep the {countryName} hockey directory accurate.{' '}
                <Link href="/add-listing" style={{ color: red, textDecoration: 'underline' }}>Add or update a rink, team, or league →</Link>
              </div>
            </div>
          </section>

          {/* Related Articles */}
          {finalPosts.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 26, letterSpacing: '0.04em', color: textMain, marginBottom: 16, borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
                Related Hockey Articles
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {finalPosts.map(post => (
                  <Link key={post.id} href={`/blog/${post.slug}`} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '16px 20px', textDecoration: 'none', display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        {post.category && (
                          <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 3, background: 'rgba(200,16,46,0.15)', color: red, marginBottom: 6 }}>
                            {post.category}
                          </span>
                        )}
                        <div style={{ fontWeight: 700, fontSize: 15, color: textMain, lineHeight: 1.35, marginBottom: 4 }}>{post.title}</div>
                        {post.subtitle && <div style={{ color: textMuted, fontSize: 13, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{post.subtitle}</div>}
                        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: textDim, marginTop: 6 }}>
                          <span>{post.author_name || 'Arnel'}</span>
                          <span>·</span>
                          <span>{post.reading_time_minutes || 5} min read</span>
                        </div>
                      </div>
                      <span style={{ color: red, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Read →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* FAQ Section (visible) */}
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 26, letterSpacing: '0.04em', color: textMain, marginBottom: 20, borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
              Frequently Asked Questions About Hockey in {countryName}
            </h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {faqSchema.mainEntity.map((q, i) => (
                <details key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 18px' }}>
                  <summary style={{ fontWeight: 700, fontSize: 15, color: textMain, cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <span>{q.name}</span>
                    <span style={{ color: red, fontSize: 18, flexShrink: 0 }}>+</span>
                  </summary>
                  <p style={{ color: textMuted, fontSize: 14, lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>
                    {q.acceptedAnswer.text}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* Related Articles */}
          <DirectoryRelatedArticles
            countryName={countryName}
            countrySlug={countrySlug}
          />

          {/* Back to Directory */}
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link href="/directory" style={{ color: red, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>← Browse all countries</Link>
          </div>
        </div>
      </div>
    </>
  );
}
