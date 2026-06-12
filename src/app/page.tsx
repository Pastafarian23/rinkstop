'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Show } from '@clerk/nextjs';
import HighlightsGrid from '@/components/HighlightsGrid';
import TicketmasterAd from '@/components/TicketmasterAd';
import HomeNewsSection from '@/app/components/HomeNewsSection';

interface Rink    { id: string; name: string; slug: string; city: string; country: string; }
interface Team   { id: string; name: string; slug: string; league: string; city: string; }
interface Game   { id: string; date: string; home_team_name: string; away_team_name: string; venue_name: string; }

const CATS = [
  { label: 'Teams',   href: '/directory/teams',    count: '2,116', color: '#C8102E', desc: 'Pro, junior & youth clubs worldwide',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { label: 'Players', href: '/directory/players',  count: '6,352', color: '#2563EB', desc: 'Profiles, stats & career histories',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg> },
  { label: 'Leagues', href: '/directory/leagues',  count: '192',    color: '#D97706', desc: 'NHL, AHL, KHL, IIHF & more',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17	v4M7 4H4l1 7a5 5 0 0 0 10 0l1-7h-3"/><line x1="7" y1="4" x2="17" y2="4"/></svg> },
  { label: 'Rinks',   href: '/directory/rinks',    count: '224',  color: '#059669', desc: 'Ice arenas in every country', liveKey: 'rinks' as const,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><ellipse cx="12" cy="12" rx="5" ry="3"/><line x1="12" y1="3" x2="12" y2="21"/></svg> },
  { label: 'Brands',  href: '/directory/brands',   count: '32',    color: '#7C3AED', desc: 'Equipment & gear manufacturers',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  { label: 'Scores',  href: '/directory/games', count: 'Live',    color: '#C8102E', desc: 'Results, standings & schedules',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { label: 'Highlights', href: '/highlights', count: 'Video', color: '#FFB81C', desc: 'Top goals, saves & game recaps',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg> },
];

const STATS = [
  { n: '2,116',  l: 'Teams',    liveKey: 'teams' as const },
  { n: '6,352',  l: 'Players',  liveKey: 'players' as const },
  { n: '192',    l: 'Leagues',  liveKey: 'leagues' as const },
  { n: '224',    l: 'Rinks',    liveKey: 'rinks' as const },
];

export default function Home() {

  const [recentRinks, setRecentRinks] = useState<Rink[]>([]);
  const [recentTeams, setRecentTeams] = useState<Team[]>([]);
  const [upcomingGames, setUpcomingGames] = useState<Game[]>([]);
  const [counts, setCounts] = useState<{rinks: number; teams: number; players: number; leagues: number; cities: number; countries: number} | null>(null);
  const [q, setQ] = useState('');

  // Format a number with thousands separator, rounded to a friendly magnitude
  // for hero text (e.g. 1094 -> "1,000+", 2137 -> "2,100+", 51 -> "50+").
  const approx = (n: number) => {
    if (n >= 1000) return `${Math.floor(n/100)*100}+`;
    if (n >= 100) return `${Math.floor(n/10)*10}+`;
    if (n >= 10) return `${Math.floor(n/5)*5}+`;
    return `${n}+`;
  };

  useEffect(() => {
    // Set document.title (this is a client component, so Next.js
    // doesn't emit the static <title> from page metadata). The home page
    // is the single most important page for SEO — getting its title right
    // is the highest-leverage fix we can make.
    document.title = 'RinkStop — The World\u2019s Hockey Directory';

    // Recently added rinks
    fetch('/api/rinks?limit=6&sort=recent').then(r => r.json())
      .then(d => setRecentRinks((d.data || d || []).slice(0, 3))).catch(() => {});
    // Recently added teams
    fetch('/api/teams?limit=6&sort=recent').then(r => r.json())
      .then(d => setRecentTeams((d.data || d || []).slice(0, 3))).catch(() => {});
    // Upcoming games
    fetch('/api/games?limit=10&status=upcoming').then(r => r.json())
      .then(d => setUpcomingGames((d.data || d.games || d || []).slice(0, 3))).catch(() => {});
    // Live directory counts (cached server-side for 60s)
    fetch('/api/counts').then(r => r.json()).then(setCounts).catch(() => {});

    // Inject canonical link tag (this is a client component, so Next.js
    // doesn't emit metadata.alternates.canonical into the SSR HTML).
    const href = 'https://rinkstop.com/';
    let link = document.head.querySelector('link[rel="canonical"][data-seo-canonical="home"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      link.setAttribute('data-seo-canonical', 'home');
      document.head.appendChild(link);
    }
    link.href = href;
    return () => {
      const el = document.head.querySelector('link[rel="canonical"][data-seo-canonical="home"]');
      if (el && document.head.contains(el)) document.head.removeChild(el);
    };
  }, []);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) window.location.href = `/directory?q=${encodeURIComponent(q)}`;
  };

  return (
    <>
      {/* ---- HERO ---------------------------------------------------------------------------------------------------------------------- */}
      <section style={{
        position: 'relative',
        background: 'linear-gradient(140deg, #041E42 0%, #0A2E5C 55%, #0D1117 100%)',
        overflow: 'hidden',
      }}>
        {/* Ice rink pattern */}
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
        {/* Red left stripe */}
        <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#C8102E' }}/>

        <div className="container" style={{ position: 'relative', zIndex: 2, paddingTop: '3rem', paddingBottom: '3rem' }}>
          <div className="hero-grid">

            {/* Headline + search */}
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
                {counts ? (
                  <>{approx(counts.cities)} cities in {counts.countries} countries,{' '}
                  {approx(counts.rinks)} rinks, {approx(counts.teams)} teams,{' '}
                  {approx(counts.players)} players, {approx(counts.leagues)} leagues — searchable by city, state, or country.</>
                ) : (
                  <>800+ cities in 50+ countries, 900+ rinks, 2,100+ teams, 6,300+ players, 190+ leagues — searchable by city, state, or country.</>
                )}
              </p>

              {/* Search bar */}
              <form onSubmit={search} className="search-wrap" style={{ marginBottom: '1.5rem' }}>
                <input
                  type="search"
                  className="search-input"
                  placeholder="Search teams, players, leagues..."
                  value={q}
                  onChange={e => setQ(e.target.value)}
                />
                <button type="submit" className="search-btn" aria-label="Search">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </button>
              </form>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href="/directory" className="btn btn-red">Explore Directory</Link>
                <Show when="signed-out">
                  <Link href="/sign-up" className="btn btn-yellow">Join Now</Link>
                </Show>
              </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
              {STATS.map(s => (
                <div key={s.l} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: 'clamp(0.875rem, 3vw, 1.5rem)',
                  textAlign: 'center',
                }}>
                  <div className="font-sport" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', color: '#C8102E', lineHeight: 1, marginBottom: '0.25rem' }}>
                    {counts ? counts[s.liveKey].toLocaleString() : s.n}
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

      {/* ---- CATEGORIES ---------------------------------------------------------------------------------------------------------- */}
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
            {CATS.map(c => (
              <Link key={c.href} href={c.href} className="card" style={{ textDecoration: 'none' }}>
                <div style={{ padding: 'clamp(0.875rem, 2.5vw, 1.375rem)' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '8px',
                    background: `${c.color}20`, color: c.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '0.75rem',
                  }}>{c.icon}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.2rem', gap: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff' }}>{c.label}</span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: c.color, flexShrink: 0 }}>
                      {c.liveKey && counts ? approx(counts[c.liveKey]) : c.count}
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

      {/* ---- TOP HOCKEY CITIES ------------------------------------------------------------------------------------------------- */}
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
            {[
              { name: 'Toronto', country: 'CA', href: '/directory/canada/ontario/toronto', count: 1 },
              { name: 'Montreal', country: 'CA', href: '/directory/canada/quebec/montreal', count: 1 },
              { name: 'Boston', country: 'US', href: '/directory/united-states/massachusetts/boston', count: 1 },
              { name: 'New York', country: 'US', href: '/directory/united-states/new-york/new-york', count: 1 },
              { name: 'Chicago', country: 'US', href: '/directory/united-states/illinois/chicago', count: 1 },
              { name: 'Detroit', country: 'US', href: '/directory/united-states/michigan/detroit', count: 1 },
              { name: 'Pittsburgh', country: 'US', href: '/directory/united-states/pennsylvania/pittsburgh', count: 1 },
              { name: 'Edmonton', country: 'CA', href: '/directory/canada/alberta/edmonton', count: 1 },
            ].map(city => (
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
                onMouseOver={e => { e.currentTarget.style.borderColor = '#C8102E'; e.currentTarget.style.background = 'rgba(200,16,46,0.05)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
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

      {/* ---- LATEST HIGHLIGHTS --------------------------------------------------------------------------------------------- */}
      <section className="section-py" style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container">
          <HighlightsGrid limit={8} columns={4} title="LATEST HIGHLIGHTS" />
        </div>
      </section>

      <HomeNewsSection />

      {/* Ticketmaster NHL Banner - 300x250 */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
        <TicketmasterAd size="300x250" />
      </div>

      {/* ---- RECENT ACTIVITY MODULE ----------------------------------------------------------------------------------------------- */}
      {(recentRinks.length > 0 || recentTeams.length > 0 || upcomingGames.length > 0) && (
        <section style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '2.5rem 0' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

              {/* Recently Added Rinks */}
              {recentRinks.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.125rem', color: '#fff', letterSpacing: '0.05em' }}>NEW RINKS ADDED</h3>
                    <Link href="/directory/rinks" style={{ color: '#C8102E', fontSize: '0.75rem', fontWeight: 600 }}>View All →</Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {recentRinks.map(r => (
                      <Link key={r.id} href={`/directory/rinks/${r.slug}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.05)', transition: 'border-color 0.15s' }}
                        onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(200,16,46,0.4)')}
                        onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}>
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

              {/* Recently Added Teams */}
              {recentTeams.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.125rem', color: '#fff', letterSpacing: '0.05em' }}>NEW TEAMS JOINED</h3>
                    <Link href="/directory/teams" style={{ color: '#C8102E', fontSize: '0.75rem', fontWeight: 600 }}>View All →</Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {recentTeams.map(t => (
                      <Link key={t.id} href={`/directory/teams/${t.slug}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.05)', transition: 'border-color 0.15s' }}
                        onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(200,16,46,0.4)')}
                        onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>{t.name}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>{t.league}{t.city ? ` · ${t.city}` : ''}</div>
                        </div>
                        <span style={{ color: '#2563EB', fontSize: '0.6875rem', fontWeight: 700 }}>NEW</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Games */}
              {upcomingGames.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.125rem', color: '#fff', letterSpacing: '0.05em' }}>UPCOMING GAMES</h3>
                    <Link href="/directory/games" style={{ color: '#C8102E', fontSize: '0.75rem', fontWeight: 600 }}>All Games →</Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {upcomingGames.map(g => {
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

      {/* ---- CTA BAND -------------------------------------------------------------------------------------------------------------- */}
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
    </>
  );
}