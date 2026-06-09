'use client';

import Link from 'next/link';

type Favorite = {
  id: string;
  href: string;
  icon: string;
  name: string;
  createdAt: string;
};

export default function FavoriteItem({ favorite }: { favorite: Favorite }) {
  const saved = new Date(favorite.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <Link
      href={favorite.href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1.25rem',
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 8,
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#C8102E';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#1e1e1e';
      }}
    >
      <span style={{ fontSize: '1.25rem' }}>{favorite.icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{favorite.name}</p>
        <p style={{ color: '#555', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>Saved {saved}</p>
      </div>
      <span style={{ color: '#333', fontSize: '1rem' }}>→</span>
    </Link>
  );
}
