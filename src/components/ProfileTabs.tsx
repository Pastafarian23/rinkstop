import Link from 'next/link';

interface Tab {
  key: string;
  label: string;
  href: string;
  count?: number | null;
  comingSoon?: boolean;
}

interface ProfileTabsProps {
  active: 'overview' | 'about' | 'passport' | 'posts' | 'media';
  username: string;
  counts?: {
    posts?: number;
    media?: number;
  };
}

/**
 * Tab nav for the profile page. Pattern follows Facebook / Twitter / LinkedIn.
 *
 * - Active tab gets a red underline + bold label
 * - "Posts" and "Media" are placeholders with a "Coming soon" affordance on click
 * - On mobile, the strip scrolls horizontally (no wrapping)
 * - Background + border match the brand dark navy theme
 */
export default function ProfileTabs({ active, username, counts }: ProfileTabsProps) {
  const tabs: Tab[] = [
    { key: 'overview', label: 'Overview', href: `/profile/${username}` },
    { key: 'about', label: 'About', href: `/profile/${username}#about` },
    { key: 'passport', label: 'Passport', href: `/profile/${username}/passport` },
    { key: 'posts', label: 'Posts', href: `/profile/${username}#posts`, count: counts?.posts ?? 0, comingSoon: true },
    { key: 'media', label: 'Media', href: `/profile/${username}#media`, count: counts?.media ?? 0, comingSoon: true },
  ];

  return (
    <nav
      aria-label="Profile sections"
      className="overflow-x-auto"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.2)',
        scrollbarWidth: 'none',
      }}
    >
      <div
        className="flex gap-1 px-2 md:px-4"
        style={{ minWidth: 'max-content' }}
      >
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <Link
              key={t.key}
              href={t.href}
              className="relative inline-flex items-center gap-1.5 whitespace-nowrap"
              style={{
                padding: '0.875rem 1rem',
                fontSize: '0.875rem',
                fontWeight: isActive ? 700 : 600,
                letterSpacing: '0.02em',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                borderBottom: isActive ? '2px solid var(--red)' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'color 0.15s, border-color 0.15s',
                textDecoration: 'none',
              }}
            >
              <span>{t.label}</span>
              {typeof counts?.[t.key as keyof typeof counts] === 'number' && (counts[t.key as keyof typeof counts] ?? 0) > 0 && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: isActive ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
                    background: isActive ? 'rgba(255,184,28,0.12)' : 'rgba(255,255,255,0.06)',
                    padding: '0.0625rem 0.375rem',
                    borderRadius: 999,
                    minWidth: '1.25rem',
                    textAlign: 'center',
                    lineHeight: 1.4,
                  }}
                >
                  {counts?.[t.key as keyof typeof counts]}
                </span>
              )}
              {t.comingSoon && (
                <span
                  style={{
                    fontSize: '0.5625rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.3)',
                    marginLeft: '0.25rem',
                  }}
                >
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
