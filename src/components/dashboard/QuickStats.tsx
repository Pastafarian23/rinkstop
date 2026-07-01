import Link from 'next/link';

/**
 * QuickStats — one-glance summary strip rendered above the role cards.
 *
 * Piece 5 (Phase 2): gives signed-in users a top-of-dashboard snapshot of
 * the four numbers that actually matter to them. Each stat is a clickable
 * tile that routes to the relevant dashboard sub-page. Zero state is
 * explicit (we show "0" and a muted style, not a "loading" placeholder).
 *
 * Stats shown (all computed server-side, no client fetch):
 *   1. Active roles — count of profile_account_types rows
 *   2. Linked records — count of managed_profiles rows (player/team/league
 *      records the user stewards). Passively-loaded, not the team_members
 *      coach count.
 *   3. Unread messages — sum of `messages.read_at IS NULL AND sender != me`
 *      across the user's threads. Already in `inbox.totalUnread`.
 *   4. Profile completeness — % of profile fields populated (bio, location,
 *      avatar, etc.). Already in `completenessPct`.
 *
 * Why a strip and not another card: the role cards are type-scoped and
 * detailed; this strip is a TL;DR that fits on one row even on mobile
 * (4 columns, auto-wraps if needed).
 */

interface Props {
  activeRoles: number;
  linkedRecords: number;
  unreadMessages: number;
  profileCompletenessPct: number;
}

interface Tile {
  label: string;
  value: number | string;
  href: string;
  icon: string;
  /** Color tint for the value (matches brand colors used elsewhere). */
  accent: string;
  /** If the stat is a problem (e.g. 0% complete), show a warning style. */
  warn?: boolean;
}

export default function QuickStats({ activeRoles, linkedRecords, unreadMessages, profileCompletenessPct }: Props) {
  // Compose the four tiles. Each link target is a real /dashboard/* route.
  const tiles: Tile[] = [
    {
      label: 'Active roles',
      value: activeRoles,
      href: '/dashboard/roles',
      icon: '🎭',
      accent: '#FFB81C',
    },
    {
      label: 'Linked records',
      value: linkedRecords,
      href: '/dashboard/roles',
      icon: '🔗',
      accent: '#14B8A6',
    },
    {
      label: 'Unread',
      value: unreadMessages,
      href: '/dashboard/messages',
      icon: '✉️',
      accent: unreadMessages > 0 ? '#F87171' : 'rgba(255,255,255,0.4)',
      // No "warn" — a muted style is enough; the count itself is the signal.
    },
    {
      label: 'Profile complete',
      // Show as a percentage string for the last tile (different shape than int counts).
      value: `${profileCompletenessPct}%`,
      href: '/dashboard/profile',
      icon: '👤',
      accent: profileCompletenessPct === 100 ? '#34D399' : '#60A5FA',
      warn: profileCompletenessPct < 50,
    },
  ];

  return (
    <div
      aria-label="Dashboard quick stats"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '0.5rem',
      }}
    >
      {tiles.map((t) => {
        const isLowAttention = t.label === 'Unread' && Number(t.value) === 0;
        return (
          <Link
            key={t.label + t.href}
            href={t.href}
            aria-label={`${t.label}: ${t.value}. Open ${t.href.replace('/dashboard/', '')}.`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              background: '#0f0f0f',
              border: '1px solid #1e1e1e',
              borderRadius: 10,
              textDecoration: 'none',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontSize: '1.25rem',
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {t.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  color: isLowAttention ? 'rgba(255,255,255,0.45)' : t.accent,
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                {t.value}
              </p>
              <p
                style={{
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: '0.7rem',
                  margin: '0.15rem 0 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                }}
              >
                {t.label}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}