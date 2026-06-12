import './globals.css';
import Link from 'next/link';
import { ClerkProvider } from '@clerk/nextjs';
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!;
import MobileNav from '@/components/MobileNav';
import MobileProfileButton from '@/components/MobileProfileButton';
import NavLinks from '@/components/NavLinks';
import NavAuth from '@/components/NavAuth';
import CookieConsent from '@/components/CookieConsent';
import FoundersClubPopup from '@/components/FoundersClubPopup';
import ScoreTicker from '@/components/ScoreTicker';
import { clerkSignInLocalization, clerkSignUpLocalization } from '@/lib/clerk-appearance';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://rinkstop.com'),
  title: {
    default: 'RinkStop  --  The World\'s Hockey Directory',
    template: '%s | RinkStop',
  },
  description: 'Find hockey teams, players, leagues, and rinks from every corner of the globe.',
  openGraph: {
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@rinkstop',
    creator: '@rinkstop',
    images: ['https://rinkstop.com/og-image.png'],
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

const EXPLORE = [
  { href: '/directory/teams',    label: 'Teams'   },
  { href: '/directory/players',  label: 'Players' },
  { href: '/directory/leagues',  label: 'Leagues' },
  { href: '/directory/rinks',    label: 'Rinks'   },
  { href: '/directory/games',    label: 'Games'   },
  { href: '/standings',          label: 'Standings' },
];

const PRO_HOCKEY = [
  { href: '/directory/nhl',           label: 'NHL'                   },
  { href: '/directory/pwhl',          label: 'PWHL'                  },
  { href: '/directory/khl',           label: 'KHL'                   },
  { href: '/directory/ahl',           label: 'AHL'                   },
  { href: '/directory/pro-leagues',    label: 'All Professional Leagues' },
];

const INTERNATIONAL = [
  { href: '/directory/countries',           label: 'Countries'            },
  { href: '/directory/international/iihf',   label: 'IIHF'               },
  { href: '/directory/international/world-championships', label: 'World Championships' },
  { href: '/directory/international/olympics',             label: 'Olympics'           },
];

const COLLEGE = [
  { href: '/directory/college',           label: 'College Hub'      },
  { href: '/directory/college/ncaa',    label: 'NCAA'             },
  { href: '/directory/college/nchc',    label: 'NCHC'             },
  { href: '/directory/college/big-ten',  label: 'Big Ten'          },
  { href: '/directory/college/hockey-east', label: 'Hockey East'   },
];

const JUNIOR = [
  { href: '/directory/junior/ohl',   label: 'OHL'    },
  { href: '/directory/junior/whl',   label: 'WHL'    },
  { href: '/directory/junior/qmjhl', label: 'QMJHL'  },
  { href: '/directory/junior/ushl',  label: 'USHL'   },
  { href: '/directory/junior',       label: 'All Junior Leagues' },
];

const YOUTH_AMATEUR = [
  { href: '/directory/youth-hockey/learn-to-play', label: 'Learn to Play'     },
  { href: '/directory/youth-hockey', label: 'Youth Hockey'      },
  { href: '/directory/youth-hockey/tournaments', label: 'Youth Tournaments'  },
  { href: '/directory/youth-hockey/adult-leagues', label: 'Adult Leagues'     },
  { href: '/directory/youth-hockey/adult-tournaments', label: 'Adult Tournaments'  },
];

const CONTENT_LINKS = [
  { href: '/news', label: 'News'         },
  { href: '/guides', label: 'Guides'        },
  { href: '/rankings', label: 'Rankings'      },
  { href: '/hockey-travel', label: 'Hockey Travel' },
  { href: '/gear-reviews', label: 'Gear' },
];

const ABOUT_LINKS = [
  { href: '/faq',         label: 'FAQ'           },
  { href: '/about',       label: 'About Us'        },
  { href: '/contact',     label: 'Contact Us'       },
  { href: '/advertise',   label: 'Advertise'       },
  { href: '/partner',     label: 'Partner With Us' },
  { href: '/add-listing', label: 'Add Listing'     },
  { href: '/pricing', label: 'Pricing' },
];

const NAV: never[] = []; // unused, kept to avoid breaking any external references




export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      localization={{ ...clerkSignInLocalization, ...clerkSignUpLocalization }}
    >
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

          {/* ---- Score Ticker ---------------------------------------------------------------------------------------------- */}
          <ScoreTicker />

          {/* ---- Nav ---------------------------------------------------------------------------------------------------------------- */}
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

                {/* Desktop right — Sign In/Up or Clerk UserButton on the left, Pricing button, then Menu on the far right */}
                <div className="nav-right">
                  <NavAuth />
                  <Link
                    href="/pricing"
                    className="nav-pricing-button"
                    style={{
                      color: '#FFB81C',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textDecoration: 'none',
                      padding: '0.5rem 0.875rem',
                      borderRadius: 4,
                      border: '1px solid #FFB81C',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Pricing
                  </Link>
                  <NavLinks />
                </div>

                {/* Mobile right-side controls (profile button + hamburger) */}
                <div className="nav-mobile-controls">
                  {/* Mobile profile button — visible only on mobile + only when signed in */}
                  <MobileProfileButton />

                  {/* Mobile hamburger  --  label toggles checkbox */}
                  <label htmlFor="mob-nav" className="hamburger" aria-label="Open menu">
                    <span /><span /><span />
                  </label>
                </div>
              </div>
            </div>

            {/* CSS-only mobile drawer */}
            <input type="checkbox" id="mob-nav" />
            <MobileNav />
          </header>

          {/* ---- Page Content ---------------------------------------------------------------------------------------------- */}
          <main>{children}</main>

          {/* ---- Footer ---------------------------------------------------------------------------------------------------------- */}
          <footer style={{ background: '#041E42', borderTop: '3px solid #C8102E', marginTop: '3rem', padding: '2.5rem 0 1.5rem' }}>
            <div className="container">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>

                <div>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.25rem', color: '#fff', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>RINKSTOP</div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', lineHeight: 1.6 }}>The world's hockey directory. Find teams, players, leagues, and rinks worldwide.</p>
                </div>

                <div>
                  <div style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: '0.75rem' }}>Explore</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {EXPLORE.map(item => (
                      <Link key={item.href} href={item.href} style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', textDecoration: 'none' }}>{item.label}</Link>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: '0.75rem' }}>Leagues</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[
                      ['/directory/nhl','NHL'],
                      ['/directory/ahl','AHL'],
                      ['/directory/khl','KHL'],
                      ['/directory/pwhl','PWHL'],
                      ['/directory/college','NCAA'],
                      ['/directory/junior','Junior'],
                    ].map(([href,label]) => (
                      <Link key={href} href={href} style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', textDecoration: 'none' }}>{label}</Link>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: '0.75rem' }}>Company</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[
                      ['/faq','FAQ'],
                      ['/about','About'],
                      ['/advertise','Advertise'],
                      ['/contact','Contact'],
                      ['/add-listing','Add Listing'],
                      ['/pricing','Pricing'],
                    ].map(([href,label]) => (
                      <Link key={href} href={href} style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', textDecoration: 'none' }}>{label}</Link>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: '0.75rem' }}>Account</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Link href="/login" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', textDecoration: 'none' }}>Sign In</Link>
                    <Link href="/sign-up" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', textDecoration: 'none' }}>Join Free</Link>
                    <Link href="/dashboard" prefetch={false} style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', textDecoration: 'none' }}>My Dashboard</Link>
                    <Link href="/pricing" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', textDecoration: 'none' }}>Pricing</Link>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: '0.75rem' }}>Legal</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[
                      ['/privacy','Privacy Policy'],
                      ['/terms','Terms of Service'],
                      ['/cookies','Cookie Policy'],
                    ].map(([href,label]) => (
                      <Link key={href} href={href} style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', textDecoration: 'none' }}>{label}</Link>
                    ))}
                  </div>
                </div>

              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>© 2019-2026 RinkStop. All rights reserved.</span>
                <span style={{ display: 'flex', gap: '0.75rem' }}>
                  <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', textDecoration: 'none' }}>Privacy</Link>
                  <Link href="/terms" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', textDecoration: 'none' }}>Terms</Link>
                </span>
              </div>
            </div>
          </footer>
        <CookieConsent />
        <FoundersClubPopup />
        </body>
      </html>
    </ClerkProvider>
  );
}
