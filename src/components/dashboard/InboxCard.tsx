import Link from 'next/link';
import type { InboxSummary } from './dashboardInboxData';

/**
 * Dashboard overview inbox card.
 *
 * Renders one of three states:
 *  - no connections: empty state with discover CTAs
 *  - connections but no threads: "Start a conversation" CTA
 *  - threads: list of top 3 with unread badges
 *
 * Branded to match the navy/red/ice palette of the rest of the dashboard.
 */
export default function InboxCard({ data }: { data: InboxSummary }) {
  const { connectionCount, threadCount, totalUnread, recent } = data;
  const hasThreads = threadCount > 0;
  const hasConnections = connectionCount > 0;

  return (
    <div
      data-testid="inbox-card"
      style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Red accent stripe — matches the dashboard header */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #C8102E 0%, #041E42 100%)',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h3
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.15rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            INBOX
          </h3>
          {totalUnread > 0 ? (
            <span
              style={{
                background: '#C8102E',
                color: '#fff',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {totalUnread} new
            </span>
          ) : null}
        </div>
        <Link
          href="/dashboard/messages"
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.8rem',
            textDecoration: 'none',
          }}
        >
          Open messages →
        </Link>
      </div>

      {!hasConnections ? (
        <EmptyState
          title="No connections yet"
          message="Find players, coaches, or teams and connect. Your messages will show up here."
          ctas={[
            { href: '/directory/players', label: 'Browse players', icon: '🏒' },
            { href: '/directory/teams', label: 'Browse teams', icon: '🛡️' },
            { href: '/directory/coaches', label: 'Find coaches', icon: '🥅' },
          ]}
        />
      ) : !hasThreads ? (
        <EmptyState
          title={`${connectionCount} connection${connectionCount === 1 ? '' : 's'}, no conversations`}
          message="You have connections waiting to hear from you. Send the first message."
          ctas={[
            { href: '/dashboard/connections', label: 'Open connections', icon: '🤝' },
          ]}
        />
      ) : (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {recent.map((t) => {
            const name = t.otherUser.displayName || t.otherUser.username || 'RinkStop member';
            const initial = (name[0] || '?').toUpperCase();
            const profileHref = t.otherUser.username
              ? `/profile/${t.otherUser.username}`
              : `/dashboard/connections`;
            return (
              <li key={t.id}>
                <Link
                  href={`/dashboard/messages/${t.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0.625rem 0.75rem',
                    background: t.unreadCount > 0 ? 'rgba(200,16,46,0.06)' : 'rgba(255,255,255,0.02)',
                    border: t.unreadCount > 0 ? '1px solid rgba(200,16,46,0.3)' : '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 8,
                    textDecoration: 'none',
                    color: '#fff',
                  }}
                >
                  {t.otherUser.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.otherUser.avatarUrl}
                      alt=""
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        flexShrink: 0,
                        border: '2px solid #041E42',
                      }}
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #C8102E 0%, #8b0a1e 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontFamily: "'Bebas Neue', Impact, sans-serif",
                        fontSize: '0.95rem',
                        flexShrink: 0,
                      }}
                    >
                      {initial}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: t.unreadCount > 0 ? 700 : 500,
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 200,
                        }}
                      >
                        {name}
                      </span>
                      {t.unreadCount > 0 ? (
                        <span
                          aria-label={`${t.unreadCount} unread`}
                          style={{
                            background: '#C8102E',
                            color: '#fff',
                            borderRadius: 999,
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '0.05rem 0.4rem',
                            minWidth: 16,
                            textAlign: 'center',
                            lineHeight: 1.4,
                          }}
                        >
                          {t.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <p
                      style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '0.8rem',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.lastMessagePreview || <em style={{ opacity: 0.5 }}>No messages yet</em>}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyState({
  title,
  message,
  ctas,
}: {
  title: string;
  message: string;
  ctas: { href: string; label: string; icon: string }[];
}) {
  return (
    <div>
      <p
        style={{
          color: '#fff',
          fontSize: '0.95rem',
          fontWeight: 600,
          margin: '0 0 0.375rem',
        }}
      >
        {title}
      </p>
      <p
        style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: '0.85rem',
          margin: '0 0 1rem',
          lineHeight: 1.45,
        }}
      >
        {message}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {ctas.map((c) => (
          <Link
            key={c.href + c.label}
            href={c.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.5rem 0.85rem',
              background: 'transparent',
              border: '1px solid #C8102E',
              color: '#fff',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span aria-hidden="true">{c.icon}</span>
            <span>{c.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
