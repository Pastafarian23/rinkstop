'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const CATS = [
  {
    label: 'Teams',
    href: '/directory/teams',
    count: '32',
    desc: 'NHL teams with full rosters, logos, and arena info',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    label: 'Players',
    href: '/directory/players',
    count: '831',
    desc: 'NHL players with stats, headshots, and profiles',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      </svg>
    ),
  },
  {
    label: 'Leagues',
    href: '/directory/leagues',
    count: '15',
    desc: 'NHL, AHL, KHL, SHL, Liiga, DEL, and more',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 21h8M12 17v4M7 4H4l1 7a5 5 0 0 0 10 0l1-7h-3"/><line x1="7" y1="4" x2="17" y2="4"/>
      </svg>
    ),
  },
  {
    label: 'Rinks',
    href: '/directory/rinks',
    count: '32',
    liveKey: 'rinks',
    desc: 'NHL arenas with capacity, location, and details',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="5"/><ellipse cx="12" cy="12" rx="5" ry="3"/>
        <line x1="12" y1="3" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    label: 'Brands',
    href: '/directory/brands',
    count: '12',
    desc: 'Equipment makers  --  Bauer, CCM, Warrior, and more',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    label: 'Scores',
    href: '/directory/games',
    count: 'Live',
    desc: 'Game schedules, results, and standings',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    label: 'PWHL',
    href: '/directory/pwhl',
    count: '6',
    desc: 'Professional Women\'s Hockey League  --  6 teams across North America',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a5 5 0 0 1 5 5c0 2-1 3-2 4l-3 3-3-3c-1-1-2-2-2-4a5 5 0 0 1 5-5z"/>
        <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>
        <line x1="12" y1="14" x2="12" y2="21"/>
      </svg>
    ),
    accentColor: '#4ECDC4',
  },
];

export default function DirectoryLandingClient() {
  const [counts, setCounts] = useState<{rinks:number; teams:number; players:number; leagues:number} | null>(null);
  useEffect(() => {
    fetch('/api/counts').then(r => r.json()).then(setCounts).catch(() => {});
  }, []);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Directory</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div className="label">Browse Everything</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', color: '#fff', lineHeight: 1 }}>
          HOCKEY DIRECTORY
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1rem', marginTop: '0.75rem', maxWidth: '480px' }}>
          From NHL arenas to backyard rinks  --  find teams, players, leagues, rinks, and brands worldwide.
        </p>
      </div>

      {/* Category grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem',
      }}>
        {CATS.map(cat => {
          const accent = cat.accentColor || '#C8102E';
          return (
          <Link
            key={cat.href}
            href={cat.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.875rem',
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '1.375rem',
              textDecoration: 'none',
              transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-h)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(0,0,0,0.45)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLElement).style.transform = '';
              (e.currentTarget as HTMLElement).style.boxShadow = '';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '8px',
                background: `${accent}1e`, color: accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {cat.icon}
              </div>
              <span style={{
                fontSize: '0.75rem', fontWeight: 800, color: accent,
                background: `${accent}1e`, padding: '0.2rem 0.5rem',
                borderRadius: '3px', flexShrink: 0, letterSpacing: '0.06em',
              }}>
                {counts && (cat as { liveKey?: keyof typeof counts }).liveKey
                  ? (counts[(cat as { liveKey: keyof typeof counts }).liveKey] ?? 0).toLocaleString()
                  : cat.count}
              </span>
            </div>
            <div>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.375rem', color: '#fff', letterSpacing: '0.03em', marginBottom: '0.3rem' }}>
                {cat.label.toUpperCase()}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.8125rem', lineHeight: 1.55 }}>{cat.desc}</p>
            </div>
            <div style={{ color: accent, fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 'auto' }}>
              Explore →
            </div>
          </Link>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div style={{
        marginTop: '3rem',
        background: 'linear-gradient(135deg, #C8102E 0%, #9B0D23 100%)',
        borderRadius: '8px',
        padding: 'clamp(1.5rem, 4vw, 2.5rem)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        alignItems: 'flex-start',
      }}>
        <h2 className="font-sport" style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', color: '#fff', letterSpacing: '0.03em' }}>
          SEE YOUR LISTING? CLAIM IT.
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9375rem', maxWidth: '500px', lineHeight: 1.6 }}>
          Already on RinkStop? Operators can claim their rink, team, or league to edit details,
          reply to messages, and unlock verified badges. Not listed yet? You can add it.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
          <Link href="/claim-your-listing" className="btn btn-white">
            Claim Your Listing
          </Link>
          <Link
            href="/add-listing"
            style={{
              display: 'inline-block',
              padding: '0.65rem 1.25rem',
              background: 'transparent',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.45)',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            + Add a New Listing
          </Link>
        </div>
      </div>
    </div>
  );
}
