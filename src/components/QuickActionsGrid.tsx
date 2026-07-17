'use client';

import Link from 'next/link';

type QuickLink = {
  href: string;
  label: string;
  icon: string;
  desc: string;
};

export default function QuickActionsGrid({ links }: { links: QuickLink[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
      }}
    >
      {links.map(({ href, label, icon, desc }) => (
        <Link
          key={href}
          href={href}
          style={{
            display: 'block',
            padding: '1.25rem',
            borderRadius: 8,
            border: '1px solid #1e1e1e',
            textDecoration: 'none',
            color: 'inherit',
            background: '#141414',
            transition: 'border-color 0.2s, transform 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#C8102E';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#1e1e1e';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>{icon}</span>
          <div style={{ fontWeight: 600, color: '#fff', marginTop: '0.5rem', fontSize: '0.95rem' }}>{label}</div>
          <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.25rem', lineHeight: 1.5 }}>{desc}</div>
        </Link>
      ))}
    </div>
  );
}
