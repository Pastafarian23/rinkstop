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
      {links.map(({ href, label, badge }) => {
        const isAdmin = href === '/admin';
        return (
        <Link
          key={href}
          href={href}
          data-testid={`dashboard-nav-link-${href.replace(/\//g, '-')}`}
          style={{
            padding: '0.75rem 1.25rem',
            color: isAdmin ? '#FFB81C' : 'rgba(255,255,255,0.5)',
            fontSize: '0.875rem',
            fontWeight: isAdmin ? 700 : 400,
            textDecoration: 'none',
            borderBottom: isAdmin ? '2px solid #FFB81C' : '2px solid transparent',
            whiteSpace: 'nowrap',
            transition: 'color 0.15s, border-color 0.15s',
            position: 'relative',
            letterSpacing: isAdmin ? '0.04em' : 'normal',
            textTransform: isAdmin ? 'uppercase' : 'none',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = isAdmin ? '#ffd466' : '#fff';
            e.currentTarget.style.borderBottomColor = isAdmin ? '#ffd466' : '#C8102E';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = isAdmin ? '#FFB81C' : 'rgba(255,255,255,0.5)';
            e.currentTarget.style.borderBottomColor = isAdmin ? '#FFB81C' : 'transparent';
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
        );
      })}
    </div>
  );
}
