'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import HighlightsGrid from '@/components/HighlightsGrid';
import TicketmasterAd from '@/components/TicketmasterAd';

interface Post  { id: string; title: string; slug: string; excerpt?: string; category?: string; og_image_url?: string | null; }

const CATS = [
  { label: 'Teams',   href: '/directory/teams',    count: '2,116', color: '#C8102E', desc: 'Pro, junior & youth clubs worldwide',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { label: 'Players', href: '/directory/players',  count: '6,352', color: '#2563EB', desc: 'Profiles, stats & career histories',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg> },
  { label: 'Leagues', href: '/directory/leagues',  count: '192',    color: '#D97706', desc: 'NHL, AHL, KHL, IIHF & more',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17	v4M7 4H4l1 7a5 5 0 0 0 10 0l1-7h-3"/><line x1="7" y1="4" x2="17" y2="4"/></svg> },
  { label: 'Rinks',   href: '/directory/rinks',    count: '224',  color: '#059669', desc: 'Ice arenas in every country',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><ellipse cx="12" cy="12" rx="5" ry="3"/><line x1="12" y1="3" x2="12" y2="21"/></svg> },
  { label: 'Brands',  href: '/directory/brands',   count: '32',    color: '#7C3AED', desc: 'Equipment & gear manufacturers',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  { label: 'Scores',  href: '/directory/games', count: 'Live',    color: '#C8102E', desc: 'Results, standings & schedules',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { label: 'Highlights', href: '/highlights', count: 'Video', color: '#FFB81C', desc: 'Top goals, saves & game recaps',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg> },
];

const STATS = [
  { n: '2,116',  l: 'Teams' },
  { n: '6,352',  l: 'Players' },
  { n: '192',    l: 'Leagues' },
  { n: '224',    l: 'Rinks' },
];

export default function Home() {

  const [posts, setPosts]   = useState<Post[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {

    fetch('/api/blog/posts?limit=3').then(r => r.json())
      .then(d => setPosts(d.data || d.posts || []))
      .catch(() => {});
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
              <div className="label">Global Hockey Directory</div>

              <h1 className="font-sport" style={{ fontSize: 'clamp(2.75rem, 11vw, 6rem)', color: '#fff', lineHeight: 0.92 }}>
                THE WORLD&apos;S
              </h1>
              <h1 className="font-sport" style={{ fontSize: 'clamp(2.75rem, 11vw, 6rem)', color: '#C8102E', lineHeight: 0.92 }}>
                HOCKEY
              </h1>
              <h1 className="font-sport" style={{ fontSize: 'clamp(2.75rem, 11vw, 6rem)', color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,0.3)', lineHeight: 0.92, marginBottom: '1.25rem' }}>
                DIRECTORY
              </h1>

              <p style={{ color: 'rgba(255,255,255,0.58)', fontSize: 'clamp(0.875rem, 2.5vw, 1rem)', lineHeight: 1.7, marginBottom: '1.5rem', maxWidth: '440px' }}>
                Find teams, players, leagues, and rinks from every corner of the globe  --  from NHL arenas to backyard rinks.
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
                <Link href="/add-listing" className="btn btn-yellow">Join Now</Link>
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
                    {s.n}
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
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: c.color, flexShrink: 0 }}>{c.count}</span>
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

      {/* ---- LATEST HIGHLIGHTS --------------------------------------------------------------------------------------------- */}
      <section className="section-py" style={{ background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container">
          <HighlightsGrid limit={8} columns={4} title="LATEST HIGHLIGHTS" />
        </div>
      </section>

      {/* ---- NEWS ---------------------------------------------------------------------------------------------------------------------- */}
      {posts.length > 0 && (
        <section className="section-py" style={{ background: '#111823', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="container">
            <div className="sec-head">
              <div>
                <div className="label">Latest</div>
                <h2 className="font-sport" style={{ fontSize: 'clamp(1.625rem, 4vw, 2.25rem)', color: '#fff' }}>HOCKEY NEWS</h2>
              </div>
              <Link href="/news" className="sec-link">All News →</Link>
            </div>
            <div className="news-grid">
              {posts.map(p => (
                <Link key={p.id} href={`/news/${p.slug}`} className="card" style={{ textDecoration: 'none' }}>
                  {p.og_image_url ? (
                    <img src={p.og_image_url} alt={`${p.title} — ${p.category || 'Hockey News'} article image`} style={{ width: '100%', height: '150px', objectFit: 'cover' }} loading="lazy" />
                  ) : (
                    <div style={{ height: '150px', background: 'linear-gradient(135deg, #041E42, #0A2E5C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                        <line x1="4" y1="22" x2="4" y2="15"/>
                      </svg>
                    </div>
                  )}
                  <div style={{ padding: '1rem' }}>
                    {p.category && <span className="badge badge-red" style={{ marginBottom: '0.5rem', display: 'inline-flex' }}>{p.category}</span>}
                    <h3 style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', lineHeight: 1.4, marginBottom: '0.5rem' }}>{p.title}</h3>
                    {p.excerpt && (
                      <p style={{
                        color: 'rgba(255,255,255,0.38)', fontSize: '0.8125rem', lineHeight: 1.6, marginBottom: '0.75rem',
                        display: '-webkit-box', overflow: 'hidden',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                      }}>{p.excerpt}</p>
                    )}
                    <span style={{ color: '#C8102E', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Read More →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Ticketmaster NHL Banner - 300x250 */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
        <TicketmasterAd size="300x250" />
      </div>

      {/* ---- CTA BAND -------------------------------------------------------------------------------------------------------------- */}
      <section style={{ background: 'linear-gradient(135deg, #C8102E 0%, #9B0D23 100%)', padding: 'clamp(2rem, 5vw, 3rem) 0' }}>
        <div className="container">
          <div className="cta-flex">
            <div>
              <h2 className="font-sport" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: '#fff', marginBottom: '0.375rem' }}>
                ADD YOUR TEAM TO THE DIRECTORY
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)' }}>
                List your team, league, rink, or brand. Reach hockey fans worldwide.
              </p>
            </div>
            <div className="cta-btns">
              <Link href="/add-listing" className="btn btn-white">+ Join Now</Link>
              <Link href="/directory" className="btn btn-ghost" style={{ borderColor: 'rgba(255,255,255,0.4)' }}>Browse Directory</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}