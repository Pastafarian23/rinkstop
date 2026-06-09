'use client';

import Link from 'next/link';

type NavLink = {
  href: string;
  label: string;
  badge?: number;
};

export default function DashboardNav({ links }: { links: NavLink[] }) {
  return (
    <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 0 }}>
      {links.map(({ href, label, badge }) => (
        <Link
          key={href}
          href={href}
          style={{
            padding: '0.75rem 1.25rem',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.875rem',
            textDecoration: 'none',
            borderBottom: '2px solid transparent',
            whiteSpace: 'nowrap',
            transition: 'color 0.15s, border-color 0.15s',
            position: 'relative',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderBottomColor = '#C8102E';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
            e.currentTarget.style.borderBottomColor = 'transparent';
          }}
        >
          {label}
          {badge && badge > 0 ? (
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 4,
                background: '#C8102E',
                color: '#fff',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                padding: '0.1rem 0.4rem',
                minWidth: 18,
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              {badge > 99 ? '99+' : badge}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
