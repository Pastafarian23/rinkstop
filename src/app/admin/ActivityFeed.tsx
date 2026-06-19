import Link from 'next/link';
import styles from './admin.module.css';

export interface ActivityEvent {
  id: string;
  occurred_at: string; // ISO
  type:
    | 'webhook_received'
    | 'webhook_failed'
    | 'team_created'
    | 'news_published'
    | 'schedule_published'
    | 'result_added'
    | 'invite_created'
    | 'invite_redeemed';
  icon: string;
  title: string;
  detail: string;
  href?: string;
  tone: 'info' | 'success' | 'warn' | 'danger' | 'muted';
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function toneStyle(tone: ActivityEvent['tone']): { color: string; bg: string } {
  switch (tone) {
    case 'success':
      return { color: '#34D399', bg: 'rgba(52,211,153,0.12)' };
    case 'warn':
      return { color: '#FFB81C', bg: 'rgba(255,184,28,0.12)' };
    case 'danger':
      return { color: '#F87171', bg: 'rgba(248,113,113,0.12)' };
    case 'info':
      return { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' };
    case 'muted':
    default:
      return { color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.05)' };
  }
}

export default function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <span aria-hidden="true">📡</span> Recent Activity
          </h2>
          <span className={styles.cardHint}>No activity in the last 30 days</span>
        </div>
        <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }} aria-hidden="true">📭</div>
          <p style={{ margin: 0 }}>
            Activity will appear here as soon as something happens — new user teams, published posts,
            webhook events, or invite redemptions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>
          <span aria-hidden="true">📡</span> Recent Activity
        </h2>
        <span className={styles.cardHint}>Last {events.length} events (30d window)</span>
      </div>
      <ul
        aria-label="Recent admin activity"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          maxHeight: 480,
          overflowY: 'auto',
        }}
      >
        {events.map((ev, idx) => {
          const tone = toneStyle(ev.tone);
          return (
            <li
              key={`${ev.type}-${ev.id}-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.75rem 1.25rem',
                borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: tone.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.95rem',
                  flexShrink: 0,
                }}
              >
                {ev.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {ev.href ? (
                    <Link
                      href={ev.href}
                      style={{
                        color: '#fff',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      {ev.title}
                    </Link>
                  ) : (
                    <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600 }}>
                      {ev.title}
                    </span>
                  )}
                  <span
                    style={{
                      color: tone.color,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {ev.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div
                  style={{
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: '0.8rem',
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  {ev.detail}
                </div>
              </div>
              <time
                dateTime={ev.occurred_at}
                title={new Date(ev.occurred_at).toLocaleString('en-US')}
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {relTime(ev.occurred_at)}
              </time>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
