/**
 * src/components/passport/PassportTimeline.tsx
 *
 * Read-only Timeline Preview (Phase 2D).
 *
 * Workstream 2 rule: read-only, no editing, no deletion, no creation UI.
 * Only consumes events already in passport_events.
 *
 * If no events exist, renders a placeholder state per spec.
 */

import type { PassportEvent, PassportEventType } from '@/lib/passport/types';

interface PassportTimelineProps {
  events: PassportEvent[];
}

const EVENT_META: Record<PassportEventType, { icon: string; title: string }> = {
  PASSPORT_ISSUED: { icon: '📘', title: 'Passport issued' },
  PASSPORT_ACTIVATED: { icon: '✅', title: 'Passport activated' },
  VERIFICATION_LEVEL_CHANGED: { icon: '🛡️', title: 'Verification updated' },
  PASSPORT_SUSPENDED: { icon: '⏸️', title: 'Passport suspended' },
  PASSPORT_DEACTIVATED: { icon: '🗄️', title: 'Passport deactivated' },
  PASSPORT_LINK_ADDED: { icon: '🔗', title: 'Entity linked' },
  PASSPORT_LINK_REMOVED: { icon: '⛓️‍💥', title: 'Entity unlinked' },
};

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function PassportTimeline({ events }: PassportTimelineProps) {
  const wrapperStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '1.25rem 1.5rem',
    color: '#fff',
  };

  const headerStyle: React.CSSProperties = {
    fontFamily: "'Bebas Neue', Impact, sans-serif",
    fontSize: '0.875rem',
    letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.7)',
    margin: '0 0 1rem',
  };

  if (events.length === 0) {
    return (
      <section aria-label="Passport Timeline" style={wrapperStyle}>
        <h3 style={headerStyle}>TIMELINE</h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>
          No events yet. Timeline entries will appear here as your Passport evolves.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Passport Timeline" style={wrapperStyle}>
      <h3 style={headerStyle}>TIMELINE</h3>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
        {events.map((evt) => {
          const meta = EVENT_META[evt.eventType] ?? { icon: '•', title: evt.eventType };
          return (
            <li
              key={evt.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr auto',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.75rem',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '1rem' }}>{meta.icon}</span>
              <div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#fff' }}>{meta.title}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                  {formatEventDate(evt.createdAt)}
                </p>
              </div>
              <span
                aria-label="Private event"
                title="Private — visible only to you"
                style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}
              >
                🔒
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}