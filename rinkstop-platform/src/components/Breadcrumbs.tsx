'use client';

interface BreadcrumbLink {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  links: BreadcrumbLink[];
}

export default function Breadcrumbs({ links }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.75rem',
        color: '#555555',
        marginBottom: '1rem',
      }}
    >
      <a href="/" style={{ color: '#555555', textDecoration: 'none' }} onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = '#555555')}>
        Home
      </a>

      {links.map((link, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 0.1rem' }}>›</span>
          {i === links.length - 1 ? (
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>{link.label}</span>
          ) : (
            <a
              href={link.href}
              style={{ color: '#555555', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555555')}
            >
              {link.label}
            </a>
          )}
        </span>
      ))}
    </nav>
  );
}