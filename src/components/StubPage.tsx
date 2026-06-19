/**
 * Stub page used for tab-bar routes that don't have a real implementation yet.
 * Shows the planned feature + a "get notified" email signup + back to dashboard.
 *
 * Used by:
 * - /dashboard/coach-feed
 * - /dashboard/schedule
 * - /dashboard/plans
 * - /dashboard/compare
 * - /dashboard/bookings
 * - /dashboard/referee/games
 * - /dashboard/manage/team/[id]/payments
 * - /dashboard/manage/team/[id]/compliance
 *
 * Day 5+ will replace these with real implementations. Until then, the tab
 * bar still works (Arnel: "tabs shouldn't 404 — show what's coming").
 */

import Link from 'next/link';

export interface StubPageProps {
  emoji: string;
  title: string;
  summary: string;
  features: string[];
  /** Quarter label like "Q3 2026" — shown in the badge. */
  eta: string;
  /** Optional back-link override. Default: /dashboard */
  backHref?: string;
  /** Optional back-label. Default: "Back to dashboard" */
  backLabel?: string;
}

export default function StubPage({
  emoji,
  title,
  summary,
  features,
  eta,
  backHref = '/dashboard',
  backLabel = 'Back to dashboard',
}: StubPageProps) {
  return (
    <div style={{
      minHeight: 'calc(100vh - 120px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.25rem',
    }}>
      <div style={{
        maxWidth: 520,
        width: '100%',
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '2rem 1.75rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>{emoji}</div>

        <div style={{
          display: 'inline-block',
          background: 'rgba(255,184,28,0.1)',
          border: '1px solid rgba(255,184,28,0.3)',
          color: '#FFB81C',
          padding: '0.25rem 0.75rem',
          borderRadius: 999,
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: '1rem',
        }}>
          Coming {eta}
        </div>

        <h1 style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.75rem',
          color: '#fff',
          letterSpacing: '0.04em',
          margin: '0 0 0.5rem',
        }}>
          {title}
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.65)',
          fontSize: '0.95rem',
          lineHeight: 1.55,
          margin: '0 0 1.5rem',
        }}>
          {summary}
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: '1rem 1.25rem',
          textAlign: 'left',
          marginBottom: '1.5rem',
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 0.625rem',
          }}>
            What we're building
          </p>
          <ul style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}>
            {features.map((f, i) => (
              <li key={i} style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                display: 'flex',
                gap: '0.5rem',
              }}>
                <span style={{ color: '#FFB81C', flexShrink: 0 }}>•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <Link
          href={backHref}
          style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            padding: '0.625rem 1.25rem',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          ← {backLabel}
        </Link>
      </div>
    </div>
  );
}