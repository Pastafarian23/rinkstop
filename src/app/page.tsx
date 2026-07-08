import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import HomeSearch from '@/app/HomeSearch';
import HighlightsGrid from '@/components/HighlightsGrid';
import TicketmasterAd from '@/components/TicketmasterAd';
import HomeNewsSection from '@/app/components/HomeNewsSection';
import HomeCtaButtons from '@/components/HomeCtaButtons';

// Home page is rendered statically with ISR (revalidate every 5 min).
// The page runs 9 Supabase queries for the stats grid + recent sections;
// force-dynamic made every request re-run those queries (1+ second TTFB).
// 5-min staleness on directory counts is fine — users see counts as
// approximate and they update regularly with weekly content drops.
//
// Cache invalidation: also runs on `revalidatePath('/')` from any admin
// action that changes rinks/teams/players/leagues counts.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'RinkStop — The World’s Hockey Directory',
  description:
    'Find hockey anywhere in the world. 800+ cities, 50+ countries, 900+ rinks, 2,100+ teams, 6,300+ players, 190+ leagues — searchable by city, state, or country. Free directory of ice rinks, pro teams, junior clubs, college programs, and player profiles.',
  keywords: [
    'hockey directory',
    'ice rink directory',
    'hockey teams',
    'hockey rinks',
    'hockey players',
    'NHL directory',
    'youth hockey',
    'hockey leagues',
    'find a hockey rink',
    'hockey near me',
  ],
  alternates: { canonical: 'https://rinkstop.com/' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'RinkStop — The World’s Hockey Directory',
    description:
      'Find hockey anywhere in the world. 800+ cities, 50+ countries, 900+ rinks, 2,100+ teams, 6,300+ players, 190+ leagues.',
    url: 'https://rinkstop.com/',
    siteName: 'RinkStop',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://rinkstop.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'RinkStop — The World’s Hockey Directory',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RinkStop — The World’s Hockey Directory',
    description:
      'Find hockey anywhere in the world. 800+ cities, 50+ countries, 900+ rinks, 2,100+ teams, 6,300+ players, 190+ leagues.',
    images: ['https://rinkstop.com/og-image.png'],
  },
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TOP_CITIES = [
  { name: 'Toronto',   country: 'CA', href: '/directory/canada/ontario/toronto' },
  { name: 'Montreal',  country: 'CA', href: '/directory/canada/quebec/montreal' },
  { name: 'Boston',    country: 'US', href: '/directory/united-states/massachusetts/boston' },
  { name: 'New York',  country: 'US', href: '/directory/united-states/new-york/new-york' },
  { name: 'Chicago',   country: 'US', href: '/directory/united-states/illinois/chicago' },
  { name: 'Detroit',   country: 'US', href: '/directory/united-states/michigan/detroit' },
  { name: 'Pittsburgh',country: 'US', href: '/directory/united-states/pennsylvania/pittsburgh' },
  { name: 'Edmonton',  country: 'CA', href: '/directory/canada/alberta/edmonton' },
];

const CATEGORIES = [
  { label: 'Teams',      href: '/directory/teams',  color: '#C8102E', desc: 'Pro, junior & youth clubs worldwide' },
  { label: 'Players',    href: '/directory/players', color: '#2563EB', desc: 'Profiles, stats & career histories' },
  { label: 'Leagues',    href: '/directory/leagues', color: '#D97706', desc: 'NHL, AHL, KHL, IIHF, NCAA & more' },
  { label: 'Rinks',      href: '/directory/rinks',   color: '#059669', desc: 'Ice arenas in every country' },
  { label: 'Brands',     href: '/directory/brands',  color: '#7C3AED', desc: 'Equipment & gear manufacturers' },
  { label: 'Scores',     href: '/directory/games',   color: '#C8102E', desc: 'Results, standings & schedules' },
  { label: 'Highlights', href: '/highlights',        color: '#FFB81C', desc: 'Top goals, saves & game recaps' },
  { label: 'Staff',      href: '/directory/staff',   color: '#14B8A6', desc: 'Coaches, officials & scouts' },
];

function approx(n: number) {
  if (n >= 1000) return `${Math.floor(n / 100) * 100}+`;
  if (n >= 100)  return `${Math.floor(n / 10) * 10}+`;
  if (n >= 10)   return `${Math.floor(n / 5) * 5}+`;
  return `${n}+`;
}

