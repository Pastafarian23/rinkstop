import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Add Your Listing',
  description: 'Add your hockey team, league, rink, or player to the world\'s largest hockey directory.',
};

const LISTING_TYPES = [
  {
    icon: '🏒',
    title: 'Team',
    description: 'Add your pro, junior, college, youth, or adult hockey team to the directory.',
    href: '/admin/teams/new',
    color: '#C8102E',
  },
  {
    icon: '🏟️',
    title: 'League',
    description: 'List your league so players and teams can find and connect with you.',
    href: '/admin/leagues/new',
    color: '#D97706',
  },
  {
    icon: '🧊',
    title: 'Rink',
    description: 'Add your arena or ice rink to our global directory of hockey facilities.',
    href: '/admin/rinks/new',
    color: '#059669',
  },
  {
    icon: '👤',
    title: 'Player',
    description: 'Create a player profile with stats, career history, and contact info.',
    href: '/admin/players/new',
    color: '#2563EB',
  },
  {
    icon: '🏁',
    title: 'Coach',
    description: 'List your coaching credentials and availability for teams seeking staff.',
    href: '/admin/coaches/new',
    color: '#7C3AED',
  },
  {
    icon: '📍',
    title: 'Tournament',
    description: 'Promote your tournament to attract teams from across the hockey world.',
    href: '/admin/tournaments/new',
    color: '#0891B2',
  },
];

export default function AddListingPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div className="label">Grow the Directory</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', color: '#fff', lineHeight: 1 }}>
          ADD YOUR LISTING
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.75rem', fontSize: '1rem', maxWidth: '480px', margin: '0.75rem auto 0' }}>
          Choose the type of listing you want to add. Each listing is free and takes just a few minutes.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
      }}>
        {LISTING_TYPES.map(type => (
          <Link
            key={type.title}
            href={type.href}
            style={{
              display: 'block',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${type.color}30`,
              borderRadius: '10px',
              padding: '1.5rem',
              textDecoration: 'none',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={undefined}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 10,
              background: `${type.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.75rem',
              marginBottom: '1rem',
            }}>
              {type.icon}
            </div>
            <h3 style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: '1.25rem',
              color: '#fff',
              marginBottom: '0.5rem',
              letterSpacing: '0.05em',
            }}>
              {type.title}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              {type.description}
            </p>
            <div style={{
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: `1px solid ${type.color}18`,
              color: type.color,
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}>
              Add {type.title} →
            </div>
          </Link>
        ))}
      </div>

      <div style={{
        marginTop: '3rem',
        textAlign: 'center',
        padding: '2rem',
        background: 'rgba(200,16,46,0.06)',
        border: '1px solid rgba(200,16,46,0.15)',
        borderRadius: '10px',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          Want to list something not listed here?
        </p>
        <Link href="/contact" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>
          Contact us →
        </Link>
      </div>
    </main>
  );
}