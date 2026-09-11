'use client';

interface BreadcrumbLink {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  links: BreadcrumbLink[];
}

export default function Breadcrumbs({ links }: BreadcrumbsProps) {
  const linkColor = 'rgba(255,255,255,0.4)';
  const hoverColor = '#fff';
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.75rem',
        color: linkColor,
        marginBottom: '1rem',
      }}
    >
      <a href="/" style={{ color: linkColor, textDecoration: 'none' }} onMouseEnter={e => (e.currentTarget.style.color = hoverColor)} onMouseLeave={e => (e.currentTarget.style.color = linkColor)}>
        Home
      </a>

      {links.map((link, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 0.1rem' }}>›</span>
          {i === links.length - 1 ? (
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>{link.label}</span>
          ) : (
            <a
              href={link.href}
              style={{ color: linkColor, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = hoverColor)}
              onMouseLeave={e => (e.currentTarget.style.color = linkColor)}
            >
              {link.label}
            </a>
          )}
        </span>
      ))}
    </nav>
  );
}