export default async function Home() {
  // One RPC call replaces 9 separate Supabase round-trips. The RPC does
  // counts + dedupe + joins in PostgreSQL and returns a single JSONB doc.
  // See supabase/migrations/2026-06-18_get_directory_stats.sql.
  //
  // With revalidate=300 (set above) the result is cached by Vercel for 5
  // minutes; only the first request after expiry runs the RPC. This brings
  // home page TTFB from ~1s to ~50ms after warmup.
  const { data: statsData, error: statsError } = await supabase.rpc('get_directory_stats');
  const stats = (statsData || {}) as {
    rinks: number; teams: number; players: number; leagues: number;
    cities: number; countries: number;
    recent_rinks: Array<{ id: string; name: string; slug: string; city: string | null; country: string | null }>;
    recent_teams: Array<{ id: string; name: string; slug: string; city: string | null; league_id: string | null; league_name: string | null }>;
    upcoming_games: Array<{ id: string; date: string; home_team_name: string | null; away_team_name: string | null; venue_name: string | null }>;
  };
  if (statsError) {
    console.error('[home] get_directory_stats failed:', statsError);
  }

  const counts = {
    rinks: stats.rinks || 0,
    teams: stats.teams || 0,
    players: stats.players || 0,
    leagues: stats.leagues || 0,
    cities: stats.cities || 0,
    countries: stats.countries || 0,
  };

  const recentRinks = stats.recent_rinks || [];
  const recentTeams = stats.recent_teams || [];
  const upcomingGames = stats.upcoming_games || [];

  // Phase 8 Path B — Featured Rinks on homepage.
  // Definition: active rinks with photos, ordered by updated_at DESC.
  // Rationale: today, no paid featured-placement customers exist yet (the
  // listings.is_featured column is for businesses, not rinks). A "featured"
  // block that uses activity recency is honest: the listed rinks are being
  // actively maintained. When Business Plus+ customers start paying for
  // rink placement, this query becomes a two-tier check (is_featured first,
  // then recency fallback).
  type FeaturedRink = {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    country: string | null;
    cover_photo_url: string | null;
    updated_at: string | null;
  };
  const { data: featuredRinksData } = await supabase
    .from('rinks')
    .select('id, slug, name, city, country, cover_photo_url, updated_at')
    .eq('is_active', true)
    .not('cover_photo_url', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(6);
  const featuredRinks: FeaturedRink[] = (featuredRinksData || []) as FeaturedRink[];

  const ldJson = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://rinkstop.com/#website',
        url: 'https://rinkstop.com/',
        name: 'RinkStop',
        description:
          'The World’s Hockey Directory — searchable database of rinks, teams, players, and leagues worldwide.',
        inLanguage: 'en-US',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://rinkstop.com/directory?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': 'https://rinkstop.com/#organization',
        name: 'RinkStop',
        alternateName: 'RinkStop.com',
        legalName: 'RinkStop',
        url: 'https://rinkstop.com/',
        logo: 'https://rinkstop.com/rinkstoplogo.png',
        image: 'https://rinkstop.com/rinkstoplogo.png',
        description: "The world's hockey directory — a global database of ice rinks, hockey teams, players, and leagues. Founded in 2018 by Arnel Larracas, headquartered in Wood Dale, Illinois.",
        slogan: "The World's Hockey Directory",
        foundingDate: '2018',
        founder: {
          '@type': 'Person',
          name: 'Arnel Larracas',
          jobTitle: 'Founder',
        },
        address: {
          '@type': 'PostalAddress',
          streetAddress: '250 S Central Ave',
          addressLocality: 'Wood Dale',
          addressRegion: 'IL',
          postalCode: '60191',
          addressCountry: 'US',
        },
        areaServed: [
          { '@type': 'Place', name: 'Worldwide' },
          { '@type': 'Country', name: 'United States' },
          { '@type': 'Country', name: 'Canada' },
        ],
        knowsAbout: [
          'Ice Hockey', 'Hockey Teams', 'Ice Rinks', 'Hockey Leagues',
          'Hockey Players', 'NHL', 'NCAA Hockey', 'Junior Hockey', 'PWHL',
        ],
        sameAs: [
          'https://twitter.com/rinkstopnews',
          'https://www.facebook.com/rinkstop',
          'https://www.instagram.com/rinkstop',
          'https://www.linkedin.com/company/rinkstop/',
        ],
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: 'support@rinkstop.com',
            availableLanguage: 'English',
          },
          {
            '@type': 'ContactPoint',
            contactType: 'founder',
            email: 'hello@rinkstop.com',
            availableLanguage: 'English',
          },
        ],
      },
      {
        '@type': 'ItemList',
        name: 'Top Hockey Cities',
        itemListElement: TOP_CITIES.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.name,
          url: `https://rinkstop.com${c.href}`,
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />

      {/* ---- HERO -------------------------------------------------------------------- */}
      <section style={{
        position: 'relative',
        background: 'linear-gradient(140deg, #041E42 0%, #0A2E5C 55%, #0D1117 100%)',
        overflow: 'hidden',
      }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none' }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="rink-bg" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                <circle cx="60" cy="60" r="50" fill="none" stroke="white" strokeWidth="1"/>
                <line x1="0" y1="60" x2="120" y2="60" stroke="white" strokeWidth="0.5"/>
                <line x1="60" y1="0" x2="60" y2="120" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#rink-bg)"/>
          </svg>
        </div>
        <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#C8102E' }}/>

        <div className="container" style={{ position: 'relative', zIndex: 2, paddingTop: '3rem', paddingBottom: '3rem' }}>
          <div className="hero-grid">
            <div>
              <div className="label">The Global Hockey Directory</div>

              <h1 className="font-sport" style={{ fontSize: 'clamp(2.25rem, 9vw, 5rem)', color: '#fff', lineHeight: 0.95, marginBottom: '0.5rem' }}>
                THE GLOBAL
              </h1>
              <h1 className="font-sport" style={{ fontSize: 'clamp(2.25rem, 9vw, 5rem)', color: '#C8102E', lineHeight: 0.95, marginBottom: '1rem' }}>
                HOCKEY DIRECTORY
              </h1>

              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 'clamp(0.9375rem, 2.5vw, 1.0625rem)', lineHeight: 1.55, marginBottom: '1.5rem', maxWidth: '480px' }}>
                <strong style={{ color: '#fff' }}>Find hockey anywhere in the world.</strong>{' '}
                {approx(counts.cities)} cities in {counts.countries} countries,{' '}
                {approx(counts.rinks)} rinks, {approx(counts.teams)} teams,{' '}
                {approx(counts.players)} players, {approx(counts.leagues)} leagues — searchable by city, state, or country.
              </p>

              <HomeSearch />

              <HomeCtaButtons />
            </div>

            <div className="stats-grid">
              {[
                { n: counts.teams,   l: 'Teams' },
                { n: counts.players, l: 'Players' },
                { n: counts.leagues, l: 'Leagues' },
                { n: counts.rinks,   l: 'Rinks' },
              ].map(s => (
                <div key={s.l} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: 'clamp(0.875rem, 3vw, 1.5rem)',
                  textAlign: 'center',
                }}>
                  <div className="font-sport" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', color: '#C8102E', lineHeight: 1, marginBottom: '0.25rem' }}>
                    {s.n.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- CATEGORIES ------------------------------------------------------------------- */}
      <section className="section-py" style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container">
          <div className="sec-head">
            <div>
              <div className="label">Browse</div>
              <h2 className="font-sport" style={{ fontSize: 'clamp(1.625rem, 4vw, 2.25rem)', color: '#fff' }}>THE DIRECTORY</h2>
            </div>
            <Link href="/directory" className="sec-link">View All →</Link>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map(c => (
              <Link key={c.href} href={c.href} className="card" style={{ textDecoration: 'none' }}>
                <div style={{ padding: 'clamp(0.875rem, 2.5vw, 1.375rem)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.2rem', gap: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff' }}>{c.label}</span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: c.color, flexShrink: 0 }}>
                      {c.href === '/highlights' ? 'Video' :
                       c.href === '/directory/games' ? 'Live' :
                       approx(
                         c.href === '/directory/teams'   ? counts.teams   :
                         c.href === '/directory/players' ? counts.players :
                         c.href === '/directory/leagues' ? counts.leagues :
                         c.href === '/directory/rinks'   ? counts.rinks   :
                         c.href === '/directory/brands'  ? 32             :
                         c.href === '/directory/staff'   ? 800            : 0
                       )}
                    </span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.75rem', lineHeight: 1.5 }}>{c.desc}</p>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.875rem 0 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <TicketmasterAd size="468x60" />
          </div>
        </div>
      </section>

      {/* ---- E-E-A-T INTRO (server-rendered, full HTML, crawlable text) ------------- */}
      <section style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '2.5rem 0' }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <h2 className="font-sport" style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', color: '#fff', marginBottom: '0.75rem' }}>
            THE WORLD’S HOCKEY DIRECTORY
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.7, margin: 0 }}>
            RinkStop is the largest free, searchable directory of ice hockey rinks, teams, players, and leagues anywhere on the web.
            Whether you’re looking for a <Link href="/directory/rinks" style={{ color: '#FFB81C', textDecoration: 'underline' }}>hockey rink near you</Link>,
            scouting <Link href="/directory/teams" style={{ color: '#FFB81C', textDecoration: 'underline' }}>youth and amateur teams</Link> by city or league,
            tracking <Link href="/directory/players" style={{ color: '#FFB81C', textDecoration: 'underline' }}>player profiles and career stats</Link>,
            or following your favorite <Link href="/directory/leagues" style={{ color: '#FFB81C', textDecoration: 'underline' }}>league</Link>’s schedule,
            RinkStop puts the whole hockey world in one place. Browse NHL, AHL, KHL, NCAA, IIHF, PWHL, and hundreds of junior, women’s, and amateur leagues.
            Every listing is open to the public, free to browse, and free to claim.
          </p>
        </div>
      </section>

      {/* ---- TOP HOCKEY CITIES ----------------------------------------------------------- */}
      <section className="section-py" style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container">
          <div className="sec-head">
            <div>
              <div className="label">Featured</div>
              <h2 className="font-sport" style={{ fontSize: 'clamp(1.625rem, 4vw, 2.25rem)', color: '#fff' }}>TOP HOCKEY CITIES</h2>
            </div>
            <Link href="/directory/united-states" className="sec-link">All US Cities →</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.625rem' }}>
            {TOP_CITIES.map(city => (
              <Link
                key={city.name}
                href={city.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.25rem 0.75rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', color: '#C8102E', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  {city.country}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff' }}>{city.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---- LATEST HIGHLIGHTS ----------------------------------------------------------- */}
      <section className="section-py" style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container">
          <HighlightsGrid limit={8} columns={4} title="LATEST HIGHLIGHTS" />
        </div>
      </section>

      <HomeNewsSection />

      <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
        <TicketmasterAd size="300x250" />
      </div>

      {/* ---- RECENT ACTIVITY ------------------------------------------------------------- */}
      {(recentRinks.length > 0 || recentTeams.length > 0 || upcomingGames.length > 0) && (
        <section style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '2.5rem 0' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

              {recentRinks.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.125rem', color: '#fff', letterSpacing: '0.05em' }}>NEW RINKS ADDED</h3>
                    <Link href="/directory/rinks" style={{ color: '#C8102E', fontSize: '0.75rem', fontWeight: 600 }}>View All →</Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {recentRinks.map((r: any) => (
                      <Link key={r.id} href={`/directory/rinks/${r.slug}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>{r.name}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>{r.city}, {r.country}</div>
                        </div>
                        <span style={{ color: '#059669', fontSize: '0.6875rem', fontWeight: 700 }}>NEW</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {recentTeams.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.125rem', color: '#fff', letterSpacing: '0.05em' }}>NEW TEAMS JOINED</h3>
                    <Link href="/directory/teams" style={{ color: '#C8102E', fontSize: '0.75rem', fontWeight: 600 }}>View All →</Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {recentTeams.map((t: any) => (
                      <Link key={t.id} href={`/directory/teams/${t.slug}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>{t.name}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>
                            {t.league_name || 'Independent'}{t.city ? ` · ${t.city}` : ''}
                          </div>
                        </div>
                        <span style={{ color: '#2563EB', fontSize: '0.6875rem', fontWeight: 700 }}>NEW</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {upcomingGames.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.125rem', color: '#fff', letterSpacing: '0.05em' }}>UPCOMING GAMES</h3>
                    <Link href="/directory/games" style={{ color: '#C8102E', fontSize: '0.75rem', fontWeight: 600 }}>All Games →</Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {upcomingGames.map((g: any) => {
                      const d = new Date(g.date + 'T00:00:00');
                      return (
                        <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>{g.away_team_name} @ {g.home_team_name}</div>
                            <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>{g.venue_name || 'TBD'}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.5rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#FFB81C' }}>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ---- FEATURED RINKS (Phase 8 Path B) ---------------------------------------------- */}
      {featuredRinks.length > 0 && (
        <section style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '3rem 0' }}>
          <div className="container">
            <div className="sec-head">
              <div>
                <div className="label" style={{ color: '#FFB81C' }}>Featured</div>
                <h2 className="font-sport" style={{ fontSize: 'clamp(1.625rem, 4vw, 2.25rem)', color: '#fff' }}>
                  FEATURED RINKS
                </h2>
              </div>
              <Link href="/directory/rinks" className="sec-link">View All →</Link>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1rem',
            }}>
              {featuredRinks.map((rink) => {
                const location = [rink.city, rink.country].filter(Boolean).join(', ');
                return (
                  <Link
                    key={rink.id}
                    href={`/directory/rinks/${rink.slug}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      background: '#0f0f0f',
                      border: '1px solid #1e1e1e',
                      borderRadius: 10,
                      overflow: 'hidden',
                      textDecoration: 'none',
                      transition: 'transform 0.18s, border-color 0.18s',
                    }}
                  >
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16 / 10',
                      backgroundImage: rink.cover_photo_url ? `url(${rink.cover_photo_url})` : 'linear-gradient(135deg, #041E42 0%, #0a2a5a 100%)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}>
                      <span style={{
                        position: 'absolute',
                        top: '0.5rem',
                        left: '0.5rem',
                        background: '#FFB81C',
                        color: '#041E42',
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '0.2rem 0.55rem',
                        borderRadius: 2,
                      }}>
                        FEATURED
                      </span>
                    </div>
                    <div style={{ padding: '0.85rem 1rem', flex: 1 }}>
                      <div style={{
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        marginBottom: '0.25rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {rink.name}
                      </div>
                      {location && (
                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
                          {location}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ---- CTA BAND -------------------------------------------------------------------- */}
      <section style={{ background: 'linear-gradient(135deg, #C8102E 0%, #9B0D23 100%)', padding: 'clamp(2rem, 5vw, 3rem) 0' }}>
        <div className="container">
          <div className="cta-flex">
            <div>
              <h2 className="font-sport" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: '#fff', marginBottom: '0.375rem' }}>
                CLAIM YOUR FREE PROFILE
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)', maxWidth: '540px' }}>
                Already in our directory? Claim your team, rink, or league to add photos, schedules, contact info, and updates. Free forever.
              </p>
            </div>
            <div className="cta-btns">
              <Link href="/sign-up" className="btn btn-white">Claim Your Profile</Link>
              <Link href="/add-listing" className="btn btn-ghost" style={{ borderColor: 'rgba(255,255,255,0.4)' }}>+ Add a Listing</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- MEMBERSHIP (pricing teaser) ----------------------------------------------------- */}
      <section style={{ background: 'linear-gradient(180deg, #0D1117 0%, #041E42 100%)', padding: 'clamp(2.5rem, 6vw, 4rem) 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 2rem' }}>
            <div className="label" style={{ color: '#FFB81C' }}>Membership</div>
            <h2 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', color: '#fff', marginBottom: '0.625rem' }}>
              PICK THE PLAN THAT FITS
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(0.9375rem, 2vw, 1rem)', margin: 0, lineHeight: 1.6 }}>
              Free is free, forever. Verified Identity ($24.99) unlocks profile claims. Identity Plus ($59.99) adds Family Hub and advanced analytics. Club Starter ($149) for small clubs, Club Pro ($399) for mid-sized clubs, Club Elite ($999) for large clubs. Business Listing ($99) and Business Plus ($299) for commercial businesses. Federation is custom for enterprise-scale organizations.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', maxWidth: '1100px', margin: '0 auto' }}>
            {[
              { tier: 'free', label: 'Free', price: '$0', period: 'forever', color: '#9CA3AF', bg: 'rgba(156,163,175,0.04)', border: 'rgba(156,163,175,0.2)', tagline: 'Browse, follow, and read the directory.', cta: 'Join Free', href: '/sign-up', ctaStyle: 'btn btn-ghost' },
              { tier: 'verified_identity', label: 'Verified Identity', price: '$24.99', period: '/ year', color: '#FFB81C', bg: 'rgba(255,184,28,0.06)', border: 'rgba(255,184,28,0.35)', tagline: 'Claim your player profile, unlimited roles under one identity.', cta: 'Verify My Identity', href: '/pricing?tier=verified_identity', ctaStyle: 'btn', ctaBg: '#FFB81C', ctaColor: '#041E42', popular: true },
              { tier: 'identity_plus', label: 'Identity Plus', price: '$59.99', period: '/ year', color: '#FFB81C', bg: 'rgba(255,184,28,0.12)', border: 'rgba(255,184,28,0.4)', tagline: 'Family Hub, photos, videos, advanced analytics.', cta: 'Upgrade to Identity Plus', href: '/pricing?tier=identity_plus', ctaStyle: 'btn', ctaBg: '#FFB81C', ctaColor: '#041E42' },
              { tier: 'club_starter', label: 'Club Starter', price: '$149', period: '/ year', color: '#C8102E', bg: 'rgba(200,16,46,0.06)', border: 'rgba(200,16,46,0.35)', tagline: 'Small clubs — up to 30 players.', cta: 'Start Your Club', href: '/pricing?tier=club_starter', ctaStyle: 'btn', ctaBg: '#C8102E', ctaColor: '#fff' },
              { tier: 'club_pro', label: 'Club Pro', price: '$399', period: '/ year', color: '#C8102E', bg: 'rgba(200,16,46,0.10)', border: 'rgba(200,16,46,0.4)', tagline: 'Mid-sized clubs — up to 150 players, multiple teams.', cta: 'Upgrade to Club Pro', href: '/pricing?tier=club_pro', ctaStyle: 'btn', ctaBg: '#C8102E', ctaColor: '#fff' },
              { tier: 'club_elite', label: 'Club Elite', price: '$999', period: '/ year', color: '#C8102E', bg: 'rgba(200,16,46,0.16)', border: 'rgba(200,16,46,0.5)', tagline: 'Large clubs — unlimited teams, advanced analytics, custom branding.', cta: 'Go Club Elite', href: '/pricing?tier=club_elite', ctaStyle: 'btn', ctaBg: '#C8102E', ctaColor: '#fff' },
              { tier: 'business_listing', label: 'Business Listing', price: '$99', period: '/ year', color: '#14B8A6', bg: 'rgba(20,184,166,0.06)', border: 'rgba(20,184,166,0.35)', tagline: 'Verified business listing with contact and lead form.', cta: 'Claim Listing', href: '/pricing?tier=business_listing', ctaStyle: 'btn', ctaBg: '#14B8A6', ctaColor: '#fff' },
              { tier: 'business_plus', label: 'Business Plus', price: '$299', period: '/ year', color: '#14B8A6', bg: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.4)', tagline: 'Multiple listings, featured placement, messaging.', cta: 'Upgrade to Business Plus', href: '/pricing?tier=business_plus', ctaStyle: 'btn', ctaBg: '#14B8A6', ctaColor: '#fff' },
            ].map((t) => (
              <div key={t.tier} style={{
                position: 'relative',
                background: t.bg,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: '1.5rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                transition: 'transform 0.15s, border-color 0.15s',
              }}>
                {('popular' in t && t.popular) && (
                  <div style={{
                    position: 'absolute', top: -10, right: 16,
                    background: '#14B8A6', color: '#fff',
                    fontSize: '0.625rem', fontWeight: 800,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '0.2rem 0.625rem', borderRadius: 999,
                  }}>Most Popular</div>
                )}
                <div>
                  <div style={{ fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.color, marginBottom: '0.25rem' }}>
                    {t.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span className="font-sport" style={{ fontSize: '2rem', color: '#fff', lineHeight: 1 }}>
                      {t.price}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem' }}>
                      {t.period}
                    </span>
                  </div>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8125rem', lineHeight: 1.5, margin: 0, flex: 1 }}>
                  {t.tagline}
                </p>
                <Link
                  href={t.href}
                  className={t.ctaStyle}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0.625rem 1rem', borderRadius: 6,
                    background: ('ctaBg' in t ? t.ctaBg : 'transparent'),
                    color: ('ctaColor' in t ? t.ctaColor : 'inherit'),
                    border: ('ctaBg' in t ? 'none' : '1px solid rgba(255,255,255,0.2)'),
                    textDecoration: 'none', fontWeight: 700, fontSize: '0.8125rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.cta}
                </Link>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link href="/pricing" style={{ color: '#FFB81C', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
              Compare all features (FAQ + Federation) →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
