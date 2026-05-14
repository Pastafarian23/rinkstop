'use client';
// Mobile drawer — needs to be a Client Component so onClick can control the checkbox
import Link from 'next/link';

const NAV = [
  { href: '/directory/teams',    label: 'Teams'   },
  { href: '/directory/players',  label: 'Players' },
  { href: '/directory/leagues',  label: 'Leagues' },
  { href: '/directory/rinks',    label: 'Rinks'   },
  { href: '/directory/fixtures', label: 'Scores'  },
  { href: '/blog',               label: 'News'    },
];

export default function MobileNav() {
  return (
    <nav className="mob-drawer" aria-label="Mobile navigation">
      {NAV.map(n => (
        <Link
          key={n.href}
          href={n.href}
          className="mob-link"
          onClick={() => {
            const cb = document.getElementById('mob-nav') as HTMLInputElement;
            if (cb) cb.checked = false;
          }}
        >
          {n.label}
        </Link>
      ))}
      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Link href="/admin/teams/new" className="btn btn-red" style={{ width: '100%', justifyContent: 'center' }}>
          + Add Your Team
        </Link>
      </div>
    </nav>
  );
}