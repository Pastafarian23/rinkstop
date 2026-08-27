'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Show, useUser } from '@clerk/nextjs';

/**
 * Bottom tab bar for mobile + Capacitor WebView.
 * Shows on screens ≤ 768px wide. 4 tabs: Home, Directory, News, Profile.
 * Active tab gets the brand red top accent.
 */
export default function MobileBottomTabBar() {
  const pathname = usePathname() || '/';
  const { isSignedIn } = useUser();

  // Don't show on landing/auth pages where it would clutter
  const hide = pathname === '/login' || pathname.startsWith('/sign-') || pathname === '/onboarding';
  if (hide) return null;

  const tabs = [
    { href: '/', label: 'Home', icon: HomeIcon, match: (p: string) => p === '/' },
    { href: '/directory', label: 'Directory', icon: DirectoryIcon, match: (p: string) => p.startsWith('/directory') || p.startsWith('/standings') },
    { href: '/blog', label: 'News', icon: NewsIcon, match: (p: string) => p.startsWith('/blog') || p.startsWith('/news') || p.startsWith('/guides') || p.startsWith('/rankings') },
    {
      href: isSignedIn ? '/dashboard' : '/login',
      label: isSignedIn ? 'Profile' : 'Sign In',
      icon: ProfileIcon,
      match: (p: string) => p.startsWith('/dashboard') || p.startsWith('/profile'),
    },
  ];

  return (
    <nav className="mob-bottom-tabbar" aria-label="Bottom navigation">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`mob-tab ${active ? 'mob-tab-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="mob-tab-icon"><Icon /></span>
            <span className="mob-tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// Inline SVG icons (small, brand-aligned)
function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
    </svg>
  );
}
function DirectoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function NewsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h10M7 16h6" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
