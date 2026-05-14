import './globals.css';
import Link from 'next/link';
import MobileNav from '@/components/MobileNav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://rinkstop.com'),
  title: {
    default: 'RinkStop — The World\'s Hockey Directory',
    template: '%s | RinkStop',
  },
  description: 'Find hockey teams, players, leagues, and rinks from every corner of the globe.',
  openGraph: {
    type: 'website',
    siteName: 'RinkStop',
    title: 'RinkStop — The World\'s Hockey Directory',
    description: 'Find hockey teams, players, leagues, and rinks from every corner of the globe.',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@rinkstop',
    creator: '@rinkstop',
    title: 'RinkStop — The World\'s Hockey Directory',
    description: 'Find hockey teams, players, leagues, and rinks from every corner of the globe.',
    images: ['https://rinkstop.com/og-image.png'],
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
};

const NAV = [
  { href: '/directory/teams',    label: 'Teams'   },
  { href: '/directory/players',  label: 'Players' },
  { href: '/directory/leagues',  label: 'Leagues' },
  { href: '/directory/pwhl',        label: 'PWHL'           },
  { href: '/directory/youth-hockey', label: 'Youth Hockey'   },
  { href: '/directory/rinks',    label: 'Rinks'   },
  { href: '/directory/fixtures', label: 'Scores'  },
  { href: '/blog',               label: 'News'    },
  { href: '/contact',           label: 'Contact' },
];

const CONTRIBUTE = [
  { href: '/admin/teams/new',   label: 'Add Your Team'   },
  { href: '/admin/leagues/new', label: 'Add Your League' },
  { href: '/admin/rinks/new',   label: 'Add a Rink'      },
  { href: '/admin/players/new', label: 'Add a Player'    },
];

const TICKER_TEXT = 'NHL PLAYOFFS  •  VGK 3 – EDM 2 OT  •  FLA 4 – CAR 1  •  NYR 2 – WSH 5  •  COL 3 – DAL 2  •  BOS 1 – TOR 4  •  RINKSTOP — THE WORLD\'S HOCKEY DIRECTORY  •  ';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#041E42" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>

        {/* ── Score Ticker ─────────────────────────────────────────────── */}
        <div className="ticker-outer">
          <div className="ticker-track">
            <span className="ticker-item">{TICKER_TEXT}</span>
            <span className="ticker-item">{TICKER_TEXT}</span>
            <span className="ticker-item">{TICKER_TEXT}</span>
            <span className="ticker-item">{TICKER_TEXT}</span>
          </div>
        </div>

        {/* ── Nav ──────────────────────────────────────────────────────── */}
        <header className="nav-bar">
          <div className="container">
            <div className="nav-inner">

              {/* Logo */}
              <Link href="/" className="nav-logo">
                <img
                  src="/rinkstoplogo.png"
                  alt="RinkStop"
                  style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }}
                />
              </Link>

              {/* Desktop links */}
              <nav className="nav-links" aria-label="Main navigation">
                {NAV.map(n => <Link key={n.href} href={n.href} className="nav-link">{n.label}</Link>)}
              </nav>

              {/* Desktop right */}
              <div className="nav-right">
                <Link href="/admin/teams/new" className="btn btn-red" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}>
                  + Add Listing
                </Link>
              </div>

              {/* Mobile hamburger — label toggles checkbox */}
              <label htmlFor="mob-nav" className="hamburger" aria-label="Open menu">
                <span /><span /><span />
              </label>
            </div>
          </div>

          {/* CSS-only mobile drawer */}
          <input type="checkbox" id="mob-nav" />
          <MobileNav />
        </header>

        {/* ── Page Content ─────────────────────────────────────────────── */}
        <main>{children}</main>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer style={{ background: '#041E42', borderTop: '3px solid #C8102E', marginTop: '3rem', padding: '2.5rem 0 1.5rem' }}>
          <div className="container">
            <div className="footer-grid">

              {/* Brand column */}
              <div style={{ gridColumn: 'span 2' }}>
                <Link href="/" style={{ display: 'block', marginBottom: '0.875rem' }}>
                  <img
                    src="/rinkstoplogo.png"
                    alt="RinkStop logo"
                    style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: '4px' }}
                  />
                </Link>
                <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.8125rem', lineHeight: 1.65, maxWidth: '260px' }}>
                  The global game, documented. From NHL arenas to backyard rinks worldwide.
                </p>
              </div>

              {/* Directory */}
              <div>
                <p style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.875rem' }}>Directory</p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {NAV.map(n => (
                    <li key={n.href}><Link href={n.href} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>{n.label}</Link></li>
                  ))}
                </ul>
              </div>

              {/* Contact */}
              <div>
                <p style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.875rem' }}>Contact</p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li><a href="mailto:support@rinkstop.com" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', textDecoration: 'none' }}>support@rinkstop.com</a></li>
                  <li><Link href="/contact" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', textDecoration: 'none' }}>Contact Form</Link></li>
                </ul>
              </div>

              {/* Contribute */}
              <div>
                <p style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.875rem' }}>Contribute</p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {CONTRIBUTE.map(n => (
                    <li key={n.href}><Link href={n.href} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', textDecoration: 'none' }}>{n.label}</Link></li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.5rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.6875rem' }}>
                © {new Date().getFullYear()} RinkStop. All rights reserved.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.6875rem' }}>
                Built for the global hockey community.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
