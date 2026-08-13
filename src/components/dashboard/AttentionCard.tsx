// src/components/dashboard/AttentionCard.tsx
// WS14 PR4 — "What needs my attention?" widget.
//
// Aggregates pending action items across surfaces and renders a single
// command-center card at the top of /dashboard. Rows appear only when
// there is something actionable (count > 0 or critical state). If all
// surfaces are clean, the card shows a small "All caught up" message
// instead of zeroed rows.
//
// Pattern mirrors InboxCard.tsx (the existing dashboard inbox widget)
// for visual consistency.

import Link from 'next/link';
import type { AttentionSummary, AttentionRow } from '@/lib/dashboard/attentionData';

const TONE_STYLES: Record<AttentionRow['tone'], { bg: string; color: string; border: string }> = {
  red: { bg: '#C8102E', color: '#fff', border: 'transparent' },
  amber: { bg: '#FFB81C', color: '#0a0a0a', border: 'transparent' },
  green: { bg: '#10B981', color: '#fff', border: 'transparent' },
  neutral: { bg: 'rgba(255,255,255,0.08)', color: '#fff', border: 'rgba(255,255,255,0.15)' },
};

export default function AttentionCard({ data }: { data: AttentionSummary }) {
  const { rows, allClear } = data;

  return (
    <div
      data-testid="attention-card"
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
          marginBottom: rows.length > 0 ? '1rem' : 0,
        }}
      >
        <h3
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.15rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          WHAT NEEDS YOUR ATTENTION
        </h3>
        {allClear ? (
          <span
            style={{
              color: '#10B981',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            ✓ All caught up
          </span>
        ) : (
          <span
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.8rem',
            }}
          >
            {rows.length} {rows.length === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {allClear ? (
        <p
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: '0.85rem',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          No notifications, claims, or documents need you right now. We'll
          surface anything actionable here as it comes up.
        </p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {rows.map((row) => (
            <li key={row.key}>
              <Link
                href={row.href}
                className="attention-row-link"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: '#fff',
                  transition: 'background 0.15s, border-color 0.15s',
                  minHeight: 44,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ fontSize: '1.25rem', lineHeight: 1, flex: '0 0 auto' }}
                >
                  {row.icon}
                </span>
                <span
                  style={{
                    flex: '1 1 auto',
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    {row.label}
                  </span>
                  {row.detail ? (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.55)',
                      }}
                    >
                      {row.detail}
                    </span>
                  ) : null}
                </span>
                {row.count !== null ? (
                  <span
                    style={{
                      flex: '0 0 auto',
                      minWidth: 28,
                      height: 28,
                      padding: '0 0.65rem',
                      borderRadius: 999,
                      background: TONE_STYLES[row.tone].bg,
                      color: TONE_STYLES[row.tone].color,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {row.count > 99 ? '99+' : row.count}
                  </span>
                ) : (
                  <span
                    style={{
                      flex: '0 0 auto',
                      padding: '0.25rem 0.6rem',
                      borderRadius: 999,
                      background: TONE_STYLES[row.tone].bg,
                      color: TONE_STYLES[row.tone].color,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Action
                  </span>
                )}
                <span
                  aria-hidden="true"
                  style={{
                    flex: '0 0 auto',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.9rem',
                  }}
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
